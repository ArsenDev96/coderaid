import { describe, expect, it } from "vitest";
import {
  EMPTY_LEDGER,
  MAX_SKILL_LEVEL,
  PROGRESS_KEY,
  SKILL_XP_PER_LEVEL,
  bestScore,
  completedMissionIds,
  creditRun,
  levelFromXp,
  levelProgress,
  loadLedger,
  markActiveToday,
  missionsSince,
  rankBand,
  skillLevelFromXp,
  skillLevelProgress,
  skillXpFor,
  stampAchievements,
  streakDays,
  successRate,
  today,
  xpForLevel,
  xpSince,
  type Ledger,
  type RunReward,
} from "@/lib/progress";
import { resetMissionProgress } from "@/lib/settings";

/* ----------------------------- Test doubles ----------------------------- */

/** An in-memory `Storage`, so persistence is verifiable without a browser. */
function memoryStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  } as Storage;
}

const AT = new Date("2026-03-10T09:00:00.000Z");

function reward(over: Partial<RunReward> = {}): RunReward {
  return {
    missionId: "event-loop-overload",
    score: 80,
    xp: 64,
    durationMs: 600_000,
    hintsUsed: 0,
    resolved: true,
    skillXp: { "event-loop": 64, "nodejs-runtime": 26 },
    ...over,
  };
}

/* -------------------------------- Tests --------------------------------- */

describe("the empty ledger", () => {
  it("is what a new player has", () => {
    expect(EMPTY_LEDGER.totalXp).toBe(0);
    expect(completedMissionIds(EMPTY_LEDGER)).toEqual([]);
    expect(streakDays(EMPTY_LEDGER)).toBe(0);
    expect(bestScore(EMPTY_LEDGER)).toBe(0);
    expect(successRate(EMPTY_LEDGER)).toBe(0);
    expect(levelFromXp(EMPTY_LEDGER.totalXp)).toBe(1);
  });

  it("is returned when storage holds nothing", () => {
    expect(loadLedger(memoryStorage())).toEqual(EMPTY_LEDGER);
  });
});

describe("levels and ranks", () => {
  it("costs progressively more XP per level", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(100);
    expect(xpForLevel(5)).toBe(1000);
    expect(xpForLevel(10)).toBe(4500);
  });

  it("never drops below level 1, including on negative XP", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(-500)).toBe(1);
  });

  it("inverts the XP curve exactly at every threshold", () => {
    for (let level = 1; level <= 20; level += 1) {
      expect(levelFromXp(xpForLevel(level))).toBe(level);
      expect(levelFromXp(xpForLevel(level + 1) - 1)).toBe(level);
    }
  });

  it("reports progress through the current level", () => {
    const p = levelProgress(150);
    expect(p.level).toBe(2);
    expect(p.into).toBe(50);
    expect(p.needed).toBe(xpForLevel(3) - xpForLevel(2));
    expect(p.pct).toBe(Math.round((50 / p.needed) * 100));
  });

  it("bands XP into a rank and names the one above it", () => {
    const start = rankBand(0);
    expect(start.current.minXp).toBe(0);
    expect(start.next).toBeDefined();
    expect(start.atTopRank).toBe(false);

    const top = rankBand(10_000_000);
    expect(top.atTopRank).toBe(true);
    expect(top.next).toBeUndefined();
  });
});

describe("skill XP", () => {
  it("derives a skill level from its XP, capped at the maximum", () => {
    expect(skillLevelFromXp(0)).toBe(0);
    expect(skillLevelFromXp(SKILL_XP_PER_LEVEL - 1)).toBe(0);
    expect(skillLevelFromXp(SKILL_XP_PER_LEVEL)).toBe(1);
    expect(skillLevelFromXp(SKILL_XP_PER_LEVEL * 3)).toBe(3);
    expect(skillLevelFromXp(SKILL_XP_PER_LEVEL * 1000)).toBe(MAX_SKILL_LEVEL);
  });

  it("holds a maxed skill's bar full rather than resetting it", () => {
    const p = skillLevelProgress(SKILL_XP_PER_LEVEL * MAX_SKILL_LEVEL);
    expect(p.level).toBe(MAX_SKILL_LEVEL);
    expect(p.pct).toBe(100);
  });

  it("reports zero for a skill the player has never touched", () => {
    expect(skillXpFor(EMPTY_LEDGER, "event-loop")).toBe(0);
  });
});

describe("crediting a run", () => {
  it("credits a first completion in full", () => {
    const { ledger, xpAdded, firstCompletion } = creditRun(
      EMPTY_LEDGER,
      reward(),
      AT,
    );
    expect(firstCompletion).toBe(true);
    expect(xpAdded).toBe(64);
    expect(ledger.totalXp).toBe(64);
    expect(ledger.missions["event-loop-overload"].attempts).toBe(1);
    expect(skillXpFor(ledger, "event-loop")).toBe(64);
    expect(skillXpFor(ledger, "nodejs-runtime")).toBe(26);
  });

  it("is idempotent — re-crediting the same run adds nothing", () => {
    const first = creditRun(EMPTY_LEDGER, reward(), AT).ledger;
    const second = creditRun(first, reward(), AT);
    expect(second.xpAdded).toBe(0);
    expect(second.skillXpAdded).toEqual({});
    expect(second.ledger.totalXp).toBe(first.totalXp);
    expect(second.ledger.missions["event-loop-overload"].attempts).toBe(2);
  });

  it("adds only the difference on a better replay", () => {
    const first = creditRun(EMPTY_LEDGER, reward({ score: 60, xp: 48 }), AT).ledger;
    const better = creditRun(first, reward({ score: 90, xp: 72 }), AT);
    expect(better.xpAdded).toBe(72 - 48);
    expect(better.ledger.totalXp).toBe(72);
    expect(better.ledger.missions["event-loop-overload"].score).toBe(90);
  });

  it("tops skill XP up by the improvement rather than awarding it twice", () => {
    const first = creditRun(EMPTY_LEDGER, reward({ score: 50, xp: 40 }), AT).ledger;
    const before = skillXpFor(first, "event-loop");
    const better = creditRun(
      first,
      reward({ score: 100, xp: 80, skillXp: { "event-loop": 80 } }),
      AT,
    );
    const after = skillXpFor(better.ledger, "event-loop");
    expect(after).toBeGreaterThan(before);
    expect(after).toBeLessThan(before + 80);
  });

  it("never regresses on a worse replay", () => {
    const best = creditRun(EMPTY_LEDGER, reward({ score: 95, xp: 76 }), AT).ledger;
    const worse = creditRun(best, reward({ score: 30, xp: 24 }), AT);
    expect(worse.xpAdded).toBe(0);
    expect(worse.ledger.totalXp).toBe(76);
    expect(worse.ledger.missions["event-loop-overload"].score).toBe(95);
    expect(skillXpFor(worse.ledger, "event-loop")).toBe(
      skillXpFor(best, "event-loop"),
    );
  });

  it("keeps total XP equal to the sum of the mission records", () => {
    let ledger = creditRun(EMPTY_LEDGER, reward(), AT).ledger;
    ledger = creditRun(
      ledger,
      reward({ missionId: "user-signup-latency-spike", xp: 120, score: 86 }),
      AT,
    ).ledger;
    const sum = Object.values(ledger.missions).reduce(
      (n, m) => n + m.xpEarned,
      0,
    );
    expect(ledger.totalXp).toBe(sum);
    expect(ledger.totalXp).toBe(184);
  });

  it("records the run as an active day", () => {
    const { ledger } = creditRun(EMPTY_LEDGER, reward(), AT);
    expect(ledger.activeDays).toContain(today(AT));
  });
});

describe("stored ledgers", () => {
  it("recomputes total XP from the records rather than trusting it", () => {
    const storage = memoryStorage({
      [PROGRESS_KEY]: JSON.stringify({
        version: 2,
        totalXp: 999_999,
        skillXp: {},
        missions: {
          "event-loop-overload": {
            completedAt: "2026-03-10T09:00:00.000Z",
            score: 80,
            xpEarned: 64,
          },
        },
        activeDays: [],
        achievements: {},
      }),
    });
    expect(loadLedger(storage).totalXp).toBe(64);
  });

  it("resets a ledger from an unknown version", () => {
    const storage = memoryStorage({
      [PROGRESS_KEY]: JSON.stringify({ version: 1, totalXp: 5000 }),
    });
    expect(loadLedger(storage)).toEqual(EMPTY_LEDGER);
  });

  it("drops malformed records and invalid skill XP instead of throwing", () => {
    const storage = memoryStorage({
      [PROGRESS_KEY]: JSON.stringify({
        version: 2,
        totalXp: 10,
        skillXp: { "event-loop": "lots", "nodejs-runtime": -20, promises: 40 },
        missions: { broken: { score: 10 }, "no-id": null },
        activeDays: ["2026-03-10", "not-a-date", "2026-03-10"],
        achievements: { "first-mission": 42 },
      }),
    });
    const ledger = loadLedger(storage);
    expect(ledger.missions).toEqual({});
    expect(ledger.totalXp).toBe(0);
    expect(ledger.skillXp).toEqual({ promises: 40 });
    expect(ledger.activeDays).toEqual(["2026-03-10"]);
    expect(ledger.achievements).toEqual({});
  });

  it("resets on unparseable JSON", () => {
    expect(loadLedger(memoryStorage({ [PROGRESS_KEY]: "{{{" }))).toEqual(
      EMPTY_LEDGER,
    );
  });
});

describe("the activity streak", () => {
  const withDays = (days: string[]): Ledger => ({
    ...EMPTY_LEDGER,
    activeDays: days,
  });

  it("counts consecutive days ending today", () => {
    const now = new Date(2026, 2, 10);
    expect(
      streakDays(withDays(["2026-03-08", "2026-03-09", "2026-03-10"]), now),
    ).toBe(3);
  });

  it("survives a day that has not been played yet", () => {
    const now = new Date(2026, 2, 10);
    expect(streakDays(withDays(["2026-03-08", "2026-03-09"]), now)).toBe(2);
  });

  it("breaks after two missed midnights", () => {
    const now = new Date(2026, 2, 10);
    expect(streakDays(withDays(["2026-03-07", "2026-03-08"]), now)).toBe(0);
  });

  it("ignores gaps before the current streak", () => {
    const now = new Date(2026, 2, 10);
    expect(
      streakDays(withDays(["2026-01-01", "2026-03-09", "2026-03-10"]), now),
    ).toBe(2);
  });

  it("marks today at most once", () => {
    const now = new Date(2026, 2, 10);
    const once = markActiveToday(EMPTY_LEDGER, now);
    expect(once.activeDays).toEqual([today(now)]);
    expect(markActiveToday(once, now)).toBe(once);
  });
});

describe("period figures", () => {
  const ledger: Ledger = {
    ...EMPTY_LEDGER,
    missions: {
      recent: {
        missionId: "recent",
        completedAt: "2026-03-09T10:00:00.000Z",
        completedOn: "2026-03-09",
        score: 90,
        xpEarned: 100,
        durationMs: 0,
        hintsUsed: 0,
        resolved: true,
        attempts: 1,
      },
      old: {
        missionId: "old",
        completedAt: "2026-01-01T10:00:00.000Z",
        completedOn: "2026-01-01",
        score: 40,
        xpEarned: 20,
        durationMs: 0,
        hintsUsed: 2,
        resolved: false,
        attempts: 1,
      },
    },
  };
  const now = new Date(2026, 2, 10);

  it("counts XP and missions only inside the window", () => {
    expect(xpSince(ledger, 7, now)).toBe(100);
    expect(missionsSince(ledger, 7, now)).toBe(1);
    expect(xpSince(ledger, 365, now)).toBe(120);
    expect(missionsSince(ledger, 365, now)).toBe(2);
  });

  it("derives the success rate from resolved runs only", () => {
    expect(successRate(ledger)).toBe(50);
  });

  it("reports the best score across every run", () => {
    expect(bestScore(ledger)).toBe(90);
  });
});

describe("achievement stamping", () => {
  it("stamps a newly unlocked achievement once", () => {
    const stamped = stampAchievements(EMPTY_LEDGER, ["first-mission"], AT);
    expect(stamped.achievements["first-mission"]).toBe(AT.toISOString());
  });

  it("never moves an existing timestamp", () => {
    const first = stampAchievements(EMPTY_LEDGER, ["first-mission"], AT);
    const later = stampAchievements(
      first,
      ["first-mission"],
      new Date("2026-06-01T00:00:00.000Z"),
    );
    expect(later).toBe(first);
    expect(later.achievements["first-mission"]).toBe(AT.toISOString());
  });

  it("returns the same ledger when nothing is newly unlocked", () => {
    expect(stampAchievements(EMPTY_LEDGER, [], AT)).toBe(EMPTY_LEDGER);
  });
});

describe("resetting mission progress", () => {
  it("clears the ledger and every stage record but keeps profile and settings", () => {
    const storage = memoryStorage({
      "coderaid:profile": "{}",
      "coderaid:user-settings": "{}",
      [PROGRESS_KEY]: "{}",
      "coderaid:event-loop-overload:investigation": "{}",
      "coderaid:event-loop-overload:diagnosis": "{}",
      "coderaid:event-loop-overload:fix": "{}",
      "coderaid:event-loop-overload:verification": "{}",
      "coderaid:event-loop-overload:results": "{}",
      "coderaid:event-loop-overload:run": "{}",
      "unrelated:key": "{}",
    });

    const removed = resetMissionProgress(storage);

    expect(removed).toBe(7);
    expect(storage.getItem("coderaid:profile")).toBe("{}");
    expect(storage.getItem("coderaid:user-settings")).toBe("{}");
    expect(storage.getItem("unrelated:key")).toBe("{}");
    expect(storage.getItem(PROGRESS_KEY)).toBeNull();
    expect(storage.getItem("coderaid:event-loop-overload:run")).toBeNull();
    expect(loadLedger(storage)).toEqual(EMPTY_LEDGER);
  });
});
