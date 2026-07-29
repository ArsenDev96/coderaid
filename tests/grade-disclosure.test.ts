import { describe, expect, it } from "vitest";
import { disclosedGrade, improvesOnBest } from "@/lib/server/grade-disclosure";
import type { MissionGrade } from "@/lib/grading";
import { EMPTY_LEDGER, type Ledger, type MissionRecord } from "@/lib/progress";

/**
 * What the server is willing to say about a run it just graded (§12 item 19).
 *
 * The property under test is not "the response is smaller" — it is that the
 * fields naming **which component** of the answer was right never reach a caller
 * who did not improve on their own best. That is the difference between an
 * attacker searching three answers one at a time and searching their product.
 *
 * The negative assertions here are the whole point, so they check for the
 * absence of the *key*, not for a falsy value: `rootCauseCorrect: false` would
 * pass a truthiness check while telling the enumerator exactly what they asked.
 */

const MISSION = "event-loop-overload";

function grade(overrides: Partial<MissionGrade> = {}): MissionGrade {
  return {
    missionId: MISSION,
    score: 60,
    resolved: true,
    hintsUsed: 0,
    durationMs: 120_000,
    stepsCompleted: 6,
    totalSteps: 6,
    xpEarned: 48,
    detailed: true,
    rootCauseCorrect: true,
    fixCorrect: true,
    evidenceHits: 3,
    evidenceTotal: 4,
    evidenceMisses: 1,
    breakdown: [
      {
        id: "root-cause",
        label: "Root cause",
        points: 45,
        max: 45,
        correct: true,
        detail: "You identified the cause that actually explains the incident.",
      },
    ],
    ...overrides,
  };
}

function ledgerWith(score: number): Ledger {
  const record: MissionRecord = {
    missionId: MISSION,
    completedAt: "2026-07-01T00:00:00.000Z",
    completedOn: "2026-07-01",
    score,
    xpEarned: 80,
    durationMs: 100_000,
    hintsUsed: 0,
    resolved: true,
    attempts: 1,
  };
  return { ...EMPTY_LEDGER, missions: { [MISSION]: record } };
}

/** Every field that must never reach a non-improving caller. */
const SECRET_FIELDS = [
  "rootCauseCorrect",
  "fixCorrect",
  "evidenceHits",
  "evidenceTotal",
  "evidenceMisses",
  "breakdown",
] as const;

describe("improvesOnBest", () => {
  it("treats a first run as an improvement, because there is nothing to beat", () => {
    expect(improvesOnBest(grade({ score: 1 }), EMPTY_LEDGER)).toBe(true);
  });

  it("is true only when the score is strictly greater", () => {
    expect(improvesOnBest(grade({ score: 71 }), ledgerWith(70))).toBe(true);
    expect(improvesOnBest(grade({ score: 70 }), ledgerWith(70))).toBe(false);
    expect(improvesOnBest(grade({ score: 69 }), ledgerWith(70))).toBe(false);
  });

  it("does not treat a tie as an improvement", () => {
    // The case that matters: resubmitting your own best answer must not buy the
    // detail back. A tie earns nothing under best-run-wins either.
    expect(improvesOnBest(grade({ score: 100 }), ledgerWith(100))).toBe(false);
  });

  it("reads the record for this mission, not another one", () => {
    const other: Ledger = {
      ...EMPTY_LEDGER,
      missions: { "async-map-trap": ledgerWith(100).missions[MISSION]! },
    };
    expect(improvesOnBest(grade({ score: 5 }), other)).toBe(true);
  });
});

describe("disclosedGrade", () => {
  it("discloses everything on a first run", () => {
    const result = disclosedGrade(grade(), EMPTY_LEDGER);
    expect(result.detailed).toBe(true);
    for (const field of SECRET_FIELDS) {
      expect(result).toHaveProperty(field);
    }
  });

  it("discloses everything on a genuine improvement", () => {
    const result = disclosedGrade(grade({ score: 90 }), ledgerWith(70));
    expect(result.detailed).toBe(true);
    expect(result.breakdown).toHaveLength(1);
    expect(result.rootCauseCorrect).toBe(true);
  });

  it("withholds every component field when the run did not improve", () => {
    const result = disclosedGrade(grade({ score: 40 }), ledgerWith(70));

    expect(result.detailed).toBe(false);
    for (const field of SECRET_FIELDS) {
      // Absent, not falsy. `rootCauseCorrect: false` would still answer the
      // question an enumerator is asking.
      expect(
        Object.prototype.hasOwnProperty.call(result, field),
        `${field} reached a caller who did not improve on their best`,
      ).toBe(false);
    }
  });

  it("withholds on a tie", () => {
    const result = disclosedGrade(grade({ score: 70 }), ledgerWith(70));
    expect(result.detailed).toBe(false);
    expect(result).not.toHaveProperty("rootCauseCorrect");
  });

  it("still reports the score, the verdict and what was earned", () => {
    // The player is not being stonewalled. They learn what they scored, whether
    // the incident was resolved — the verification stage cannot render without
    // it — and how long they took.
    const result = disclosedGrade(grade({ score: 40 }), ledgerWith(70));

    expect(result.score).toBe(40);
    expect(result.resolved).toBe(true);
    expect(result.xpEarned).toBe(48);
    expect(result.durationMs).toBe(120_000);
    expect(result.missionId).toBe(MISSION);
  });

  it("does not mutate the grade it was given", () => {
    // The route inserts the run from the same object it responds with, so a
    // redaction that mutated in place would strip the fields the ledger and the
    // achievement sync read.
    const original = grade({ score: 40 });
    disclosedGrade(original, ledgerWith(70));

    expect(original.detailed).toBe(true);
    expect(original.rootCauseCorrect).toBe(true);
    expect(original.breakdown).toHaveLength(1);
  });
});
