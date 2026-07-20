import { describe, expect, it } from "vitest";
import {
  CURRENT_USER_ID,
  DEFAULT_FILTERS,
  HOME_COMPANY,
  HOME_COUNTRY,
  currentPlayerEntry,
  getCurrentUser,
  getLeaderboard,
  getRankSummary,
  getStandings,
  formatXp,
} from "@/lib/leaderboards";
import {
  EMPTY_LEDGER,
  SKILL_XP_PER_LEVEL,
  levelFromXp,
  type Ledger,
  type MissionRecord,
} from "@/lib/progress";

function record(
  missionId: string,
  completedOn: string,
  over: Partial<MissionRecord> = {},
): MissionRecord {
  return {
    missionId,
    completedAt: `${completedOn}T09:00:00.000Z`,
    completedOn,
    score: 90,
    xpEarned: 120,
    durationMs: 600_000,
    hintsUsed: 0,
    resolved: true,
    attempts: 1,
    ...over,
  };
}

function ledgerWith(records: MissionRecord[], over: Partial<Ledger> = {}): Ledger {
  const missions = Object.fromEntries(records.map((r) => [r.missionId, r]));
  return {
    ...EMPTY_LEDGER,
    missions,
    totalXp: records.reduce((n, r) => n + r.xpEarned, 0),
    ...over,
  };
}

describe("a new player's leaderboard row", () => {
  const me = currentPlayerEntry(EMPTY_LEDGER, "Engineer");

  it("is a real level-1 row with nothing earned", () => {
    expect(me.id).toBe(CURRENT_USER_ID);
    expect(me.level).toBe(1);
    expect(me.xp).toEqual({ week: 0, month: 0, all: 0 });
    expect(me.missions).toEqual({ week: 0, month: 0, all: 0 });
    expect(me.successRate).toBe(0);
    expect(me.isCurrentUser).toBe(true);
  });

  it("ranks last in the global standings rather than being hidden", () => {
    const standings = getStandings("global", "all", me);
    expect(standings.at(-1)?.isCurrentUser).toBe(true);
    expect(getCurrentUser("global", "all", me)?.rank).toBe(standings.length);
  });

  it("is placed in the player's home country and company scopes", () => {
    expect(me.country).toBe(HOME_COUNTRY);
    expect(me.company).toBe(HOME_COMPANY);
    expect(getCurrentUser("country", "all", me)).toBeDefined();
    expect(getCurrentUser("company", "all", me)).toBeDefined();
    expect(getCurrentUser("friends", "all", me)).toBeDefined();
  });
});

describe("the player's derived figures", () => {
  // Today is fixed by the ledger dates relative to `now` inside `xpSince`,
  // so use dates that are unambiguously old.
  const ledger = ledgerWith([
    record("event-loop-overload", "2020-01-01", { xpEarned: 80 }),
    record("user-signup-latency-spike", "2020-01-02", {
      xpEarned: 140,
      resolved: false,
    }),
  ]);
  const me = currentPlayerEntry(ledger, "Engineer");

  it("derives all-time XP and level from the ledger", () => {
    expect(me.xp.all).toBe(220);
    expect(me.level).toBe(levelFromXp(220));
  });

  it("derives period XP from when each mission was completed", () => {
    expect(me.xp.week).toBe(0);
    expect(me.xp.month).toBe(0);
    expect(me.missions.week).toBe(0);
  });

  it("derives the mission count from the actual records", () => {
    expect(me.missions.all).toBe(2);
  });

  it("derives the success rate from resolved runs", () => {
    expect(me.successRate).toBe(50);
  });

  it("derives focus from the player's strongest skill category", () => {
    const runtime = currentPlayerEntry(
      ledgerWith([], { skillXp: { "event-loop": SKILL_XP_PER_LEVEL * 5 } }),
      "Engineer",
    );
    expect(runtime.focus).toBe("runtime");

    const apis = currentPlayerEntry(
      ledgerWith([], { skillXp: { "request-performance": SKILL_XP_PER_LEVEL * 5 } }),
      "Engineer",
    );
    expect(apis.focus).toBe("apis");
  });
});

describe("the fictional roster", () => {
  it("is unchanged by the player's own progress", () => {
    const empty = getStandings("global", "all", null);
    const withPlayer = getStandings(
      "global",
      "all",
      currentPlayerEntry(ledgerWith([record("x", "2020-01-01")]), "Engineer"),
    );
    const others = withPlayer.filter((p) => !p.isCurrentUser);
    expect(others.map((p) => ({ id: p.id, xp: p.xp }))).toEqual(
      empty.map((p) => ({ id: p.id, xp: p.xp })),
    );
  });

  it("re-ranks against real period XP rather than relabelling one table", () => {
    const week = getStandings("global", "week", null);
    const all = getStandings("global", "all", null);
    expect(week.map((p) => p.xp)).not.toEqual(all.map((p) => p.xp));
    expect([...week].sort((a, b) => b.xp - a.xp).map((p) => p.id)).toEqual(
      week.map((p) => p.id),
    );
  });
});

describe("the rank summary", () => {
  it("never reports a top-0% percentile", () => {
    const top = getStandings("global", "all", null)[0];
    expect(top.rank).toBe(1);

    const me = currentPlayerEntry(EMPTY_LEDGER, "Engineer");
    const summary = getRankSummary("global", "all", me)!;
    expect(summary.percentile).toBeGreaterThanOrEqual(1);
    expect(summary.xp).toBe(0);
    expect(summary.missions).toBe(0);
  });

  it("has nothing to report when the player isn't in the field", () => {
    expect(getRankSummary("global", "all", null)).toBeNull();
  });
});

describe("the rendered leaderboard", () => {
  it("puts the scope's real top three on the podium", () => {
    const { podium, rows, total } = getLeaderboard(
      "global",
      "all",
      DEFAULT_FILTERS,
      currentPlayerEntry(EMPTY_LEDGER, "Engineer"),
    );
    expect(podium.map((p) => p.rank)).toEqual([1, 2, 3]);
    expect(rows.every((r) => r.rank > 3)).toBe(true);
    expect(total).toBe(podium.length + rows.length);
  });

  it("keeps ranks meaningful when a filter narrows the table", () => {
    const filtered = getLeaderboard("global", "all", {
      ...DEFAULT_FILTERS,
      difficulty: "Easy",
    });
    for (const row of filtered.rows) {
      const unfiltered = getStandings("global", "all").find((p) => p.id === row.id);
      expect(row.rank).toBe(unfiltered?.rank);
    }
  });
});

describe("formatXp", () => {
  it("groups thousands", () => {
    expect(formatXp(0)).toBe("0");
    expect(formatXp(61200)).toBe("61,200");
  });
});
