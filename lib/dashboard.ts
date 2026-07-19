import {
  Award,
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

// Noisy, elevated latency series for the response-time sparkline.
export const RESPONSE_SERIES =
  "0,30 12,22 24,28 36,18 48,26 60,15 72,24 84,20 96,27 108,12 120,20 132,8 144,18 156,14 168,22 180,10 192,19 204,13 216,24 228,16 240,26";

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

/* ------------------------------- Premium -------------------------------- */

export const PREMIUM = {
  title: "Go Premium",
  blurb:
    "Unlock premium Node.js incidents, exclusive rewards and advanced analytics.",
  cta: "Upgrade Now",
  icon: Award,
};
