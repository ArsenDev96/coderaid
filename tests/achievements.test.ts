import { describe, expect, it } from "vitest";
import {
  achievementSources,
  achievementSummary,
  getAchievements,
  latestAchievement,
  nextToUnlock,
  sortAchievements,
  unlockedIds,
} from "@/lib/achievements";
import {
  EMPTY_LEDGER,
  SKILL_XP_PER_LEVEL,
  stampAchievements,
  type Ledger,
  type MissionRecord,
} from "@/lib/progress";

function record(
  missionId: string,
  over: Partial<MissionRecord> = {},
): MissionRecord {
  return {
    missionId,
    completedAt: "2026-03-10T09:00:00.000Z",
    completedOn: "2026-03-10",
    score: 90,
    xpEarned: 72,
    durationMs: 600_000,
    hintsUsed: 0,
    resolved: true,
    attempts: 1,
    ...over,
  };
}

function ledgerWith(records: MissionRecord[], over: Partial<Ledger> = {}): Ledger {
  return {
    ...EMPTY_LEDGER,
    missions: Object.fromEntries(records.map((r) => [r.missionId, r])),
    ...over,
  };
}

const find = (list: ReturnType<typeof getAchievements>, id: string) =>
  list.find((a) => a.id === id)!;

describe("a new player's achievements", () => {
  const list = getAchievements(achievementSources(EMPTY_LEDGER));

  it("unlocks nothing", () => {
    expect(unlockedIds(list)).toEqual([]);
    expect(achievementSummary(list).unlocked).toBe(0);
    expect(achievementSummary(list).pct).toBe(0);
  });

  it("reports zero progress everywhere", () => {
    expect(list.every((a) => a.progress === 0)).toBe(true);
  });

  it("still names something to work toward", () => {
    expect(nextToUnlock(list)).toBeDefined();
    expect(latestAchievement(list)).toBeUndefined();
  });
});

describe("resolved-mission achievements", () => {
  it("counts only runs that actually resolved the incident", () => {
    const attempted = ledgerWith([
      record("event-loop-overload", { resolved: false }),
    ]);
    expect(
      find(getAchievements(achievementSources(attempted)), "first-mission")
        .unlocked,
    ).toBe(false);

    const resolved = ledgerWith([record("event-loop-overload")]);
    expect(
      find(getAchievements(achievementSources(resolved)), "first-mission")
        .unlocked,
    ).toBe(true);
  });

  it("counts a completed-but-unresolved run as a completion, not a resolution", () => {
    const sources = achievementSources(
      ledgerWith([record("event-loop-overload", { resolved: false })]),
    );
    expect(sources.completedMissions).toHaveLength(1);
    expect(sources.resolvedMissions).toHaveLength(0);
  });
});

describe("the hint-free achievement", () => {
  it("reads real hint telemetry rather than assuming none was used", () => {
    const withHints = achievementSources(
      ledgerWith([
        record("event-loop-overload", { hintsUsed: 1 }),
        record("user-signup-latency-spike", { hintsUsed: 0 }),
      ]),
    );
    expect(withHints.hintFreeResolved).toBe(1);
    expect(
      find(getAchievements(withHints), "zero-hints-used").progress,
    ).toBe(1);
  });

  it("does not count a hint-free run that failed to resolve", () => {
    const sources = achievementSources(
      ledgerWith([record("event-loop-overload", { hintsUsed: 0, resolved: false })]),
    );
    expect(sources.hintFreeResolved).toBe(0);
  });
});

describe("skill-level achievements", () => {
  it("track the real skill level from the ledger", () => {
    const ledger = ledgerWith([], {
      skillXp: { "event-loop": SKILL_XP_PER_LEVEL * 7 },
    });
    const list = getAchievements(achievementSources(ledger));
    expect(find(list, "event-loop-master").unlocked).toBe(true);
    expect(find(list, "async-expert").unlocked).toBe(false);
  });
});

describe("quality achievements", () => {
  it("unlocks Perfect Diagnosis only on a 100-point run", () => {
    const near = getAchievements(
      achievementSources(ledgerWith([record("event-loop-overload", { score: 99 })])),
    );
    expect(find(near, "perfect-diagnosis").unlocked).toBe(false);

    const perfect = getAchievements(
      achievementSources(ledgerWith([record("event-loop-overload", { score: 100 })])),
    );
    expect(find(perfect, "perfect-diagnosis").unlocked).toBe(true);
  });
});

describe("unlock timestamps", () => {
  const at = new Date("2026-03-10T09:00:00.000Z");
  const later = new Date("2026-06-01T00:00:00.000Z");
  const ledger = ledgerWith([record("event-loop-overload")]);

  it("are stamped once, on the crossing", () => {
    const list = getAchievements(achievementSources(ledger));
    const stamped = stampAchievements(ledger, unlockedIds(list), at);
    expect(stamped.achievements["first-mission"]).toBe(at.toISOString());
  });

  it("do not move on a later visit", () => {
    const list = getAchievements(achievementSources(ledger));
    const once = stampAchievements(ledger, unlockedIds(list), at);
    const again = stampAchievements(once, unlockedIds(list), later);
    expect(again.achievements["first-mission"]).toBe(at.toISOString());
  });

  it("only appear on achievements that are actually unlocked", () => {
    const list = getAchievements(achievementSources(ledger), {
      "first-mission": at.toISOString(),
      "ten-missions": later.toISOString(),
    });
    expect(find(list, "first-mission").unlockedAt).toBe(at.toISOString());
    expect(find(list, "ten-missions").unlockedAt).toBeUndefined();
  });

  it("order unlocked achievements newest first", () => {
    const list = getAchievements(achievementSources(ledger), {
      "first-mission": at.toISOString(),
    });
    const sorted = sortAchievements(list);
    expect(sorted[0].id).toBe("first-mission");
    expect(latestAchievement(list)?.id).toBe("first-mission");
  });
});

describe("derivation is idempotent", () => {
  it("re-deriving from the same ledger gives the same answer", () => {
    const ledger = ledgerWith([record("event-loop-overload")]);
    const a = getAchievements(achievementSources(ledger));
    const b = getAchievements(achievementSources(ledger));
    expect(b).toEqual(a);
  });
});
