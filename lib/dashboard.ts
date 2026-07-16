import {
  Award,
  BarChart3,
  Boxes,
  Bug,
  Crosshair,
  Database,
  Gauge,
  Home,
  Layers,
  Lock,
  type LucideIcon,
  Network,
  Settings,
  Star,
  Target,
  TestTube2,
} from "lucide-react";
import { getInvestigation } from "./investigation";
import { CURRENT_MISSION_ID, SEVERITY_BADGE, getMission, resolveBriefing } from "./missions";

/* ------------------------------- Player -------------------------------- */

export type Player = {
  name: string;
  rank: string;
  level: number;
  totalXp: number;
  streakDays: number;
};

// Demo profile — overridden by the onboarding localStorage draft where present.
export const DEMO_PLAYER: Player = {
  name: "Ars",
  rank: "Junior Engineer",
  level: 7,
  totalXp: 4350,
  streakDays: 7,
};

export const GREETING_SUBTITLE = "Let's solve some real problems.";

/* ------------------------------ Navigation ------------------------------ */

export type SidebarItem = { label: string; icon: LucideIcon; href?: string };

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { label: "Dashboard", icon: Home, href: "/dashboard" },
  { label: "Missions", icon: Target, href: "/missions" },
  { label: "Skills", icon: Layers, href: "/skills" },
  { label: "Leaderboards", icon: BarChart3 },
  { label: "Challenges", icon: Crosshair },
  { label: "Achievements", icon: Star },
  { label: "Settings", icon: Settings },
];

/* ---------------------------- Your next action -------------------------- */

export type CodeLine = { n: number; content: string; tone?: "comment" | "warn" };

/**
 * The dashboard's "continue where you left off" card. Derived from the player's
 * current mission and its investigation content, so the title, severity and
 * code preview follow whichever mission is current instead of naming one.
 */
function buildNextAction() {
  const mission = getMission(CURRENT_MISSION_ID);
  if (!mission) throw new Error(`Unknown CURRENT_MISSION_ID: ${CURRENT_MISSION_ID}`);

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
    step: 2,
    totalSteps: briefing.steps.length,
    phase: "Investigate",
    severity: SEVERITY_BADGE[briefing.severity].label,
    severityCls: SEVERITY_BADGE[briefing.severity].cls,
    headline: investigation?.summary.headline ?? {
      label: "Status",
      value: "—",
    },
    cluesFound: 2,
    // Mirrors the workspace gate, so "2 / 3" here means the same "3" there.
    cluesTotal: investigation?.requiredKeyClues ?? 5,
    estTimeLeft: "12 min",
    findings: investigation?.summary.findings ?? [],
    code,
  };
}

export const NEXT_ACTION = buildNextAction();

// Noisy, elevated latency series for the response-time sparkline.
export const RESPONSE_SERIES =
  "0,30 12,22 24,28 36,18 48,26 60,15 72,24 84,20 96,27 108,12 120,20 132,8 144,18 156,14 168,22 180,10 192,19 204,13 216,24 228,16 240,26";

/* ------------------------------ Daily raid ------------------------------ */

export const DAILY_RAID = {
  title: "Daily Raid",
  description: "Solve a quick challenge and earn extra XP every day.",
  xp: 150,
};

/* ---------------------------- Career progress --------------------------- */

export const CAREER = {
  currentRank: "Junior Engineer",
  nextRank: "Mid-Level Engineer",
  xp: 4350,
  xpMax: 10000,
  blurb: "Keep solving to reach the next rank.",
};

/* --------------------------- Recommended list --------------------------- */

export type Difficulty = "Easy" | "Medium" | "Hard";

export type RecommendedMission = {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  xp: number;
  icon: LucideIcon;
  accent: "violet" | "electric" | "emerald";
};

export const RECOMMENDED_MISSIONS: RecommendedMission[] = [
  {
    id: "db-connection-leak",
    title: "Database Connection Leak",
    description: "Identify and fix connection leak in production",
    difficulty: "Medium",
    xp: 250,
    icon: Database,
    accent: "violet",
  },
  {
    id: "cache-stampede",
    title: "Cache Stampede",
    description: "Prevent cache stampede during traffic spikes",
    difficulty: "Hard",
    xp: 300,
    icon: Lock,
    accent: "electric",
  },
  {
    id: "message-queue-failure",
    title: "Message Queue Failure",
    description: "Diagnose failed jobs and fix the backlog",
    difficulty: "Medium",
    xp: 250,
    icon: Boxes,
    accent: "emerald",
  },
];

/* ---------------------------- Skills summary ---------------------------- */

export type DashboardSkill = {
  name: string;
  icon: LucideIcon;
  level: number;
  progress: number; // 0-100, drives the bar
  xpToNext: number;
  bar: string; // gradient classes
  iconColor: string;
};

export const DASHBOARD_SKILLS: DashboardSkill[] = [
  {
    name: "Debugging",
    icon: Bug,
    level: 7,
    progress: 72,
    xpToNext: 350,
    bar: "from-violet-500 to-violet-400",
    iconColor: "text-violet-300",
  },
  {
    name: "SQL",
    icon: Database,
    level: 6,
    progress: 64,
    xpToNext: 650,
    bar: "from-electric-500 to-electric-400",
    iconColor: "text-electric-300",
  },
  {
    name: "Performance",
    icon: Gauge,
    level: 5,
    progress: 48,
    xpToNext: 800,
    bar: "from-emerald-500 to-emerald-400",
    iconColor: "text-emerald-300",
  },
  {
    name: "System Design",
    icon: Network,
    level: 5,
    progress: 44,
    xpToNext: 900,
    bar: "from-rose-500 to-rose-400",
    iconColor: "text-rose-300",
  },
  {
    name: "Testing",
    icon: TestTube2,
    level: 4,
    progress: 36,
    xpToNext: 700,
    bar: "from-amber-500 to-amber-400",
    iconColor: "text-amber-300",
  },
];

/* ------------------------------- Premium -------------------------------- */

export const PREMIUM = {
  title: "Go Premium",
  blurb: "Unlock premium missions, exclusive rewards and advanced analytics.",
  cta: "Upgrade Now",
  icon: Award,
};
