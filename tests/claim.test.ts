import { describe, expect, it } from "vitest";
import { PLAYABLE_MISSION_IDS } from "@/lib/availability";
import { getMission } from "@/lib/missions";
import { parseClaim, parseClaimDate } from "@/lib/server/claim";

/**
 * What a pre-account ledger may talk this server into recording.
 *
 * The claim is the one path where a score enters the database without having
 * been graded here, so the interesting assertions are all about what it
 * *cannot* do. Everything derivable is recomputed; only the score, the verdict
 * and roughly when are taken on trust.
 */

const MISSION = "event-loop-overload";

function claim(missions: Record<string, unknown>) {
  return parseClaim({ ledger: { version: 2, missions } });
}

function record(over: Record<string, unknown> = {}) {
  return {
    missionId: MISSION,
    completedAt: "2026-07-20T10:00:00.000Z",
    completedOn: "2026-07-20",
    score: 100,
    xpEarned: 80,
    durationMs: 60_000,
    hintsUsed: 0,
    resolved: true,
    attempts: 1,
    ...over,
  };
}

describe("parseClaim", () => {
  it("keeps a genuine run and re-derives its rewards", () => {
    const [run] = claim({ [MISSION]: record() });
    const mission = getMission(MISSION)!;

    expect(run.missionId).toBe(MISSION);
    expect(run.score).toBe(100);
    expect(run.resolved).toBe(true);
    expect(run.completedOn).toBe("2026-07-20");
    // Recomputed from the catalogue, not read off the submission.
    expect(run.xpEarned).toBe(mission.xp);
    expect(run.skillXp[mission.rewardSkillId!]).toBe(mission.xp);
  });

  /** The headline property: an inflated XP figure buys nothing. */
  it("ignores a submitted XP figure entirely", () => {
    const [run] = claim({ [MISSION]: record({ xpEarned: 999_999 }) });
    expect(run.xpEarned).toBe(getMission(MISSION)!.xp);
  });

  it("clamps a score outside 0–100", () => {
    const [high] = claim({ [MISSION]: record({ score: 5_000 }) });
    expect(high.score).toBe(100);
    expect(high.xpEarned).toBe(getMission(MISSION)!.xp);

    // A negative score clamps to 0, which is then dropped as not worth keeping.
    expect(claim({ [MISSION]: record({ score: -50 }) })).toEqual([]);
  });

  it("drops missions that don't exist or aren't playable", () => {
    expect(
      claim({
        "not-a-mission": record(),
        "payment-service-meltdown": record(), // catalogued but coming-soon
        __proto__: record(),
      }),
    ).toEqual([]);
  });

  it("keeps the good rows when one is unusable", () => {
    const good = PLAYABLE_MISSION_IDS[1];
    const runs = claim({
      "not-a-mission": record(),
      [good]: record({ missionId: good }),
    });
    expect(runs.map((r) => r.missionId)).toEqual([good]);
  });

  it("bounds duration and hints", () => {
    const [run] = claim({
      [MISSION]: record({ durationMs: 999_999_999_999, hintsUsed: 10_000 }),
    });
    expect(run.durationMs).toBe(24 * 60 * 60 * 1000);
    expect(run.hintsUsed).toBe(32);
  });

  it("treats anything that isn't a ledger as nothing to claim", () => {
    for (const bad of [null, undefined, 42, "ledger", [], {}, { ledger: {} }]) {
      expect(parseClaim(bad)).toEqual([]);
    }
  });

  it("refuses a claim large enough to be an attack rather than a history", () => {
    const missions: Record<string, unknown> = {};
    for (let i = 0; i < 500; i++) missions[`filler-${i}`] = record();
    missions[MISSION] = record();
    // Only real playable missions survive, so the ceiling never admits junk.
    expect(claim(missions).length).toBeLessThanOrEqual(PLAYABLE_MISSION_IDS.length);
  });
});

describe("parseClaimDate", () => {
  const now = new Date("2026-07-21T12:00:00.000Z");

  /**
   * Unlike a live submission, a claimed run really did happen in the past.
   * Flattening it to today would invent a streak nobody had.
   */
  it("keeps a genuine past date", () => {
    for (const day of ["2026-07-20", "2026-01-01", "2025-08-15"]) {
      expect(parseClaimDate(day, now)).toBe(day);
    }
  });

  it("refuses a date in the future", () => {
    expect(parseClaimDate("2027-01-01", now)).toBe("2026-07-21");
    expect(parseClaimDate("2026-07-30", now)).toBe("2026-07-21");
  });

  it("refuses a date older than the app", () => {
    expect(parseClaimDate("2001-01-01", now)).toBe("2026-07-21");
  });

  it("falls back for anything malformed", () => {
    for (const bad of [undefined, null, "", "yesterday", "2026-7-1", 20260721, {}]) {
      expect(parseClaimDate(bad, now)).toBe("2026-07-21");
    }
  });
});
