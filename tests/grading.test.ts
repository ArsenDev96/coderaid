import { describe, expect, it } from "vitest";
import type { DiagnosisState, MissionDiagnosisConfig } from "@/lib/diagnosis";
import type { FixState, MissionFixConfig } from "@/lib/fix";
import {
  HINT_PENALTY,
  SCORE_WEIGHTS,
  gradeMission,
  missionSkillIds,
  rewardFor,
  scoreBand,
  skillRewardFor,
  verdict,
} from "@/lib/grading";
import { getMission, type Mission } from "@/lib/missions";
import { emptyRun, type RunTelemetry } from "@/lib/run";

/* ------------------------------- Fixtures ------------------------------- */

const mission = getMission("event-loop-overload") as Mission;

const diagnosisConfig: MissionDiagnosisConfig = {
  missionId: "fixture",
  prompt: "What is the root cause?",
  minimumEvidenceRequired: 2,
  rootCauses: [
    { id: "right", title: "Right", description: "…", icon: "cpu" },
    { id: "wrong", title: "Wrong", description: "…", icon: "database" },
  ],
  evidence: [
    { id: "a", source: "metrics", title: "A", description: "…" },
    { id: "b", source: "trace", title: "B", description: "…" },
    { id: "c", source: "logs", title: "C", description: "…" },
    { id: "noise", source: "database", title: "Noise", description: "…" },
  ],
  hint: "…",
  correctRootCauseId: "right",
  correctEvidenceIds: ["a", "b", "c"],
};

const fixConfig: MissionFixConfig = {
  missionId: "fixture",
  confirmedRootCause: "…",
  prompt: "Choose the best fix",
  options: [
    {
      id: "good",
      title: "Good",
      description: "…",
      icon: "worker",
      resolvesRootCause: true,
      explanation: ["…"],
      codeExample: "…",
    },
    {
      id: "bad",
      title: "Bad",
      description: "…",
      icon: "pool",
      resolvesRootCause: false,
      explanation: ["…"],
      codeExample: "…",
    },
  ],
  hint: "…",
  correctFixId: "good",
};

type RunOptions = {
  rootCauseId?: string | null;
  evidenceIds?: string[];
  fixId?: string | null;
  applied?: boolean;
  hints?: string[];
  /** Omits the diagnosis or fix stage entirely — an abandoned run. */
  stages?: { diagnosis?: boolean; fix?: boolean; run?: boolean };
};

function grade(options: RunOptions = {}) {
  const {
    rootCauseId = "right",
    evidenceIds = ["a", "b", "c"],
    fixId = "good",
    applied = true,
    hints = [],
    stages = {},
  } = options;

  const diagnosisState: DiagnosisState = {
    rootCauseId,
    evidenceIds,
    confirmed: true,
  };
  const fixState: FixState = { fixId, applied };
  const run: RunTelemetry = {
    ...emptyRun(1_000),
    lastActiveAt: 61_000,
    stagesCompleted: ["Briefing", "Investigation", "Diagnosis"],
    hintsUsed: hints,
  };

  return gradeMission({
    mission,
    diagnosis:
      stages.diagnosis === false
        ? null
        : { config: diagnosisConfig, state: diagnosisState },
    fix: stages.fix === false ? null : { config: fixConfig, state: fixState },
    run: stages.run === false ? null : run,
  });
}

/* -------------------------------- Tests --------------------------------- */

describe("gradeMission", () => {
  it("awards a perfect score for a correct, hint-free run", () => {
    const result = grade();
    expect(result.score).toBe(100);
    expect(result.resolved).toBe(true);
    expect(result.rootCauseCorrect).toBe(true);
    expect(result.fixCorrect).toBe(true);
    expect(result.evidenceHits).toBe(3);
    expect(result.evidenceMisses).toBe(0);
    expect(result.hintsUsed).toBe(0);
  });

  it("withholds the root-cause weight for a wrong diagnosis", () => {
    const result = grade({ rootCauseId: "wrong" });
    expect(result.rootCauseCorrect).toBe(false);
    expect(result.score).toBe(100 - SCORE_WEIGHTS.rootCause);
  });

  it("scores partially correct evidence below full marks but above zero", () => {
    const result = grade({ evidenceIds: ["a"] });
    expect(result.evidenceHits).toBe(1);
    expect(result.evidenceMisses).toBe(0);
    expect(result.score).toBeGreaterThan(SCORE_WEIGHTS.rootCause + SCORE_WEIGHTS.fix);
    expect(result.score).toBeLessThan(100);
  });

  it("lowers the evidence score when irrelevant findings are cited", () => {
    const precise = grade({ evidenceIds: ["a", "b", "c"] });
    const padded = grade({ evidenceIds: ["a", "b", "c", "noise"] });
    expect(padded.evidenceMisses).toBe(1);
    expect(padded.score).toBeLessThan(precise.score);
  });

  it("still credits a resolving fix when the diagnosis was wrong", () => {
    const result = grade({ rootCauseId: "wrong" });
    expect(result.resolved).toBe(true);
    expect(result.breakdown.find((b) => b.id === "fix")?.points).toBe(
      SCORE_WEIGHTS.fix,
    );
  });

  it("does not resolve the incident when the wrong fix is applied", () => {
    const result = grade({ fixId: "bad" });
    expect(result.resolved).toBe(false);
    expect(result.score).toBe(100 - SCORE_WEIGHTS.fix);
    expect(verdict(result)).toBe("unresolved");
  });

  it("does not resolve the incident when a correct fix is never applied", () => {
    const result = grade({ applied: false });
    expect(result.resolved).toBe(false);
  });

  it("charges one hint penalty", () => {
    const result = grade({ hints: ["diagnosis"] });
    expect(result.hintsUsed).toBe(1);
    expect(result.score).toBe(100 - HINT_PENALTY);
    expect(result.breakdown.find((b) => b.id === "hints")?.points).toBe(
      -HINT_PENALTY,
    );
  });

  it("charges every distinct hint opened", () => {
    const result = grade({ hints: ["diagnosis", "fix"] });
    expect(result.hintsUsed).toBe(2);
    expect(result.score).toBe(100 - 2 * HINT_PENALTY);
  });

  it("scores an abandoned run at zero without throwing", () => {
    const result = grade({
      stages: { diagnosis: false, fix: false, run: false },
    });
    expect(result.score).toBe(0);
    expect(result.resolved).toBe(false);
    expect(result.xpEarned).toBe(0);
    expect(result.durationMs).toBe(0);
    expect(result.stepsCompleted).toBe(0);
  });

  it("treats a missing diagnosis stage as zero evidence, not full marks", () => {
    const result = grade({ stages: { diagnosis: false } });
    expect(result.evidenceHits).toBe(0);
    expect(result.score).toBe(SCORE_WEIGHTS.fix);
  });

  it("keeps the score inside 0–100 for every combination", () => {
    const combos: RunOptions[] = [
      {},
      { rootCauseId: null, evidenceIds: [], fixId: null, applied: false },
      { hints: ["a", "b", "c", "d", "e", "f", "g", "h"] },
      { rootCauseId: "wrong", evidenceIds: ["noise"], fixId: "bad" },
      { evidenceIds: ["noise"] },
      { stages: { diagnosis: false, fix: false } },
    ];
    for (const combo of combos) {
      const { score } = grade(combo);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it("derives XP from the mission's XP and the score", () => {
    expect(grade().xpEarned).toBe(mission.xp);
    expect(grade({ fixId: "bad" }).xpEarned).toBe(
      Math.round((mission.xp * (100 - SCORE_WEIGHTS.fix)) / 100),
    );
    expect(
      grade({ rootCauseId: null, evidenceIds: [], fixId: null, applied: false })
        .xpEarned,
    ).toBe(0);
  });

  it("reports the run's real duration and completed step count", () => {
    const result = grade();
    expect(result.durationMs).toBe(60_000);
    expect(result.stepsCompleted).toBe(3);
    expect(result.totalSteps).toBe(6);
  });
});

describe("scoreBand", () => {
  it("bands a score without ever leaving it unlabelled", () => {
    expect(scoreBand(100).label).toBe("Excellent");
    expect(scoreBand(70).label).toBe("Solid");
    expect(scoreBand(40).label).toBe("Needs work");
    expect(scoreBand(0).label).toBe("Incomplete");
  });
});

describe("skill rewards", () => {
  it("credits the mission's primary skill and every skill that lists it", () => {
    const { primary, supporting } = missionSkillIds(mission);
    expect(primary).toBe("event-loop");
    expect(supporting).toContain("nodejs-runtime");
    expect(supporting).not.toContain("event-loop");
  });

  it("gives the primary skill the full share and supporting skills less", () => {
    const reward = skillRewardFor(mission, grade());
    expect(reward["event-loop"]).toBe(mission.xp);
    for (const [id, xp] of Object.entries(reward)) {
      if (id === "event-loop") continue;
      expect(xp).toBeGreaterThan(0);
      expect(xp).toBeLessThan(reward["event-loop"]);
    }
  });

  it("awards no skill XP for a zero-score run", () => {
    const zero = grade({
      rootCauseId: null,
      evidenceIds: [],
      fixId: null,
      applied: false,
    });
    expect(Object.values(skillRewardFor(mission, zero))).toEqual([0]);
  });

  it("packages the graded run in the shape the ledger credits", () => {
    const result = grade();
    const reward = rewardFor(mission, result);
    expect(reward).toMatchObject({
      missionId: mission.id,
      score: result.score,
      xp: result.xpEarned,
      resolved: true,
      hintsUsed: 0,
    });
    expect(reward.skillXp["event-loop"]).toBeGreaterThan(0);
  });
});
