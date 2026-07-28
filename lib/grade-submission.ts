import type { MissionGrade } from "./grading";
import { coerceLedger, NO_CREDIT, type Ledger, type RunCredit } from "./progress";
import type { RunTelemetry } from "./run";

/**
 * The client half of grading: submit what the player chose, receive the grade
 * the server computed.
 *
 * Nothing here decides anything. The browser no longer knows which root cause
 * or fix is correct, so this module can only ask — which is the entire point of
 * moving the answers behind `lib/server/answers.ts`.
 *
 * The grade is cached under `coderaid:{missionId}:grade` so the results screen
 * renders the same verdict verification just showed, without a second round
 * trip or a second run row.
 */

export type SubmitResult =
  | {
      status: "graded";
      grade: MissionGrade;
      /**
       * The player's ledger as the server now has it, and what this run added
       * to it. Both are absent only if the ledger read failed *after* the run
       * was safely recorded — the grade is still real, so the run is not lost.
       */
      ledger: Ledger | null;
      credit: RunCredit;
    }
  | { status: "unauthenticated" }
  | { status: "failed" };

export type RunSubmissionBody = {
  missionId: string;
  rootCauseId: string | null;
  evidenceIds: string[];
  fixId: string | null;
  fixApplied: boolean;
  telemetry: RunTelemetry;
  /** The player's local calendar date — the unit the streak counts in. */
  completedOn: string;
};

export async function submitRun(body: RunSubmissionBody): Promise<SubmitResult> {
  let response: Response;
  try {
    response = await fetch("/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { status: "failed" };
  }

  if (response.status === 401) return { status: "unauthenticated" };
  if (!response.ok) return { status: "failed" };

  try {
    const { grade, ledger, credit } = (await response.json()) as {
      grade: MissionGrade;
      ledger?: unknown;
      credit?: RunCredit;
    };
    if (!grade) return { status: "failed" };
    return {
      status: "graded",
      grade,
      ledger: ledger ? coerceLedger(ledger) : null,
      credit: credit ?? NO_CREDIT,
    };
  } catch {
    return { status: "failed" };
  }
}

/* --------------------------- Answers fingerprint ------------------------- */

/**
 * The answers a grade was produced from.
 *
 * A grade is only ever true of the diagnosis and fix it was computed against.
 * The player can go back and change either — that is the whole point of the
 * flow being replayable — and the moment they do, a cached grade describes a
 * run that no longer exists. Stamping the cache with the answers behind it is
 * what lets a screen prove the verdict it is about to render still belongs to
 * the player's current choices.
 */
export type GradedAnswers = {
  rootCauseId: string | null;
  /** Sorted: re-picking the same evidence in a different order is not a change. */
  evidenceIds: string[];
  fixId: string | null;
  fixApplied: boolean;
};

export const NO_ANSWERS: GradedAnswers = {
  rootCauseId: null,
  evidenceIds: [],
  fixId: null,
  fixApplied: false,
};

/**
 * The mission's saved diagnosis and fix, as a comparable fingerprint.
 *
 * Deliberately reads the two keys directly rather than going through
 * `loadDiagnosisState` / `loadFixState`. Both sides of the comparison — the
 * copy stamped onto the grade and the copy read back later — have to be
 * produced the same way for the comparison to mean anything, and going through
 * the loaders would pull two large mission-content modules into every route
 * that renders a grade, to obtain two key strings.
 */
export function storedAnswers(missionId: string): GradedAnswers {
  if (typeof window === "undefined") return NO_ANSWERS;
  const diagnosis = readStored<{
    rootCauseId: unknown;
    evidenceIds: unknown;
  }>(`coderaid:${missionId}:diagnosis`);
  const fix = readStored<{ fixId: unknown; applied: unknown }>(
    `coderaid:${missionId}:fix`,
  );

  return {
    rootCauseId:
      typeof diagnosis?.rootCauseId === "string" ? diagnosis.rootCauseId : null,
    evidenceIds: Array.isArray(diagnosis?.evidenceIds)
      ? [...new Set(diagnosis.evidenceIds.filter((id): id is string => typeof id === "string"))].sort()
      : [],
    fixId: typeof fix?.fixId === "string" ? fix.fixId : null,
    fixApplied: fix?.applied === true,
  };
}

export function sameAnswers(a: GradedAnswers, b: GradedAnswers): boolean {
  return (
    a.rootCauseId === b.rootCauseId &&
    a.fixId === b.fixId &&
    a.fixApplied === b.fixApplied &&
    a.evidenceIds.length === b.evidenceIds.length &&
    a.evidenceIds.every((id, i) => id === b.evidenceIds[i])
  );
}

function readStored<T>(key: string): Partial<T> | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Partial<T>) : null;
  } catch {
    return null;
  }
}

/* ------------------------------ Grade cache ------------------------------ */

export function gradeStorageKey(missionId: string): string {
  return `coderaid:${missionId}:grade`;
}

/**
 * Caches the grade **with the answers it describes**, so it can be discarded
 * rather than trusted once those answers change.
 */
export function saveGrade(
  missionId: string,
  grade: MissionGrade,
  answers: GradedAnswers,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      gradeStorageKey(missionId),
      JSON.stringify({ grade, answers }),
    );
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

/** Drops the cached verdict and what it earned. Safe to call when neither exists. */
export function clearGradedRun(missionId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(gradeStorageKey(missionId));
    window.localStorage.removeItem(creditStorageKey(missionId));
  } catch {
    /* ignore privacy-mode errors */
  }
}

/**
 * What the run added, cached for the results screen.
 *
 * The server measured it by diffing the ledger around the insert, so a replay
 * that didn't beat the previous attempt caches a genuine zero. Kept beside the
 * grade because both describe the same run and both are read one navigation
 * later.
 */
export function creditStorageKey(missionId: string): string {
  return `coderaid:${missionId}:credit`;
}

export function saveCredit(missionId: string, credit: RunCredit): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      creditStorageKey(missionId),
      JSON.stringify(credit),
    );
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

export function loadCredit(missionId: string): RunCredit | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(creditStorageKey(missionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RunCredit;
    if (
      typeof parsed?.xpAdded !== "number" ||
      typeof parsed?.skillXpAdded !== "object" ||
      parsed.skillXpAdded === null
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * The cached grade — **only if it still describes the player's current
 * answers**. Otherwise null, which every caller already treats as "not graded
 * yet" and answers by sending the player back to run verification.
 *
 * This is the rule that keeps a stale verdict off the screen. Changing the fix
 * after a failed run and verifying again used to be able to redisplay the
 * previous unresolved report — the old metrics, the old failed checks, the old
 * verdict — because the cache was keyed by mission alone and a mission has
 * exactly one cache entry however many times it is replayed.
 *
 * A cache written before grades carried their answers is treated as stale for
 * the same reason: there is no way to prove what it describes, and asking the
 * player to run verification again costs one click, while trusting it costs
 * them the truth about their own run.
 *
 * Validated only as far as the fields the UI reads — a truncated or hand-edited
 * cache should render nothing rather than a half-built score.
 */
export function loadGrade(missionId: string): MissionGrade | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(gradeStorageKey(missionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { grade?: MissionGrade; answers?: GradedAnswers };
    const grade = parsed?.grade;
    const answers = parsed?.answers;
    if (
      typeof grade?.score !== "number" ||
      typeof grade?.resolved !== "boolean" ||
      !Array.isArray(grade?.breakdown) ||
      !answers ||
      !Array.isArray(answers.evidenceIds)
    ) {
      return null;
    }
    return sameAnswers(answers, storedAnswers(missionId)) ? grade : null;
  } catch {
    return null;
  }
}
