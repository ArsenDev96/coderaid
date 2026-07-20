/**
 * Stage prerequisites.
 *
 * Every mission stage route is statically generated, so any of them can be
 * opened directly from the address bar. That is fine for reading, but not for
 * *earning*: walking straight into /results would credit a run the player never
 * actually worked, and the score, XP and skill gains would all be about nothing.
 *
 * This is consistency protection, not security — there is no server to enforce
 * anything against. It answers one question: does the state this stage builds on
 * actually exist yet? A completed mission is always open, so reviewing and
 * replaying a finished incident keep working.
 */

import type { MissionStage } from "./missions";

/** Stages that have a prerequisite. Briefing and Investigation never do. */
export type GuardedStage = "Diagnosis" | "Fix" | "Verification" | "Complete";

/**
 * Everything the guard is allowed to look at, read from the mission's own saved
 * stage state. Plain data so the rule stays pure and testable.
 */
export type StageProgress = {
  /** Key clues collected in the investigation. */
  keyCluesCollected: number;
  /** Key clues the investigation requires before the diagnosis unlocks. */
  keyCluesRequired: number;
  /** The player confirmed a root cause with enough supporting evidence. */
  diagnosisConfirmed: boolean;
  /** The player applied a fix. */
  fixApplied: boolean;
  /** The verification run completed. */
  verificationCompleted: boolean;
  /** The mission is already in the progression ledger. */
  missionCompleted: boolean;
};

export const EMPTY_STAGE_PROGRESS: StageProgress = {
  keyCluesCollected: 0,
  keyCluesRequired: 0,
  diagnosisConfirmed: false,
  fixApplied: false,
  verificationCompleted: false,
  missionCompleted: false,
};

export type StageAccess =
  | { allowed: true }
  | {
      allowed: false;
      /** What is missing, in the player's terms. */
      reason: string;
      /** The stage that produces it. */
      backStage: MissionStage;
      backPath: "investigation" | "diagnosis" | "fix" | "verification";
      backLabel: string;
    };

const ALLOWED: StageAccess = { allowed: true };

/**
 * Whether a stage may be entered. Each stage requires only the step immediately
 * before it: the flow is linear, so "you confirmed a diagnosis" already implies
 * an investigation happened, and chaining every condition would only produce a
 * less useful message.
 */
export function stageAccess(
  stage: GuardedStage,
  progress: StageProgress = EMPTY_STAGE_PROGRESS,
): StageAccess {
  // A finished incident is open for review and replay at any stage.
  if (progress.missionCompleted) return ALLOWED;

  switch (stage) {
    case "Diagnosis": {
      const needed = Math.max(
        0,
        progress.keyCluesRequired - progress.keyCluesCollected,
      );
      if (needed === 0) return ALLOWED;
      return {
        allowed: false,
        reason: `Collect ${needed} more key ${needed === 1 ? "clue" : "clues"} in the investigation before diagnosing this incident.`,
        backStage: "Investigation",
        backPath: "investigation",
        backLabel: "Back to Investigation",
      };
    }
    case "Fix":
      if (progress.diagnosisConfirmed) return ALLOWED;
      return {
        allowed: false,
        reason:
          "Confirm a root cause on the diagnosis step before choosing a fix.",
        backStage: "Diagnosis",
        backPath: "diagnosis",
        backLabel: "Back to Diagnosis",
      };
    case "Verification":
      if (progress.fixApplied) return ALLOWED;
      return {
        allowed: false,
        reason: "Apply a fix before verifying whether it worked.",
        backStage: "Fix",
        backPath: "fix",
        backLabel: "Back to Fix",
      };
    case "Complete":
      if (progress.verificationCompleted) return ALLOWED;
      return {
        allowed: false,
        reason:
          "Run verification before collecting your results — the outcome is measured there.",
        backStage: "Verification",
        backPath: "verification",
        backLabel: "Back to Verification",
      };
  }
}
