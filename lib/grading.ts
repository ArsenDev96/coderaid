/**
 * The grading engine.
 *
 * Every mission already authors what the *right* answer is —
 * `correctRootCauseId`, `correctEvidenceIds`, `correctFixId` and each fix
 * option's `resolvesRootCause`. Until now nothing read them, so a wrong
 * diagnosis and a wrong fix produced the same passing result.
 *
 * This module reads them. It turns what the player actually chose, plus how
 * long they took and how many hints they opened, into a real score, a real XP
 * award and a real verdict on whether the incident was resolved. Everything
 * downstream — verification, results, the ledger, skills — hangs off this.
 */

import type { DiagnosisState, MissionDiagnosisConfig } from "./diagnosis";
import type { FixState, MissionFixConfig } from "./fix";
import { MISSION_FLOW, type Mission } from "./missions";
import type { RunReward } from "./progress";
import { elapsedMs, type RunTelemetry } from "./run";
import { SKILL_DEFS } from "./skills";

/* ------------------------------- Weights -------------------------------- */

/**
 * Score weights, summing to 100 before the hint penalty. Identifying the root
 * cause is the heart of the exercise, so it carries the most; the evidence
 * score rewards a defensible case rather than a lucky guess.
 */
export const SCORE_WEIGHTS = {
  rootCause: 45,
  evidence: 25,
  fix: 30,
} as const;

/** Each hint opened costs this much of the final score. */
export const HINT_PENALTY = 5;

/** Fraction of the mission's XP awarded to its primary skill, at a full score. */
const PRIMARY_SKILL_SHARE = 1;
/** Fraction awarded to each other skill the mission exercises. */
const SUPPORTING_SKILL_SHARE = 0.4;

/* -------------------------------- Types --------------------------------- */

export type ScoreBreakdownEntry = {
  id: "root-cause" | "evidence" | "fix" | "hints";
  label: string;
  /** Points contributed. Negative for penalties. */
  points: number;
  /** Points that were available. 0 for penalties. */
  max: number;
  detail: string;
  correct: boolean;
};

export type MissionGrade = {
  missionId: string;
  /** 0–100. */
  score: number;
  /** Whether the applied fix actually resolves the diagnosed root cause. */
  resolved: boolean;
  rootCauseCorrect: boolean;
  fixCorrect: boolean;
  /** Correctly cited evidence out of the evidence that supports the cause. */
  evidenceHits: number;
  evidenceTotal: number;
  /** Irrelevant evidence the player cited. Costs precision, not correctness. */
  evidenceMisses: number;
  hintsUsed: number;
  durationMs: number;
  stepsCompleted: number;
  totalSteps: number;
  xpEarned: number;
  breakdown: ScoreBreakdownEntry[];
};

export type GradeInput = {
  mission: Mission;
  diagnosis: { config: MissionDiagnosisConfig; state: DiagnosisState } | null;
  fix: { config: MissionFixConfig; state: FixState } | null;
  run: RunTelemetry | null;
};

/* ------------------------------- Grading -------------------------------- */

/**
 * Balanced F-score over the cited evidence: citing every supporting finding
 * scores full marks, padding the case with irrelevant findings costs marks,
 * and citing nothing relevant scores zero.
 *
 * `graded` is false when the mission has no diagnosis stage at all. That must
 * score zero rather than full marks — an abandoned run has not demonstrated
 * anything, and "nothing to check" is not the same as "checked and correct".
 */
function evidenceScore(selected: string[], correct: string[], graded: boolean) {
  const correctSet = new Set(correct);
  const chosen = new Set(selected);
  const hits = [...chosen].filter((id) => correctSet.has(id)).length;
  const misses = chosen.size - hits;

  if (!graded) return { fraction: 0, hits, misses };
  // The mission authors no supporting evidence: there is nothing to get wrong.
  if (correctSet.size === 0) return { fraction: 1, hits, misses };
  if (chosen.size === 0) return { fraction: 0, hits, misses };

  const precision = hits / chosen.size;
  const recall = hits / correctSet.size;
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { fraction: f1, hits, misses };
}

export function gradeMission({
  mission,
  diagnosis,
  fix,
  run,
}: GradeInput): MissionGrade {
  /* -- Root cause -- */
  const chosenCause = diagnosis?.state.rootCauseId ?? null;
  const rootCauseCorrect =
    Boolean(chosenCause) && chosenCause === diagnosis?.config.correctRootCauseId;
  const rootCausePoints = rootCauseCorrect ? SCORE_WEIGHTS.rootCause : 0;

  /* -- Evidence -- */
  const evidence = evidenceScore(
    diagnosis?.state.evidenceIds ?? [],
    diagnosis?.config.correctEvidenceIds ?? [],
    Boolean(diagnosis),
  );
  const evidencePoints = Math.round(SCORE_WEIGHTS.evidence * evidence.fraction);

  /* -- Fix -- */
  const chosenFix = fix?.config.options.find((o) => o.id === fix.state.fixId) ?? null;
  // `resolvesRootCause` is the authored truth; `correctFixId` names the same
  // option. Reading the flag keeps a mission with several viable fixes honest.
  const resolved = chosenFix?.resolvesRootCause === true && fix?.state.applied === true;
  const fixCorrect = chosenFix?.id === fix?.config.correctFixId && Boolean(chosenFix);
  const fixPoints = resolved ? SCORE_WEIGHTS.fix : 0;

  /* -- Hints -- */
  const hintsUsed = run?.hintsUsed.length ?? 0;
  const hintPenalty = hintsUsed * HINT_PENALTY;

  const raw = rootCausePoints + evidencePoints + fixPoints - hintPenalty;
  const score = Math.max(0, Math.min(100, raw));

  const stepsCompleted = run?.stagesCompleted.length ?? 0;
  const durationMs = run ? elapsedMs(run) : 0;
  const xpEarned = Math.round((mission.xp * score) / 100);

  const breakdown: ScoreBreakdownEntry[] = [
    {
      id: "root-cause",
      label: "Root cause",
      points: rootCausePoints,
      max: SCORE_WEIGHTS.rootCause,
      correct: rootCauseCorrect,
      detail: rootCauseCorrect
        ? "You identified the cause that actually explains the incident."
        : chosenCause
          ? "The cause you selected doesn't explain the evidence."
          : "No root cause was selected.",
    },
    {
      id: "evidence",
      label: "Supporting evidence",
      points: evidencePoints,
      max: SCORE_WEIGHTS.evidence,
      correct: evidence.fraction >= 0.99,
      detail: `${evidence.hits} of ${diagnosis?.config.correctEvidenceIds.length ?? 0} supporting findings cited${
        evidence.misses > 0
          ? `, ${evidence.misses} that don't support the cause`
          : ""
      }.`,
    },
    {
      id: "fix",
      label: "Fix applied",
      points: fixPoints,
      max: SCORE_WEIGHTS.fix,
      correct: resolved,
      detail: resolved
        ? "Your fix removes the cause rather than the symptom."
        : chosenFix
          ? "The fix you applied doesn't address the root cause."
          : "No fix was applied.",
    },
  ];

  if (hintsUsed > 0) {
    breakdown.push({
      id: "hints",
      label: hintsUsed === 1 ? "1 hint used" : `${hintsUsed} hints used`,
      points: -hintPenalty,
      max: 0,
      correct: false,
      detail: `−${HINT_PENALTY} points per hint opened.`,
    });
  }

  return {
    missionId: mission.id,
    score,
    resolved,
    rootCauseCorrect,
    fixCorrect,
    evidenceHits: evidence.hits,
    evidenceTotal: diagnosis?.config.correctEvidenceIds.length ?? 0,
    evidenceMisses: evidence.misses,
    hintsUsed,
    durationMs,
    stepsCompleted,
    totalSteps: MISSION_FLOW.length,
    xpEarned,
    breakdown,
  };
}

/* ---------------------------- Skill rewards ----------------------------- */

/**
 * The skills a mission exercises: its authored primary reward first, then
 * every skill in the taxonomy that lists the mission. Both are looked up by
 * stable id, so a renamed skill can never silently stop being credited.
 */
export function missionSkillIds(mission: Mission): {
  primary: string | null;
  supporting: string[];
} {
  const primary = mission.rewardSkillId ?? null;
  const supporting = SKILL_DEFS.filter(
    (s) => s.missionIds.includes(mission.id) && s.id !== primary,
  ).map((s) => s.id);
  return { primary, supporting };
}

/** Skill XP a graded run awards, keyed by stable skill id. */
export function skillRewardFor(
  mission: Mission,
  grade: MissionGrade,
): Record<string, number> {
  const { primary, supporting } = missionSkillIds(mission);
  const base = (mission.xp * grade.score) / 100;
  const reward: Record<string, number> = {};

  if (primary) reward[primary] = Math.round(base * PRIMARY_SKILL_SHARE);
  for (const id of supporting) {
    const amount = Math.round(base * SUPPORTING_SKILL_SHARE);
    if (amount > 0) reward[id] = amount;
  }
  return reward;
}

/** The graded run, in the shape the progression ledger credits. */
export function rewardFor(mission: Mission, grade: MissionGrade): RunReward {
  return {
    missionId: mission.id,
    score: grade.score,
    xp: grade.xpEarned,
    durationMs: grade.durationMs,
    hintsUsed: grade.hintsUsed,
    resolved: grade.resolved,
    skillXp: skillRewardFor(mission, grade),
  };
}

/* ------------------------------- Verdicts ------------------------------- */

export type Verdict = "resolved" | "unresolved";

export function verdict(grade: MissionGrade): Verdict {
  return grade.resolved ? "resolved" : "unresolved";
}

/** Grade banding used for the results headline and the score ring's colour. */
export function scoreBand(score: number): {
  label: string;
  tone: "emerald" | "electric" | "amber" | "rose";
} {
  if (score >= 90) return { label: "Excellent", tone: "emerald" };
  if (score >= 70) return { label: "Solid", tone: "electric" };
  if (score >= 40) return { label: "Needs work", tone: "amber" };
  return { label: "Incomplete", tone: "rose" };
}
