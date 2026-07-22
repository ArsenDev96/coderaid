import {
  BarChart3,
  Home,
  Layers,
  type LucideIcon,
  Settings,
  Star,
  Target,
} from "lucide-react";
import { EMPTY_VIEW, recommendedMission, type PlayerView } from "./availability";
import { getInvestigation } from "./investigation";
import {
  CURRENT_MISSION_ID,
  SEVERITY_BADGE,
  getMission,
  resolveBriefing,
  type Mission,
} from "./missions";
import {
  levelFromXp,
  levelProgress,
  rankBand,
  streakDays,
  type Ledger,
} from "./progress";

/* ------------------------------- Player -------------------------------- */

export type Player = {
  name: string;
  rank: string;
  level: number;
  totalXp: number;
  streakDays: number;
};

export const DEFAULT_PLAYER_NAME = "Engineer";

/**
 * The player, entirely derived: XP is the sum of their graded mission runs,
 * the level comes from the XP curve, the rank from the published thresholds
 * and the streak from the days they actually played.
 *
 * There is no demo profile any more. A new player is level 1 with 0 XP,
 * because that is what they have earned.
 */
export function playerFrom(ledger: Ledger, name = DEFAULT_PLAYER_NAME): Player {
  return {
    name,
    rank: rankBand(ledger.totalXp).current.name,
    level: levelFromXp(ledger.totalXp),
    totalXp: ledger.totalXp,
    streakDays: streakDays(ledger),
  };
}

export const GREETING_SUBTITLE =
  "Let's debug some real Node.js incidents.";

/* ------------------------------ Navigation ------------------------------ */

export type SidebarItem = { label: string; icon: LucideIcon; href?: string };

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { label: "Dashboard", icon: Home, href: "/dashboard" },
  { label: "Missions", icon: Target, href: "/missions" },
  { label: "Skills", icon: Layers, href: "/skills" },
  { label: "Leaderboards", icon: BarChart3, href: "/leaderboards" },
  { label: "Achievements", icon: Star, href: "/achievements" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

/* ------------------------------ Sparkline ------------------------------- */

/*
  Declared above `nextActionFor` on purpose. `NEXT_ACTION` below is evaluated
  at module load, so it reaches these two constants during initialisation —
  and `const` is in its temporal dead zone until its own declaration runs.
  Defining them after `NEXT_ACTION` builds fine and then throws
  "Cannot access 'b' before initialization" at prerender time, on pages that
  never mention the dashboard. Keep them here.
*/
export const SPARK_WIDTH = 240;
export const SPARK_HEIGHT = 40;

/**
 * Projects a latency series onto SVG polyline points.
 *
 * This replaces `RESPONSE_SERIES`, a hardcoded 21-point squiggle that was
 * rendered on the Next Action card **beside a real headline metric taken from
 * the mission's own investigation config** — and was byte-identical for all
 * fourteen missions. A player comparing the number to the shape beside it was
 * reading a decoration as data.
 *
 * The series is normalised to its own min/max rather than to an absolute
 * scale: these are latency samples in whatever unit the mission authored, so
 * only the *shape* is comparable, which is all a sparkline claims to show.
 * A flat series draws a flat line through the middle instead of dividing by a
 * zero range.
 *
 * Returns `null` for a series too short to draw — the caller omits the chart
 * rather than rendering a single point.
 */
export function sparklinePoints(
  series: number[],
  width = SPARK_WIDTH,
  height = SPARK_HEIGHT,
): string | null {
  if (series.length < 2) return null;
  if (series.some((n) => !Number.isFinite(n))) return null;

  const pad = 3;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min;
  const span = height - pad * 2;

  const round = (n: number) => Math.round(n * 10) / 10;

  return series
    .map((value, i) => {
      const x = (i / (series.length - 1)) * width;
      const y = range === 0 ? height / 2 : height - pad - ((value - min) / range) * span;
      return `${round(x)},${round(y)}`;
    })
    .join(" ");
}

/* ---------------------------- Your next action -------------------------- */

export type CodeLine = { n: number; content: string; tone?: "comment" | "warn" };

/**
 * The dashboard's "continue where you left off" card. Derived from a mission
 * and its investigation content, so the title, severity and code preview
 * follow whichever mission is recommended instead of naming one.
 *
 * Deliberately carries no progress figures. How far into the mission the
 * player is, how many clues they've found and how long they have left are
 * facts about them, and come from `useMissionResume` after mount.
 */
export function nextActionFor(mission: Mission) {
  const briefing = resolveBriefing(mission);
  const investigation = getInvestigation(mission.id);

  // A preview, not the whole file — the workspace is where you read the code.
  const code: CodeLine[] = (investigation?.code.lines ?? [])
    .slice(0, 9)
    .map((line, i) => ({
      n: i + 1,
      content: line.text,
      tone: line.evidenceId ? ("warn" as const) : undefined,
    }));

  return {
    missionId: mission.id,
    href: `/missions/${mission.id}/investigation`,
    briefingHref: `/missions/${mission.id}/briefing`,
    title: mission.title,
    description: mission.description,
    severity: SEVERITY_BADGE[briefing.severity].label,
    severityCls: SEVERITY_BADGE[briefing.severity].cls,
    headline: investigation?.summary.headline ?? {
      label: "Status",
      value: "—",
    },
    findings: investigation?.summary.findings ?? [],
    // The sparkline beside the headline metric is now that mission's own
    // authored latency samples, so the shape and the number describe the same
    // incident. `null` when the mission has no investigation content to draw.
    spark: sparklinePoints(investigation?.metrics.latency.series ?? []),
    code,
  };
}

export type NextActionData = ReturnType<typeof nextActionFor>;

/**
 * The card content for the mission the player should open next. Always a fully
 * playable Node.js mission — `recommendedMission()` never returns locked or
 * in-development content — with the catalogue's current mission as a fallback.
 */
export function buildNextAction(view: PlayerView = EMPTY_VIEW): NextActionData {
  const mission = recommendedMission(view) ?? getMission(CURRENT_MISSION_ID);
  if (!mission) throw new Error(`Unknown CURRENT_MISSION_ID: ${CURRENT_MISSION_ID}`);
  return nextActionFor(mission);
}

export const NEXT_ACTION = buildNextAction();

/* ------------------------------ Daily raid ------------------------------ */

/**
 * A short, self-contained Node.js drill — planned, not built.
 *
 * It carries no XP figure and no route: there is nothing to play, so promising
 * a reward the ledger can never credit would be a lie the moment a player
 * clicked it. The card advertises the idea and says so.
 */
export const DAILY_RAID = {
  title: "Daily Node.js Challenge",
  description:
    "A quick Node.js drill — event loop, promises, async iteration or error handling.",
  topic: "Event loop and promise ordering",
  prompt: "Predict the output order of a handler mixing timers and microtasks.",
  note: "Daily challenges are being built — they aren't playable yet.",
};

/* -------------------------- Node.js progression ------------------------- */

export const CAREER_BLURB = "Solve Node.js incidents to reach the next rank.";

/**
 * Rank and level progress for the dashboard card, derived from the player's
 * real XP. There is one XP number — the ledger's — so the label, the bar and
 * the rank can't drift apart.
 */
export function careerFor(ledger: Ledger) {
  const band = rankBand(ledger.totalXp);
  const level = levelProgress(ledger.totalXp);
  return {
    xp: ledger.totalXp,
    currentRank: band.current.name,
    nextRank: band.next?.name ?? band.current.name,
    xpMax: band.xpMax,
    atTopRank: band.atTopRank,
    rankPct: band.atTopRank
      ? 100
      : Math.min(100, Math.round((ledger.totalXp / band.xpMax) * 100)),
    level: level.level,
    levelInto: level.into,
    levelNeeded: level.needed,
    levelPct: level.pct,
    blurb: CAREER_BLURB,
  };
}

/* ------------------- Recommended missions and skills -------------------- */

// Both cards read from the canonical sources rather than a copy kept here:
// `RecommendedMissions` derives its list from the mission catalogue filtered by
// `canStart`, and `SkillsSummary` reads `lib/skills.ts` by stable skill id.
// The old `RECOMMENDED_MISSIONS` / `DASHBOARD_SKILLS` fixtures are gone so the
// dashboard can't advertise unplayable missions or conflicting skill numbers.
//
// `PREMIUM` is gone too. It was a "Go Premium / Upgrade Now" card selling
// premium incidents, exclusive rewards and advanced analytics — none of which
// exist, behind a button with no handler. Same reasoning that removed the
// theme toggle and the three fake leaderboard scopes: a control nothing can
// honour is worse than no control.
