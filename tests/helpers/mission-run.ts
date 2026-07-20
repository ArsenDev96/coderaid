/**
 * Shared harness for playing a mission end to end in a Node test.
 *
 * These helpers drive the same functions the stage workspaces call, in the
 * order they call them, writing the same `localStorage` keys. No component is
 * rendered, but every rule that decides a score, an XP award, a verification
 * verdict or a next step is the one the app uses.
 *
 * Not a `*.test.ts` file, so Vitest imports it rather than collecting it.
 */

import { achievementSources, getAchievements, unlockedIds } from "@/lib/achievements";
import { getDiagnosis, saveDiagnosisState } from "@/lib/diagnosis";
import { getFix, saveFixState } from "@/lib/fix";
import { gradeMission, rewardFor, type MissionGrade } from "@/lib/grading";
import {
  getInvestigation,
  keyEvidence,
  saveInvestigationState,
} from "@/lib/investigation";
import { getMission, type Mission } from "@/lib/missions";
import { creditRun, saveLedger, stampAchievements, type Ledger } from "@/lib/progress";
import { saveResultsState } from "@/lib/results";
import { completeStage, loadRun, recordHint, touchRun } from "@/lib/run";
import { saveVerificationState } from "@/lib/verification";

/* ---------------------------- Storage harness --------------------------- */

/** Installs an in-memory `window.localStorage`. Call from `beforeEach`. */
export function installStorage() {
  const map = new Map<string, string>();
  const storage = {
    get length() {
      return map.size;
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  };
  (globalThis as Record<string, unknown>).window = {
    localStorage: storage,
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  return storage;
}

/** Removes the shim. Call from `afterEach`. */
export function uninstallStorage() {
  delete (globalThis as Record<string, unknown>).window;
}

function read<T>(missionId: string, stage: string): T | null {
  const raw = window.localStorage.getItem(`coderaid:${missionId}:${stage}`);
  return raw ? (JSON.parse(raw) as T) : null;
}

/* ------------------------------ Play helpers ---------------------------- */

export type Choices = {
  correctDiagnosis?: boolean;
  correctEvidence?: boolean;
  correctFix?: boolean;
  hints?: string[];
};

/**
 * Plays a mission through investigation, diagnosis, fix and verification.
 *
 * "Wrong" choices are derived from the mission's own config — the first root
 * cause that isn't the correct one, the evidence options that don't support it,
 * the first fix that doesn't resolve — so this works for any authored mission
 * without the test knowing its content.
 */
export function play(
  missionId: string,
  {
    correctDiagnosis = true,
    correctEvidence = true,
    correctFix = true,
    hints = [],
  }: Choices = {},
) {
  const investigation = getInvestigation(missionId)!;
  const diagnosis = getDiagnosis(missionId)!;
  const fix = getFix(missionId)!;

  touchRun(missionId);
  completeStage(missionId, "Briefing");

  // Investigation: collect exactly the key clues the mission requires.
  const keys = keyEvidence(investigation).slice(0, investigation.requiredKeyClues);
  saveInvestigationState(missionId, {
    activeTool: investigation.tools[0],
    collectedEvidenceIds: keys.map((e) => e.id),
  });
  completeStage(missionId, "Investigation");

  for (const hint of hints) recordHint(missionId, hint);

  const wrongCause = diagnosis.rootCauses.find(
    (c) => c.id !== diagnosis.correctRootCauseId,
  )!;
  const irrelevant = diagnosis.evidence.filter(
    (e) => !diagnosis.correctEvidenceIds.includes(e.id),
  );
  saveDiagnosisState(missionId, {
    rootCauseId: correctDiagnosis ? diagnosis.correctRootCauseId : wrongCause.id,
    evidenceIds: correctEvidence
      ? [...diagnosis.correctEvidenceIds]
      : irrelevant.map((e) => e.id),
    confirmed: true,
  });
  completeStage(missionId, "Diagnosis");

  const wrongFix = fix.options.find((o) => !o.resolvesRootCause)!;
  saveFixState(missionId, {
    fixId: correctFix ? fix.correctFixId : wrongFix.id,
    applied: true,
  });
  completeStage(missionId, "Fix");

  saveVerificationState(missionId, { run: true, completed: true });
  completeStage(missionId, "Verification");

  return { investigation, diagnosis, fix };
}

export type CollectedResults = {
  mission: Mission;
  grade: MissionGrade;
  credit: ReturnType<typeof creditRun>;
  ledger: Ledger;
  achievements: ReturnType<typeof getAchievements>;
};

/** What the results screen does on mount: grade, credit once, stamp, persist. */
export function collectResults(
  missionId: string,
  ledger: Ledger,
): CollectedResults {
  const mission = getMission(missionId) as Mission;
  const diagnosisConfig = getDiagnosis(missionId)!;
  const fixConfig = getFix(missionId)!;

  const grade = gradeMission({
    mission,
    diagnosis: {
      config: diagnosisConfig,
      state: read(missionId, "diagnosis")!,
    },
    fix: { config: fixConfig, state: read(missionId, "fix")! },
    run: loadRun(missionId),
  });

  completeStage(missionId, "Complete");
  const credit = creditRun(ledger, rewardFor(mission, grade));
  const achievements = getAchievements(achievementSources(credit.ledger));
  const stamped = stampAchievements(credit.ledger, unlockedIds(achievements));
  saveLedger(stamped);
  saveResultsState(missionId, { claimed: true, score: grade.score });

  return { mission, grade, credit, ledger: stamped, achievements };
}

/** The stage state `StageGate` reads, built the way it builds it. */
export function stageProgress(missionId: string, missionCompleted = false) {
  const investigation = getInvestigation(missionId)!;
  const keys = keyEvidence(investigation);
  const collected =
    read<{ collectedEvidenceIds: string[] }>(missionId, "investigation")
      ?.collectedEvidenceIds ?? [];

  return {
    keyCluesCollected: keys.filter((e) => collected.includes(e.id)).length,
    keyCluesRequired: Math.min(investigation.requiredKeyClues, keys.length),
    diagnosisConfirmed:
      read<{ confirmed: boolean }>(missionId, "diagnosis")?.confirmed === true,
    fixApplied: read<{ applied: boolean }>(missionId, "fix")?.applied === true,
    verificationCompleted:
      read<{ completed: boolean }>(missionId, "verification")?.completed === true,
    missionCompleted,
  };
}
