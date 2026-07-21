import type { MissionGrade } from "./grading";
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
  | { status: "graded"; grade: MissionGrade }
  | { status: "unauthenticated" }
  | { status: "failed" };

export type RunSubmissionBody = {
  missionId: string;
  rootCauseId: string | null;
  evidenceIds: string[];
  fixId: string | null;
  fixApplied: boolean;
  telemetry: RunTelemetry;
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
    const { grade } = (await response.json()) as { grade: MissionGrade };
    return grade ? { status: "graded", grade } : { status: "failed" };
  } catch {
    return { status: "failed" };
  }
}

/* ------------------------------ Grade cache ------------------------------ */

export function gradeStorageKey(missionId: string): string {
  return `coderaid:${missionId}:grade`;
}

export function saveGrade(missionId: string, grade: MissionGrade): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(gradeStorageKey(missionId), JSON.stringify(grade));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

/**
 * The cached grade, or null. Validated only as far as the fields the UI reads —
 * a truncated or hand-edited cache should render nothing rather than a
 * half-built score, and re-running verification will replace it.
 */
export function loadGrade(missionId: string): MissionGrade | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(gradeStorageKey(missionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MissionGrade;
    if (
      typeof parsed?.score !== "number" ||
      typeof parsed?.resolved !== "boolean" ||
      !Array.isArray(parsed?.breakdown)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
