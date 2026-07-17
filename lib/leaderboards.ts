import { Building2, Flag, Globe, Users, type LucideIcon } from "lucide-react";
import { AVATARS, type Avatar } from "./onboarding";
import type { Difficulty } from "./missions";
import { SKILL_CATEGORIES, type SkillCategoryId } from "./skills";

/* -------------------------------- Types --------------------------------- */

export type LeaderboardScope = "global" | "friends" | "country" | "company";
export type LeaderboardPeriod = "week" | "month" | "all";
export type PlayerScope = "all" | "friends" | "similar";

/** A ranked row, as the page renders it. Rank is assigned per scope + period. */
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
  country?: string;
  company?: string;
  isCurrentUser?: boolean;
};

/**
 * The stored shape. XP and missions are held per period so the period selector
 * re-ranks real numbers instead of relabelling one frozen table.
 */
type RosterEntry = {
  id: string;
  username: string;
  avatar?: string;
  level: number;
  successRate: number;
  country: string;
  company: string;
  /** Where this player earns most of their XP — drives the category filter. */
  focus: SkillCategoryId;
  /** The difficulty they mostly play — drives the difficulty filter. */
  difficulty: Difficulty;
  isFriend?: boolean;
  isCurrentUser?: boolean;
  xp: Record<LeaderboardPeriod, number>;
  missions: Record<LeaderboardPeriod, number>;
};

/* ------------------------------- Options -------------------------------- */

export const SCOPES: { id: LeaderboardScope; label: string; icon: LucideIcon }[] = [
  { id: "global", label: "Global", icon: Globe },
  { id: "friends", label: "Friends", icon: Users },
  { id: "country", label: "Country", icon: Flag },
  { id: "company", label: "Company", icon: Building2 },
];

export const PERIODS: { id: LeaderboardPeriod; label: string }[] = [
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "all", label: "All Time" },
];

export const DEFAULT_PERIOD: LeaderboardPeriod = "month";

export const PLAYER_SCOPES: { id: PlayerScope; label: string }[] = [
  { id: "all", label: "All Players" },
  { id: "friends", label: "Friends Only" },
  { id: "similar", label: "Similar Level" },
];

/**
 * How close in level a player must be to count as "Similar Level". Wide enough
 * that the filter returns a peer group rather than just you.
 */
const SIMILAR_LEVEL_RANGE = 5;

export const ROWS_PER_PAGE = 10;

/** The current user's home scope — what the Country and Company tabs filter to. */
export const HOME_COUNTRY = "Armenia";
export const HOME_COMPANY = "Koreez";

/**
 * Mocked size of the wider player base. Used only for the percentile readout —
 * the roster below is the visible slice of it, not the whole population.
 */
export const TOTAL_PLAYERS = 12480;

/** Positions gained since the previous period. Only the summary panel reads it. */
export const RANK_CHANGE: Record<LeaderboardPeriod, number> = {
  week: 1,
  month: 2,
  all: -1,
};

/* -------------------------------- Roster -------------------------------- */

// Static demo standings. Deliberately separate from the player's real progress
// (`DEMO_PLAYER` / the onboarding draft) so mock rankings never write over it.
const ROSTER: RosterEntry[] = [
  {
    id: "code-master",
    username: "code_master",
    avatar: "unit",
    level: 28,
    successRate: 91,
    country: "Germany",
    company: "Datadog",
    focus: "architecture",
    difficulty: "Expert",
    xp: { week: 3100, month: 12750, all: 61200 },
    missions: { week: 14, month: 52, all: 248 },
  },
  {
    id: "dev-alyssa",
    username: "dev_alyssa",
    avatar: "ada",
    level: 22,
    successRate: 88,
    country: "United States",
    company: "Stripe",
    focus: "database",
    difficulty: "Hard",
    isFriend: true,
    xp: { week: 2450, month: 9450, all: 38400 },
    missions: { week: 11, month: 43, all: 176 },
  },
  {
    id: "backend-ninja",
    username: "backend_ninja",
    avatar: "lin",
    level: 21,
    successRate: 85,
    country: "Japan",
    company: "Shopify",
    focus: "backend",
    difficulty: "Hard",
    xp: { week: 1980, month: 8100, all: 35900 },
    missions: { week: 9, month: 38, all: 164 },
  },
  {
    id: "current-user",
    username: "ArsDev",
    avatar: "nova",
    level: 24,
    successRate: 82,
    country: HOME_COUNTRY,
    company: HOME_COMPANY,
    focus: "testing",
    difficulty: "Medium",
    isCurrentUser: true,
    xp: { week: 2050, month: 7500, all: 41300 },
    missions: { week: 8, month: 34, all: 187 },
  },
  {
    id: "tech-wizard",
    username: "tech_wizard",
    avatar: "rae",
    level: 20,
    successRate: 76,
    country: "Poland",
    company: "Vercel",
    focus: "performance",
    difficulty: "Hard",
    isFriend: true,
    xp: { week: 1620, month: 6230, all: 29800 },
    missions: { week: 7, month: 29, all: 141 },
  },
  {
    id: "async-king",
    username: "async_king",
    avatar: "unit",
    level: 20,
    successRate: 74,
    country: HOME_COUNTRY,
    company: HOME_COMPANY,
    focus: "language",
    difficulty: "Hard",
    isFriend: true,
    xp: { week: 1740, month: 6100, all: 27450 },
    missions: { week: 8, month: 27, all: 133 },
  },
  {
    id: "bug-hunter",
    username: "bug_hunter",
    avatar: "nova",
    level: 19,
    successRate: 70,
    country: "Brazil",
    company: "Freelance",
    focus: "testing",
    difficulty: "Medium",
    xp: { week: 1380, month: 5450, all: 24100 },
    missions: { week: 6, month: 24, all: 118 },
  },
  {
    id: "node-slayer",
    username: "node_slayer",
    avatar: "lin",
    level: 19,
    successRate: 68,
    country: "India",
    company: "Datadog",
    focus: "language",
    difficulty: "Medium",
    isFriend: true,
    xp: { week: 1290, month: 5200, all: 23350 },
    missions: { week: 6, month: 22, all: 112 },
  },
  {
    id: "db-explorer",
    username: "db_explorer",
    avatar: "ada",
    level: 18,
    successRate: 66,
    country: HOME_COUNTRY,
    company: HOME_COMPANY,
    focus: "database",
    difficulty: "Medium",
    xp: { week: 1150, month: 4900, all: 21600 },
    missions: { week: 5, month: 21, all: 104 },
  },
  {
    id: "system-logic",
    username: "system_logic",
    avatar: "rae",
    level: 18,
    successRate: 64,
    country: "Canada",
    company: "Stripe",
    focus: "architecture",
    difficulty: "Expert",
    xp: { week: 1080, month: 4650, all: 22900 },
    missions: { week: 5, month: 20, all: 109 },
  },
  {
    id: "cache-queen",
    username: "cache_queen",
    avatar: "ada",
    level: 17,
    successRate: 79,
    country: "Spain",
    company: "Vercel",
    focus: "performance",
    difficulty: "Hard",
    isFriend: true,
    xp: { week: 980, month: 4380, all: 19750 },
    missions: { week: 5, month: 19, all: 96 },
  },
  {
    id: "trace-reader",
    username: "trace_reader",
    avatar: "unit",
    level: 17,
    successRate: 61,
    country: HOME_COUNTRY,
    company: HOME_COMPANY,
    focus: "testing",
    difficulty: "Medium",
    xp: { week: 1020, month: 4120, all: 18300 },
    missions: { week: 5, month: 18, all: 89 },
  },
  {
    id: "query-planner",
    username: "query_planner",
    avatar: "lin",
    level: 16,
    successRate: 72,
    country: "Germany",
    company: "Shopify",
    focus: "database",
    difficulty: "Hard",
    xp: { week: 870, month: 3940, all: 17800 },
    missions: { week: 4, month: 17, all: 86 },
  },
  {
    id: "null-pointer",
    username: "null_pointer",
    avatar: "nova",
    level: 16,
    successRate: 58,
    country: "United Kingdom",
    company: "Freelance",
    focus: "language",
    difficulty: "Easy",
    xp: { week: 760, month: 3710, all: 15400 },
    missions: { week: 4, month: 17, all: 82 },
  },
  {
    id: "stack-tracer",
    username: "stack_tracer",
    avatar: "rae",
    level: 15,
    successRate: 67,
    country: "Poland",
    company: "Datadog",
    focus: "testing",
    difficulty: "Medium",
    isFriend: true,
    xp: { week: 820, month: 3520, all: 16100 },
    missions: { week: 4, month: 16, all: 79 },
  },
  {
    id: "latency-hawk",
    username: "latency_hawk",
    avatar: "unit",
    level: 15,
    successRate: 63,
    country: HOME_COUNTRY,
    company: HOME_COMPANY,
    focus: "performance",
    difficulty: "Hard",
    xp: { week: 690, month: 3340, all: 14750 },
    missions: { week: 3, month: 15, all: 74 },
  },
  {
    id: "shard-runner",
    username: "shard_runner",
    avatar: "lin",
    level: 14,
    successRate: 60,
    country: "India",
    company: "Stripe",
    focus: "architecture",
    difficulty: "Expert",
    xp: { week: 640, month: 3180, all: 13900 },
    missions: { week: 3, month: 14, all: 71 },
  },
  {
    id: "api-artisan",
    username: "api_artisan",
    avatar: "ada",
    level: 14,
    successRate: 71,
    country: "Brazil",
    company: "Vercel",
    focus: "backend",
    difficulty: "Medium",
    xp: { week: 710, month: 3020, all: 12600 },
    missions: { week: 3, month: 14, all: 67 },
  },
  {
    id: "heap-diver",
    username: "heap_diver",
    avatar: "nova",
    level: 13,
    successRate: 57,
    country: "Japan",
    company: "Shopify",
    focus: "language",
    difficulty: "Hard",
    xp: { week: 580, month: 2870, all: 11950 },
    missions: { week: 3, month: 13, all: 63 },
  },
  {
    id: "retry-logic",
    username: "retry_logic",
    avatar: "rae",
    level: 13,
    successRate: 54,
    country: HOME_COUNTRY,
    company: HOME_COMPANY,
    focus: "backend",
    difficulty: "Medium",
    isFriend: true,
    xp: { week: 620, month: 2740, all: 11200 },
    missions: { week: 3, month: 12, all: 59 },
  },
  {
    id: "index-scout",
    username: "index_scout",
    avatar: "unit",
    level: 12,
    successRate: 65,
    country: "Canada",
    company: "Datadog",
    focus: "database",
    difficulty: "Medium",
    xp: { week: 540, month: 2610, all: 10400 },
    missions: { week: 2, month: 12, all: 56 },
  },
  {
    id: "mutex-mage",
    username: "mutex_mage",
    avatar: "lin",
    level: 12,
    successRate: 52,
    country: "Spain",
    company: "Freelance",
    focus: "architecture",
    difficulty: "Expert",
    xp: { week: 490, month: 2480, all: 9850 },
    missions: { week: 2, month: 11, all: 52 },
  },
  {
    id: "log-whisperer",
    username: "log_whisperer",
    avatar: "ada",
    level: 11,
    successRate: 59,
    country: "United States",
    company: "Stripe",
    focus: "testing",
    difficulty: "Easy",
    xp: { week: 520, month: 2350, all: 9100 },
    missions: { week: 2, month: 11, all: 49 },
  },
  {
    id: "pool-guard",
    username: "pool_guard",
    avatar: "nova",
    level: 11,
    successRate: 55,
    country: HOME_COUNTRY,
    company: HOME_COMPANY,
    focus: "performance",
    difficulty: "Medium",
    xp: { week: 460, month: 2190, all: 8600 },
    missions: { week: 2, month: 10, all: 46 },
  },
  {
    id: "schema-smith",
    username: "schema_smith",
    avatar: "rae",
    level: 10,
    successRate: 62,
    country: "Germany",
    company: "Vercel",
    focus: "database",
    difficulty: "Easy",
    isFriend: true,
    xp: { week: 430, month: 2060, all: 7900 },
    missions: { week: 2, month: 10, all: 43 },
  },
  {
    id: "route-ranger",
    username: "route_ranger",
    avatar: "unit",
    level: 10,
    successRate: 51,
    country: "Poland",
    company: "Shopify",
    focus: "backend",
    difficulty: "Easy",
    xp: { week: 390, month: 1920, all: 7300 },
    missions: { week: 2, month: 9, all: 41 },
  },
  {
    id: "byte-forge",
    username: "byte_forge",
    avatar: "lin",
    level: 9,
    successRate: 48,
    country: "India",
    company: "Freelance",
    focus: "language",
    difficulty: "Easy",
    xp: { week: 350, month: 1780, all: 6500 },
    missions: { week: 1, month: 9, all: 38 },
  },
  {
    id: "spec-hunter",
    username: "spec_hunter",
    avatar: "ada",
    level: 9,
    successRate: 56,
    country: HOME_COUNTRY,
    company: HOME_COMPANY,
    focus: "testing",
    difficulty: "Easy",
    xp: { week: 320, month: 1640, all: 6100 },
    missions: { week: 1, month: 8, all: 35 },
  },
  {
    id: "edge-caster",
    username: "edge_caster",
    avatar: "nova",
    level: 8,
    successRate: 45,
    country: "Brazil",
    company: "Datadog",
    focus: "performance",
    difficulty: "Easy",
    xp: { week: 280, month: 1490, all: 5400 },
    missions: { week: 1, month: 8, all: 31 },
  },
  {
    id: "proxy-pilot",
    username: "proxy_pilot",
    avatar: "rae",
    level: 8,
    successRate: 43,
    country: "Canada",
    company: "Vercel",
    focus: "architecture",
    difficulty: "Medium",
    isFriend: true,
    xp: { week: 240, month: 1350, all: 4900 },
    missions: { week: 1, month: 7, all: 28 },
  },
];

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

function inScope(entry: RosterEntry, scope: LeaderboardScope): boolean {
  switch (scope) {
    case "friends":
      return Boolean(entry.isFriend || entry.isCurrentUser);
    case "country":
      return entry.country === HOME_COUNTRY;
    case "company":
      return entry.company === HOME_COMPANY;
    case "global":
      return true;
  }
}

function toPlayer(entry: RosterEntry, period: LeaderboardPeriod, rank: number): LeaderboardPlayer {
  return {
    id: entry.id,
    username: entry.username,
    avatar: entry.avatar,
    level: entry.level,
    xp: entry.xp[period],
    missionsCompleted: entry.missions[period],
    successRate: entry.successRate,
    rank,
    country: entry.country,
    company: entry.company,
    isCurrentUser: entry.isCurrentUser,
  };
}

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

const CURRENT_LEVEL =
  ROSTER.find((e) => e.isCurrentUser)?.level ?? 0;

function matchesFilters(entry: RosterEntry, f: LeaderboardFilters): boolean {
  if (f.category !== "all" && entry.focus !== f.category) return false;
  if (f.difficulty !== "all" && entry.difficulty !== f.difficulty) return false;
  if (f.playerScope === "friends" && !entry.isFriend && !entry.isCurrentUser) return false;
  if (
    f.playerScope === "similar" &&
    Math.abs(entry.level - CURRENT_LEVEL) > SIMILAR_LEVEL_RANGE
  ) {
    return false;
  }
  return true;
}

/**
 * The standings for a scope + period: everyone in scope, ranked by XP.
 *
 * Filters are applied *after* ranking (see `getLeaderboard`) so a rank always
 * means the player's real position in the scope, not their position within
 * whatever subset happens to be on screen.
 */
export function getStandings(
  scope: LeaderboardScope,
  period: LeaderboardPeriod,
): LeaderboardPlayer[] {
  return ROSTER.filter((e) => inScope(e, scope))
    .sort((a, b) => b.xp[period] - a.xp[period])
    .map((e, i) => toPlayer(e, period, i + 1));
}

/**
 * Podium + table rows for the current view.
 *
 * The podium always shows the scope's real top three; the table holds everyone
 * below them, narrowed by the filters — mirroring where the filter panel sits.
 */
export function getLeaderboard(
  scope: LeaderboardScope,
  period: LeaderboardPeriod,
  filters: LeaderboardFilters = DEFAULT_FILTERS,
) {
  const standings = getStandings(scope, period);
  const byId = new Map(ROSTER.map((e) => [e.id, e]));

  const podium = standings.slice(0, 3);
  const rows = standings
    .slice(3)
    .filter((p) => matchesFilters(byId.get(p.id)!, filters));

  return { podium, rows, total: standings.length };
}

/** The current user's row within a scope + period, if they rank there at all. */
export function getCurrentUser(
  scope: LeaderboardScope,
  period: LeaderboardPeriod,
): LeaderboardPlayer | undefined {
  return getStandings(scope, period).find((p) => p.isCurrentUser);
}

/**
 * The compact summary panel: rank, percentile, period XP and rank movement.
 * Percentile is scaled against `TOTAL_PLAYERS`, floored at 1 — "Top 0%" reads
 * as a bug, and nobody is better than the top 1%.
 */
export function getRankSummary(scope: LeaderboardScope, period: LeaderboardPeriod) {
  const me = getCurrentUser(scope, period);
  if (!me) return null;

  const population = scope === "global" ? TOTAL_PLAYERS : getStandings(scope, period).length;
  const percentile = Math.max(1, Math.round((me.rank / population) * 100));

  return {
    rank: me.rank,
    percentile,
    xp: me.xp,
    rankChange: RANK_CHANGE[period],
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
