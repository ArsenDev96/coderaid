import { describe, expect, it } from "vitest";
import {
  DEFAULT_FILTERS,
  PERIODS,
  formatXp,
  getCurrentUser,
  getLeaderboard,
  getRankSummary,
  getStandings,
  type LeaderboardPeriod,
  type StandingsRow,
} from "@/lib/leaderboards";

/**
 * The leaderboard's ranking rules, over real standings.
 *
 * This suite used to assert things about a roster of thirty invented players —
 * that the Country tab held the Armenians, that the seeded population made the
 * percentile look right. All of that is gone with the roster. What is left is
 * the part that was always the real contract: given standings, produce ranks.
 */

function row(over: Partial<StandingsRow> & { id: string }): StandingsRow {
  return {
    username: over.id,
    level: 1,
    successRate: 100,
    focus: "runtime",
    difficulty: "Medium",
    xp: { week: 0, month: 0, all: 0 },
    missions: { week: 0, month: 0, all: 0 },
    ...over,
  };
}

function withXp(id: string, xp: number, over: Partial<StandingsRow> = {}) {
  return row({
    id,
    xp: { week: xp, month: xp, all: xp },
    missions: { week: 1, month: 1, all: 1 },
    ...over,
  });
}

describe("getStandings", () => {
  it("ranks by the selected period's XP", () => {
    const rows = [
      row({ id: "a", xp: { week: 10, month: 500, all: 500 }, missions: { week: 1, month: 5, all: 5 } }),
      row({ id: "b", xp: { week: 90, month: 90, all: 90 }, missions: { week: 3, month: 3, all: 3 } }),
    ];

    expect(getStandings(rows, "week").map((p) => p.id)).toEqual(["b", "a"]);
    expect(getStandings(rows, "month").map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("assigns ranks from 1 with no gaps", () => {
    const ranked = getStandings(
      [withXp("a", 30), withXp("b", 20), withXp("c", 10)],
      "all",
    );
    expect(ranked.map((p) => p.rank)).toEqual([1, 2, 3]);
  });

  /**
   * Stability matters more than it looks: standings are refetched, and two
   * players tied on XP must not swap places because a third person played.
   */
  it("breaks ties deterministically — missions, then name", () => {
    const rows = [
      row({ id: "zoe", username: "zoe", xp: { week: 0, month: 0, all: 50 }, missions: { week: 0, month: 0, all: 1 } }),
      row({ id: "abe", username: "abe", xp: { week: 0, month: 0, all: 50 }, missions: { week: 0, month: 0, all: 1 } }),
      row({ id: "max", username: "max", xp: { week: 0, month: 0, all: 50 }, missions: { week: 0, month: 0, all: 3 } }),
    ];

    // More incidents first, then alphabetical among the rest.
    expect(getStandings(rows, "all").map((p) => p.username)).toEqual([
      "max",
      "abe",
      "zoe",
    ]);
    // And the same answer every time it is asked.
    expect(getStandings([...rows].reverse(), "all").map((p) => p.username)).toEqual([
      "max",
      "abe",
      "zoe",
    ]);
  });

  it("reports the period's own figures, not the all-time ones", () => {
    const [player] = getStandings(
      [row({ id: "a", xp: { week: 5, month: 50, all: 500 }, missions: { week: 1, month: 2, all: 9 } })],
      "week",
    );
    expect(player.xp).toBe(5);
    expect(player.missionsCompleted).toBe(1);
  });

  it("is empty when nobody has played", () => {
    expect(getStandings([], "all")).toEqual([]);
  });
});

describe("getLeaderboard", () => {
  const field = [
    withXp("a", 100),
    withXp("b", 90),
    withXp("c", 80),
    withXp("d", 70, { focus: "debugging" }),
    withXp("e", 60, { difficulty: "Hard" }),
  ];

  it("puts the top three on the podium and the rest in the table", () => {
    const { podium, rows, total } = getLeaderboard(field, "all");
    expect(podium.map((p) => p.id)).toEqual(["a", "b", "c"]);
    expect(rows.map((p) => p.id)).toEqual(["d", "e"]);
    expect(total).toBe(5);
  });

  /**
   * Filtering after ranking is the point: a filtered view narrows *who is
   * listed*, never what anyone's position is.
   */
  it("filters the table without renumbering ranks", () => {
    const { rows } = getLeaderboard(field, "all", {
      ...DEFAULT_FILTERS,
      category: "debugging",
    });
    expect(rows.map((p) => p.id)).toEqual(["d"]);
    expect(rows[0].rank).toBe(4);
  });

  it("filters by difficulty", () => {
    const { rows } = getLeaderboard(field, "all", {
      ...DEFAULT_FILTERS,
      difficulty: "Hard",
    });
    expect(rows.map((p) => p.id)).toEqual(["e"]);
  });

  it("limits Similar Level to a band around the signed-in player", () => {
    const rows = [
      withXp("me", 100, { level: 10, isCurrentUser: true }),
      withXp("near", 90, { level: 12 }),
      withXp("far", 80, { level: 40 }),
      withXp("d", 70, { level: 11 }),
      withXp("e", 60, { level: 99 }),
    ];

    const { rows: table } = getLeaderboard(rows, "all", {
      ...DEFAULT_FILTERS,
      playerScope: "similar",
    });
    expect(table.map((p) => p.id)).toEqual(["d"]);
  });

  it("has an empty podium and no rows for an empty board", () => {
    const { podium, rows, total } = getLeaderboard([], "all");
    expect(podium).toEqual([]);
    expect(rows).toEqual([]);
    expect(total).toBe(0);
  });
});

describe("getCurrentUser", () => {
  it("finds the signed-in player's ranked row", () => {
    const rows = [withXp("a", 100), withXp("me", 50, { isCurrentUser: true })];
    expect(getCurrentUser(rows, "all")).toMatchObject({ id: "me", rank: 2 });
  });

  it("returns undefined when the player isn't ranked", () => {
    expect(getCurrentUser([withXp("a", 100)], "all")).toBeUndefined();
  });
});

describe("getRankSummary", () => {
  /**
   * The percentile is measured against the real number of ranked players. The
   * old seeded population of 12,480 made every percentile flattering and none
   * of them true.
   */
  it("measures the percentile against the real population", () => {
    const rows = [
      withXp("a", 100),
      withXp("me", 50, { isCurrentUser: true }),
      withXp("c", 10),
    ];

    const summary = getRankSummary(rows, "all")!;
    expect(summary.rank).toBe(2);
    expect(summary.population).toBe(3);
    expect(summary.percentile).toBe(67);
  });

  it("never reports a top-0% that reads as a bug", () => {
    const rows = [withXp("me", 100, { isCurrentUser: true })];
    for (let i = 0; i < 500; i++) rows.push(withXp(`p${i}`, 1));
    expect(getRankSummary(rows, "all")!.percentile).toBeGreaterThanOrEqual(1);
  });

  it("returns null when the player isn't on the board", () => {
    expect(getRankSummary([withXp("a", 1)], "all")).toBeNull();
    expect(getRankSummary([], "all")).toBeNull();
  });

  it("labels the period it summarises", () => {
    for (const { id } of PERIODS) {
      const summary = getRankSummary(
        [withXp("me", 10, { isCurrentUser: true })],
        id as LeaderboardPeriod,
      )!;
      expect(summary.periodLabel).toBe(
        PERIODS.find((p) => p.id === id)!.label.toLowerCase(),
      );
    }
  });
});

describe("formatXp", () => {
  it("groups thousands", () => {
    expect(formatXp(1234567)).toBe("1,234,567");
    expect(formatXp(0)).toBe("0");
  });
});

describe("the fictional roster", () => {
  /**
   * A regression guard for the thing phase 5 removed. The board used to ship
   * thirty invented players and a `TOTAL_PLAYERS = 12480`; if either comes
   * back, every number on the page becomes a claim nobody earned.
   */
  it("is gone, and cannot come back through this module", async () => {
    const mod = (await import("@/lib/leaderboards")) as Record<string, unknown>;
    for (const banned of [
      "ROSTER",
      "TOTAL_PLAYERS",
      "HOME_COUNTRY",
      "HOME_COMPANY",
      "CURRENT_USER_ID",
      "currentPlayerEntry",
      "SCOPES",
    ]) {
      expect(mod[banned], `${banned} should not be exported`).toBeUndefined();
    }
  });
});
