import { AVATARS, type Avatar } from "./onboarding";
import type { Difficulty } from "./missions";
import { SKILL_CATEGORIES, type SkillCategoryId } from "./skills";

/**
 * The leaderboard — real standings, ranked from real runs.
 *
 * Until phase 5 this module carried a hand-written roster of thirty fictional
 * players and a `TOTAL_PLAYERS = 12480` constant, because there was no backend
 * to ask. Both are gone. The board now shows the people who actually play, in
 * the order their runs put them, and says how many that is even when the answer
 * is small — an honest "2 ranked players" is worth more than a comfortable
 * number nobody earned.
 *
 * Everything here is **pure**: it takes standings the server derived and turns
 * them into ranked rows. The fetching lives in `components/leaderboards`, and
 * the derivation in `lib/server/standings.ts`, so these rules stay directly
 * testable — the same split the rest of the app uses.
 *
 * Scopes that no data model could answer went with the roster. There is no
 * friends graph and no country or company on a player, so Friends, Country and
 * Company were removed rather than left as tabs that filter nothing. A control
 * that cannot honour its label is worse than no control.
 */

/* -------------------------------- Types --------------------------------- */

export type LeaderboardPeriod = "week" | "month" | "all";

/** A ranked row, as the page renders it. Rank is assigned per period. */
export type LeaderboardPlayer = {
  id: string;
  username: string;
  /** An `AVATARS` id — resolve with `avatarFor`. */
  avatar?: string;
  level: number;
  xp: number;
  missionsCompleted: number;
  successRate: number;
  rank: number;
  isCurrentUser?: boolean;
};

/**
 * One player's standing, as the server derives it.
 *
 * XP and missions are held per period so the period selector re-ranks real
 * numbers instead of relabelling one frozen table. `focus` and `difficulty`
 * are derived from what the player actually played — where their skill XP went
 * and which difficulty band they mostly clear — so the filters describe them
 * rather than a self-declared preference.
 */
export type StandingsRow = {
  id: string;
  username: string;
  avatar?: string;
  level: number;
  successRate: number;
  focus: SkillCategoryId;
  difficulty: Difficulty;
  xp: Record<LeaderboardPeriod, number>;
  missions: Record<LeaderboardPeriod, number>;
  /** Set by the client once it knows which row is the signed-in player. */
  isCurrentUser?: boolean;
};

/* ------------------------------- Options -------------------------------- */

export const PERIODS: { id: LeaderboardPeriod; label: string }[] = [
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "all", label: "All Time" },
];

export const DEFAULT_PERIOD: LeaderboardPeriod = "month";

/** Player scopes that survive: no friends graph exists, so neither does that tab. */
export type PlayerScope = "all" | "similar";

export const PLAYER_SCOPES: { id: PlayerScope; label: string }[] = [
  { id: "all", label: "All Players" },
  { id: "similar", label: "Similar Level" },
];

/**
 * How close in level a player must be to count as "Similar Level". Wide enough
 * that the filter returns a peer group rather than just you.
 */
const SIMILAR_LEVEL_RANGE = 5;

export const ROWS_PER_PAGE = 10;

/* ------------------------------- Helpers -------------------------------- */

const DEFAULT_AVATAR = AVATARS[0];

/** Resolves a stored avatar id to the shared onboarding avatar (icon + gradient). */
export function avatarFor(id?: string): Avatar {
  return AVATARS.find((a) => a.id === id) ?? DEFAULT_AVATAR;
}

export const CATEGORY_OPTIONS = SKILL_CATEGORIES.map((c) => ({
  id: c.id,
  label: c.name,
}));

export type LeaderboardFilters = {
  category: SkillCategoryId | "all";
  difficulty: Difficulty | "all";
  playerScope: PlayerScope;
};

export const DEFAULT_FILTERS: LeaderboardFilters = {
  category: "all",
  difficulty: "all",
  playerScope: "all",
};

function toPlayer(
  entry: StandingsRow,
  period: LeaderboardPeriod,
  rank: number,
): LeaderboardPlayer {
  return {
    id: entry.id,
    username: entry.username,
    avatar: entry.avatar,
    level: entry.level,
    xp: entry.xp[period],
    missionsCompleted: entry.missions[period],
    successRate: entry.successRate,
    rank,
    isCurrentUser: entry.isCurrentUser,
  };
}

/* ------------------------------- Ranking -------------------------------- */

/**
 * Standings for a period: everyone ranked by the XP they earned in it.
 *
 * Ties break toward the player who cleared more incidents, then by name, so the
 * order is stable across refetches rather than depending on row order — two
 * players on equal XP shouldn't swap places when someone else finishes a run.
 */
export function getStandings(
  rows: StandingsRow[],
  period: LeaderboardPeriod,
): LeaderboardPlayer[] {
  return [...rows]
    .sort(
      (a, b) =>
        b.xp[period] - a.xp[period] ||
        b.missions[period] - a.missions[period] ||
        a.username.localeCompare(b.username),
    )
    .map((entry, i) => toPlayer(entry, period, i + 1));
}

function matchesFilters(
  entry: StandingsRow,
  f: LeaderboardFilters,
  currentLevel: number,
): boolean {
  if (f.category !== "all" && entry.focus !== f.category) return false;
  if (f.difficulty !== "all" && entry.difficulty !== f.difficulty) return false;
  if (
    f.playerScope === "similar" &&
    Math.abs(entry.level - currentLevel) > SIMILAR_LEVEL_RANGE
  ) {
    return false;
  }
  return true;
}

/**
 * Podium + table rows for the current view.
 *
 * The podium always shows the real top three; the table holds everyone below
 * them, narrowed by the filters — mirroring where the filter panel sits.
 * Filters are applied *after* ranking, so a rank always means the player's real
 * position on the board rather than their position within whatever subset
 * happens to be on screen.
 */
export function getLeaderboard(
  rows: StandingsRow[],
  period: LeaderboardPeriod,
  filters: LeaderboardFilters = DEFAULT_FILTERS,
) {
  const standings = getStandings(rows, period);
  const byId = new Map(rows.map((e) => [e.id, e]));
  const currentLevel = rows.find((r) => r.isCurrentUser)?.level ?? 0;

  const podium = standings.slice(0, 3);
  const tableRows = standings
    .slice(3)
    .filter((p) => {
      const entry = byId.get(p.id);
      return entry ? matchesFilters(entry, filters, currentLevel) : false;
    });

  return { podium, rows: tableRows, total: standings.length };
}

/** The signed-in player's row for a period, if they rank at all. */
export function getCurrentUser(
  rows: StandingsRow[],
  period: LeaderboardPeriod,
): LeaderboardPlayer | undefined {
  return getStandings(rows, period).find((p) => p.isCurrentUser);
}

/**
 * The compact summary panel: rank, percentile, period XP and incidents cleared.
 *
 * The percentile is measured against the **real** number of ranked players, not
 * a seeded population. On a small board that produces honest, unflattering
 * numbers — being 2nd of 3 is the 67th percentile — which is the point: the old
 * `TOTAL_PLAYERS = 12480` made every percentile a compliment nobody had earned.
 *
 * There is still no "rank movement" here: nothing records what the player's
 * rank was last week, so any arrow would be decoration rather than information.
 */
export function getRankSummary(
  rows: StandingsRow[],
  period: LeaderboardPeriod,
) {
  const standings = getStandings(rows, period);
  const row = standings.find((p) => p.isCurrentUser);
  if (!row) return null;

  const population = standings.length;
  const percentile =
    population === 0 ? 100 : Math.max(1, Math.round((row.rank / population) * 100));

  return {
    rank: row.rank,
    percentile,
    population,
    xp: row.xp,
    missions: row.missionsCompleted,
    periodLabel: PERIODS.find((p) => p.id === period)!.label.toLowerCase(),
  };
}

export function formatXp(xp: number): string {
  return xp.toLocaleString("en-US");
}

/** Gold / silver / bronze accents, indexed by podium position. */
export const PODIUM_ACCENTS = [
  {
    ring: "border-amber-400/60",
    glow: "shadow-[0_0_50px_-12px_rgba(251,191,36,0.55)]",
    badge: "border-amber-300/70 bg-gradient-to-br from-amber-300 to-amber-500 text-base-950",
    text: "text-amber-300",
    card: "border-amber-400/40 bg-gradient-to-b from-amber-500/[0.09] to-transparent",
  },
  {
    ring: "border-slate-300/50",
    glow: "shadow-[0_0_40px_-16px_rgba(203,213,225,0.4)]",
    badge: "border-slate-200/70 bg-gradient-to-br from-slate-200 to-slate-400 text-base-950",
    text: "text-slate-300",
    card: "border-slate-300/25 bg-gradient-to-b from-slate-300/[0.06] to-transparent",
  },
  {
    ring: "border-orange-400/50",
    glow: "shadow-[0_0_40px_-16px_rgba(251,146,60,0.4)]",
    badge: "border-orange-300/70 bg-gradient-to-br from-orange-300 to-orange-600 text-base-950",
    text: "text-orange-300",
    card: "border-orange-400/30 bg-gradient-to-b from-orange-500/[0.07] to-transparent",
  },
] as const;
