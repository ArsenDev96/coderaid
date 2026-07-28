import type { MissionGrade } from "./grading";
import {
  creditStorageKey,
  currentSubmission,
  gradeStorageKey,
  submissionMatches,
  type SubmissionRef,
} from "./mission-storage";
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

/* ------------------------------ Grade cache ------------------------------ */

export { gradeStorageKey, creditStorageKey };

/**
 * A cached grade, stored **with the submission that produced it**.
 *
 * The envelope is the point. A bare `MissionGrade` says what the server
 * decided but not what it decided *about*, so nothing could tell whether it
 * still described the player's current answers. It didn't: selecting a
 * different fix left the old grade in place, and verification restored it as a
 * finished run. Carrying the submission means a verdict can be checked against
 * what is selected now and discarded when it no longer matches.
 */
export type CachedGrade = SubmissionRef & { grade: MissionGrade };

export function saveGrade(
  missionId: string,
  grade: MissionGrade,
  submission: SubmissionRef,
): void {
  if (typeof window === "undefined") return;
  try {
    const cached: CachedGrade = { ...submission, missionId, grade };
    window.localStorage.setItem(gradeStorageKey(missionId), JSON.stringify(cached));
  } catch {
    /* ignore quota / privacy-mode errors */
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
 * The cached grade **for the answers the player currently has selected**, or
 * null.
 *
 * Two ways to get null beyond a missing cache, and both mean "run verification
 * again" rather than "show something approximate":
 *
 *   - the envelope is malformed, truncated or hand-edited;
 *   - it describes a *different* submission — a changed fix, root cause or
 *     evidence set. A grade belongs to the answers it graded, and there is no
 *     honest way to re-use one across a changed answer.
 *
 * A cache written before the envelope existed has no submission to check, so it
 * is discarded too. Re-running verification is cheap; showing a player the
 * verdict from a fix they abandoned is the bug this exists to prevent.
 */
export function loadGrade(missionId: string): MissionGrade | null {
  const cached = loadCachedGrade(missionId);
  if (!cached) return null;
  return submissionMatches(cached, currentSubmission(missionId))
    ? cached.grade
    : null;
}

/** The raw envelope, including the submission — for tests and diagnostics. */
export function loadCachedGrade(missionId: string): CachedGrade | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(gradeStorageKey(missionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedGrade>;
    const grade = parsed?.grade;
    if (
      typeof parsed?.missionId !== "string" ||
      !Array.isArray(parsed?.evidenceIds) ||
      typeof grade?.score !== "number" ||
      typeof grade?.resolved !== "boolean" ||
      !Array.isArray(grade?.breakdown)
    ) {
      return null;
    }
    return {
      missionId: parsed.missionId,
      rootCauseId:
        typeof parsed.rootCauseId === "string" ? parsed.rootCauseId : null,
      evidenceIds: parsed.evidenceIds.filter(
        (id): id is string => typeof id === "string",
      ),
      fixId: typeof parsed.fixId === "string" ? parsed.fixId : null,
      grade,
    };
  } catch {
    return null;
  }
}
