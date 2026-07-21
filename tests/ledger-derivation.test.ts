import { describe, expect, it } from "vitest";
import { EMPTY_LEDGER, coerceLedger, creditBetween, type Ledger } from "@/lib/progress";
import { parseLocalDate } from "@/lib/server/submission";

/**
 * The rules that replaced client-side crediting.
 *
 * Step D moved the ledger to the server, so `creditRun()` no longer runs in the
 * browser. What the results screen shows is now *measured* — the server diffs
 * the ledger around the insert — and these are the pure pieces that make that
 * measurement, plus the bound on the one value a client still supplies.
 */

function ledger(over: Partial<Ledger> = {}): Ledger {
  return { ...EMPTY_LEDGER, ...over };
}

function record(missionId: string, xpEarned: number, score = 100) {
  return {
    missionId,
    completedAt: "2026-07-21T10:00:00.000Z",
    completedOn: "2026-07-21",
    score,
    xpEarned,
    durationMs: 1000,
    hintsUsed: 0,
    resolved: true,
    attempts: 1,
  };
}

describe("creditBetween", () => {
  it("reports what a first completion added", () => {
    const before = EMPTY_LEDGER;
    const after = ledger({
      totalXp: 80,
      skillXp: { "event-loop": 80, "worker-threads": 32 },
      missions: { "event-loop-overload": record("event-loop-overload", 80) },
    });

    expect(creditBetween(before, after, "event-loop-overload")).toEqual({
      xpAdded: 80,
      skillXpAdded: { "event-loop": 80, "worker-threads": 32 },
      firstCompletion: true,
    });
  });

  it("credits only the difference when a replay beats the previous run", () => {
    const before = ledger({
      totalXp: 40,
      skillXp: { "event-loop": 40 },
      missions: { "event-loop-overload": record("event-loop-overload", 40, 50) },
    });
    const after = ledger({
      totalXp: 80,
      skillXp: { "event-loop": 80 },
      missions: { "event-loop-overload": record("event-loop-overload", 80) },
    });

    const credit = creditBetween(before, after, "event-loop-overload");
    expect(credit.xpAdded).toBe(40);
    expect(credit.skillXpAdded).toEqual({ "event-loop": 40 });
    // Already completed, so this is an improvement rather than a first clear.
    expect(credit.firstCompletion).toBe(false);
  });

  /**
   * The property that makes a refresh worthless: because the ledger derives
   * from the *best* run, a worse replay changes nothing, and the diff says so
   * without the client knowing the best-run rule at all.
   */
  it("credits nothing for a replay that didn't beat the previous run", () => {
    const settled = ledger({
      totalXp: 80,
      skillXp: { "event-loop": 80 },
      missions: { "event-loop-overload": record("event-loop-overload", 80) },
    });

    expect(creditBetween(settled, settled, "event-loop-overload")).toEqual({
      xpAdded: 0,
      skillXpAdded: {},
      firstCompletion: false,
    });
  });

  it("never reports a negative award", () => {
    const before = ledger({ totalXp: 100, skillXp: { "event-loop": 100 } });
    const after = ledger({ totalXp: 80, skillXp: { "event-loop": 80 } });

    const credit = creditBetween(before, after, "event-loop-overload");
    expect(credit.xpAdded).toBe(0);
    expect(credit.skillXpAdded).toEqual({});
  });
});

describe("parseLocalDate", () => {
  const now = new Date("2026-07-21T12:00:00.000Z");

  it("accepts the player's own date on either side of the server's", () => {
    for (const day of ["2026-07-20", "2026-07-21", "2026-07-22"]) {
      expect(parseLocalDate(day, now)).toBe(day);
    }
  });

  /**
   * The bound is the whole point: a timezone can move "today" by a day, so a
   * day either side is legitimate and anything further is not. A forged date
   * cannot backdate a streak — it falls back to the server's own.
   */
  it("discards a date no timezone could justify", () => {
    for (const forged of ["2026-07-01", "2026-08-30", "1999-01-01", "2030-01-01"]) {
      expect(parseLocalDate(forged, now)).toBe("2026-07-21");
    }
  });

  it("falls back to the server's date for anything malformed", () => {
    for (const bad of [undefined, null, "", "today", "2026-7-1", 20260721, {}]) {
      expect(parseLocalDate(bad, now)).toBe("2026-07-21");
    }
  });

  it("handles a month boundary", () => {
    const eve = new Date("2026-08-01T00:30:00.000Z");
    expect(parseLocalDate("2026-07-31", eve)).toBe("2026-07-31");
  });
});

describe("coerceLedger", () => {
  it("accepts a ledger the server sent", () => {
    const wire = {
      version: 2,
      totalXp: 999,
      skillXp: { "event-loop": 80 },
      missions: { "event-loop-overload": record("event-loop-overload", 80) },
      activeDays: ["2026-07-21"],
      achievements: { "first-mission": "2026-07-21T10:00:00.000Z" },
    };

    const parsed = coerceLedger(wire);
    expect(parsed.missions["event-loop-overload"].xpEarned).toBe(80);
    expect(parsed.activeDays).toEqual(["2026-07-21"]);
    expect(parsed.achievements["first-mission"]).toBeTruthy();
    // Recomputed from the records rather than trusted, exactly as for storage:
    // a wire value that disagrees with the runs behind it loses.
    expect(parsed.totalXp).toBe(80);
  });

  it("rejects anything that isn't a version-2 ledger", () => {
    for (const bad of [null, undefined, 42, "ledger", [], { version: 1 }, {}]) {
      expect(coerceLedger(bad)).toEqual(EMPTY_LEDGER);
    }
  });
});
