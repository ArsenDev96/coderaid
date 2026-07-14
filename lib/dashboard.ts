import {
  Award,
  Bug,
  Database,
  Flag,
  Home,
  LayoutGrid,
  Lock,
  type LucideIcon,
  Settings,
  Trophy,
  Waypoints,
} from "lucide-react";

/* ------------------------------- Player -------------------------------- */

export type Player = {
  name: string;
  rank: string;
  level: number;
  xpIntoLevel: number;
  xpForLevel: number;
  levelPct: number;
  totalXp: number;
  streakDays: number;
  xpToNext: number;
  nextLevel: number;
};

// Demo profile — overridden by the onboarding localStorage draft where present.
export const DEMO_PLAYER: Player = {
  name: "ArsDev",
  rank: "Junior Engineer",
  level: 7,
  xpIntoLevel: 4350,
  xpForLevel: 5000,
  levelPct: 87,
  totalXp: 4350,
  streakDays: 7,
  xpToNext: 650,
  nextLevel: 8,
};

/* ------------------------------ Navigation ------------------------------ */

export type SidebarItem = { label: string; icon: LucideIcon; href?: string };

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { label: "Dashboard", icon: Home, href: "/dashboard" },
  { label: "Missions", icon: Flag, href: "/missions" },
  { label: "Career Path", icon: Waypoints },
  { label: "Skills", icon: LayoutGrid },
  { label: "Leaderboards", icon: Trophy },
  { label: "Achievements", icon: Award },
  { label: "Settings", icon: Settings },
];

/* --------------------------- Current mission ---------------------------- */

export const CURRENT_MISSION = {
  id: "slow-api-incident",
  title: "The Slow API Incident",
  severity: "High Severity",
  description:
    "Users are experiencing slow responses when fetching orders. Investigate and fix the issue.",
  tags: ["JavaScript", "Node.js", "PostgreSQL"],
  progressDone: 3,
  progressTotal: 7,
};

/* ------------------------------ Daily raid ------------------------------ */

export const DAILY_RAID = {
  title: "Log Analyzer",
  timeLeft: "23:45:12 left",
  description: "Find the error in the logs and get bonus XP!",
  rewards: { xp: 150, stars: 75, energy: 10 },
};

/* --------------------------- Recommended list --------------------------- */

export type RecommendedMission = {
  id: string;
  title: string;
  difficulty: "Low" | "Medium" | "High";
  xp: number;
  icon: LucideIcon;
  accent: "emerald" | "electric" | "slate";
  locked?: boolean;
};

export const RECOMMENDED_MISSIONS: RecommendedMission[] = [
  {
    id: "memory-leak-worker",
    title: "Memory Leak in Worker Service",
    difficulty: "Medium",
    xp: 250,
    icon: Bug,
    accent: "emerald",
  },
  {
    id: "n-plus-one-order-history",
    title: "N+1 Query in Order History",
    difficulty: "Medium",
    xp: 250,
    icon: Database,
    accent: "electric",
  },
  {
    id: "payment-timeout-errors",
    title: "Payment Timeout Errors",
    difficulty: "Low",
    xp: 200,
    icon: Lock,
    accent: "slate",
    locked: true,
  },
];

/* ------------------------------- Up next -------------------------------- */

export const UP_NEXT = {
  title: "Caching Gone Wrong",
  difficulty: "Medium",
  description: "Responses are inconsistent due to incorrect cache invalidation.",
  xp: 250,
};

/* --------------------------------- Tip ---------------------------------- */

export const DASHBOARD_TIP =
  "Consistency is the key to becoming a great engineer. Keep raiding! 🚀";
