/**
 * Per-mission `localStorage` keys, and the rule for throwing a verdict away.
 *
 * Every key a mission stage writes is named here, in one place, because the
 * invalidation below has to clear a set of them atomically and a second copy of
 * a key string is a second source of truth that drifts.
 *
 * Deliberately free of imports. The stage modules (`lib/fix.ts`,
 * `lib/verification.ts`, `lib/results.ts`, `lib/diagnosis.ts`) are large — they
 * carry every mission's authored content — and the Fix route must be able to
 * invalidate the verification and results caches without pulling all of that
 * content into its bundle.
 */

const ns = (missionId: string, slot: string) => `coderaid:${missionId}:${slot}`;

export const investigationStorageKey = (missionId: string) => ns(missionId, "investigation");
export const diagnosisStorageKey = (missionId: string) => ns(missionId, "diagnosis");
export const fixStorageKey = (missionId: string) => ns(missionId, "fix");
export const verificationStorageKey = (missionId: string) => ns(missionId, "verification");
export const resultsStorageKey = (missionId: string) => ns(missionId, "results");
export const gradeStorageKey = (missionId: string) => ns(missionId, "grade");
export const creditStorageKey = (missionId: string) => ns(missionId, "credit");
export const runStorageKey = (missionId: string) => ns(missionId, "run");

/**
 * Every slot a mission writes, in stage order. `lib/investigation.ts` and
 * `lib/run.ts` re-export their own key from here rather than rebuilding the
 * string, so this list is exhaustive by construction: a stage that invents a
 * new slot has to name it here to have a key at all.
 */
const ALL_KEYS = [
  investigationStorageKey,
  diagnosisStorageKey,
  fixStorageKey,
  verificationStorageKey,
  resultsStorageKey,
  gradeStorageKey,
  creditStorageKey,
  runStorageKey,
] as const;

/* --------------------------- Raw state readers -------------------------- */

/**
 * The identity of a submission: which mission, and what the player had chosen
 * when it was graded.
 *
 * This is what a cached grade is checked against. It is read **raw**, without
 * the per-mission config, so that checking "does this verdict still describe
 * what is selected now?" costs nothing on a route that has no reason to load
 * the fix or diagnosis catalogues.
 */
export type SubmissionRef = {
  missionId: string;
  rootCauseId: string | null;
  evidenceIds: string[];
  fixId: string | null;
};

function readJson(key: string): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

/** What the player currently has selected, as a submission identity. */
export function currentSubmission(missionId: string): SubmissionRef {
  const diagnosis = readJson(diagnosisStorageKey(missionId));
  const fix = readJson(fixStorageKey(missionId));
  return {
    missionId,
    rootCauseId:
      typeof diagnosis?.rootCauseId === "string" ? diagnosis.rootCauseId : null,
    evidenceIds: asStringArray(diagnosis?.evidenceIds),
    fixId: typeof fix?.fixId === "string" ? fix.fixId : null,
  };
}

/**
 * Whether a cached verdict still describes what the player has selected.
 *
 * Evidence is compared as a **set**: re-ordering the same findings is not a
 * different answer, and the server grades it as a set too.
 */
export function submissionMatches(a: SubmissionRef, b: SubmissionRef): boolean {
  if (a.missionId !== b.missionId) return false;
  if (a.fixId !== b.fixId) return false;
  if (a.rootCauseId !== b.rootCauseId) return false;
  if (a.evidenceIds.length !== b.evidenceIds.length) return false;
  const left = [...a.evidenceIds].sort();
  const right = [...b.evidenceIds].sort();
  return left.every((id, i) => id === right[i]);
}

/* ------------------------------ Invalidation ---------------------------- */

function remove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore privacy-mode errors */
  }
}

/**
 * Throws away everything downstream of a changed answer.
 *
 * **This is the fix for the stale-verdict bug.** Selecting a different fix used
 * to write only `…:fix`, leaving `…:grade`, `…:credit`, `…:verification` and
 * `…:results` describing the *previous* fix. Verification restores "done" from
 * `…:verification` plus a cached grade, so a player who failed with the wrong
 * fix, went back, and applied the right one was shown the old unresolved
 * verdict — with Continue to Results already unlocked — and was never asked to
 * run verification again.
 *
 * What it deliberately does **not** touch:
 *
 *   - `…:fix` and `…:diagnosis` — the player's current answers, which is the
 *     thing that just changed;
 *   - `…:run` — run telemetry. The clock spans the whole mission, and changing
 *     a fix is part of the mission, not a restart;
 *   - the server's `mission_runs` rows. A wrong attempt is a real attempt and
 *     stays in Postgres; this is only about what the browser may re-display.
 *
 * There is no replay measurement to clear: it is React state in
 * `VerificationWorkspace` and is never persisted, precisely because a
 * measurement describes one execution on one machine.
 */
export function clearVerdict(missionId: string): void {
  remove(gradeStorageKey(missionId));
  remove(creditStorageKey(missionId));
  remove(verificationStorageKey(missionId));
  remove(resultsStorageKey(missionId));
}

/**
 * Everything from the investigation forward — what "Restart Investigation" is.
 *
 * Dropping the collected evidence without dropping what was built on top of it
 * would leave a confirmed diagnosis citing findings the player no longer holds,
 * and a cached grade describing a submission that no longer exists. So the
 * whole downstream chain goes with it.
 *
 * `…:run` is deliberately kept: the clock spans the mission, and re-reading the
 * logs is part of playing it, not a second attempt. Server-side runs are
 * untouched — nothing in the browser can delete an attempt that was recorded.
 */
export function clearInvestigationOnward(missionId: string): void {
  remove(investigationStorageKey(missionId));
  remove(diagnosisStorageKey(missionId));
  remove(fixStorageKey(missionId));
  clearVerdict(missionId);
}

/**
 * Every local slot this mission owns — what **replaying** is.
 *
 * A replay is a fresh attempt, so unlike `clearInvestigationOnward` this also
 * drops `…:run`: the new attempt is timed from zero and its stage and hint
 * counts start empty, rather than inheriting the elapsed time and the hints of
 * the run that just finished. Without this, "Run It Again" reopened the
 * briefing on top of the previous attempt's state — the investigation restored
 * its old selections, the diagnosis was still confirmed, and the grade the next
 * verification produced was computed against a clock that had been running
 * since the first attempt.
 *
 * The recorded runs in Postgres are untouched, which is the point: a replay
 * adds an attempt, it does not erase one.
 */
export function clearMissionWorkingState(missionId: string): void {
  for (const key of ALL_KEYS) remove(key(missionId));
}
