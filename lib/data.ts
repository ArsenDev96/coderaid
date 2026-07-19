import {
  Activity,
  Brain,
  Bug,
  Cloud,
  Code2,
  Crosshair,
  Crown,
  Database,
  Flag,
  GitBranch,
  Gauge,
  GraduationCap,
  Hexagon,
  Layers,
  Network,
  Repeat,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Wrench,
  Zap,
} from "lucide-react";
import type {
  Benefit,
  CareerRank,
  FlowStep,
  HeroHighlight,
  HowItWorksStep,
  LandingSkill,
  NavLink,
  RankAccent,
  SkillColor,
} from "./types";

// Per-skill accent classes: icon color + progress-bar gradient.
export const SKILL_COLORS: Record<SkillColor, { icon: string; bar: string }> = {
  amber: { icon: "text-amber-300", bar: "from-amber-500 to-amber-300" },
  emerald: { icon: "text-emerald-300", bar: "from-emerald-500 to-emerald-300" },
  electric: { icon: "text-electric-300", bar: "from-electric-500 to-electric-300" },
  fuchsia: { icon: "text-fuchsia-300", bar: "from-fuchsia-500 to-fuchsia-300" },
  orange: { icon: "text-orange-300", bar: "from-orange-500 to-orange-300" },
  cyan: { icon: "text-cyan-300", bar: "from-cyan-500 to-cyan-300" },
  slate: { icon: "text-slate-400", bar: "from-slate-600 to-slate-500" },
};

export const NAV_LINKS: NavLink[] = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Mission Preview", href: "#mission" },
  { label: "Skills", href: "#skills" },
  { label: "Career Path", href: "#career" },
  { label: "Pricing", href: "#pricing" },
];

export const HERO_HIGHLIGHTS: HeroHighlight[] = [
  {
    label: "Realistic Node.js incidents",
    icon: Crosshair,
    accent: "text-violet-300",
  },
  { label: "Logs, metrics, traces and code", icon: Code2, accent: "text-electric-300" },
  {
    label: "Backend interview preparation",
    icon: TrendingUp,
    accent: "text-emerald-300",
  },
];

/* --------------------- Not Another Coding Quiz --------------------------- */

export const TRADITIONAL_TRAITS: string[] = [
  "Isolated coding questions",
  "Syntax and memorization",
  "One obvious correct answer",
  "Little production context",
];

/** What CodeRaid does instead — paired against `TRADITIONAL_TRAITS`. */
export const CODERAID_TRAITS: string[] = [
  "Realistic Node.js incidents",
  "Logs, metrics, traces and code",
  "Root-cause analysis",
  "Fix validation and engineering feedback",
];

export const CODERAID_FLOW: FlowStep[] = [
  { label: "Incident Occurs", icon: Crosshair },
  { label: "Investigate Evidence", icon: Search },
  { label: "Diagnose Root Cause", icon: Brain },
  { label: "Apply a Fix", icon: Wrench },
  { label: "Verify the Result", icon: ShieldCheck },
];

/* `GAME_STATS` is gone. It was an unrendered fixture describing a player who
   never existed — 4,350 XP, 4 incidents resolved, a 7-day streak. Every one of
   those figures now comes from the progression ledger in `lib/progress.ts`,
   where it can only say what the player actually earned. */

export const HOW_IT_WORKS: HowItWorksStep[] = [
  {
    step: 1,
    title: "Incident Occurs",
    description: "A Node.js service starts failing in production.",
    icon: Flag,
  },
  {
    step: 2,
    title: "Investigate Evidence",
    description: "Read logs, metrics, traces and the backend code.",
    icon: Search,
  },
  {
    step: 3,
    title: "Diagnose Root Cause",
    description: "Decide what actually broke, and prove it with evidence.",
    icon: Brain,
  },
  {
    step: 4,
    title: "Apply a Fix",
    description: "Choose the change a backend engineer would ship.",
    icon: Wrench,
  },
  {
    step: 5,
    title: "Verify the Result",
    description: "Re-run the service, compare before and after, earn XP.",
    icon: ShieldCheck,
  },
];

// Per-rank badge accent: hexagon fill/border + label color.
export const RANK_ACCENTS: Record<
  RankAccent,
  { badge: string; name: string; star: string }
> = {
  slate: {
    badge: "from-slate-700/60 to-slate-800/60 border-slate-600/50",
    name: "text-slate-300",
    star: "text-slate-400",
  },
  violet: {
    badge: "from-violet-600/50 to-violet-800/40 border-violet-400/50",
    name: "text-violet-300",
    star: "text-violet-200",
  },
  electric: {
    badge: "from-electric-500/40 to-electric-600/30 border-electric-400/50",
    name: "text-electric-300",
    star: "text-electric-200",
  },
  emerald: {
    badge: "from-emerald-500/40 to-emerald-700/30 border-emerald-400/50",
    name: "text-emerald-300",
    star: "text-emerald-200",
  },
  amber: {
    badge: "from-amber-500/40 to-amber-700/30 border-amber-400/50",
    name: "text-amber-300",
    star: "text-amber-200",
  },
  fuchsia: {
    badge: "from-fuchsia-500/40 to-fuchsia-700/30 border-fuchsia-400/50",
    name: "text-fuchsia-300",
    star: "text-fuchsia-200",
  },
};

/**
 * Node.js learning progression. `minXp` is the authoritative threshold —
 * `xpRange` is display only, so nothing has to parse a label to get a number.
 */
export const CAREER_RANKS: CareerRank[] = [
  {
    name: "Node.js Explorer",
    minXp: 0,
    xpRange: "0 – 499 XP",
    stars: 1,
    icon: Star,
    accent: "slate",
  },
  {
    name: "Backend Apprentice",
    minXp: 500,
    xpRange: "500 – 2,999 XP",
    stars: 1,
    icon: Star,
    accent: "violet",
  },
  {
    name: "Node.js Developer",
    minXp: 3000,
    xpRange: "3,000 – 9,999 XP",
    stars: 2,
    icon: Star,
    accent: "electric",
  },
  {
    name: "Backend Engineer",
    minXp: 10000,
    xpRange: "10,000 – 24,999 XP",
    stars: 3,
    icon: Star,
    accent: "emerald",
  },
  {
    name: "Production Debugger",
    minXp: 25000,
    xpRange: "25,000 – 49,999 XP",
    stars: 0,
    icon: Crown,
    accent: "amber",
  },
  {
    name: "Node.js Specialist",
    minXp: 50000,
    xpRange: "50,000+ XP",
    stars: 0,
    icon: Crown,
    accent: "fuchsia",
  },
];

/** Minimum XP for a rank by name — 0 when the name isn't a known rank. */
export function rankMinXp(name: string): number {
  return CAREER_RANKS.find((r) => r.name === name)?.minXp ?? 0;
}

/**
 * Marketing skill grid — the Node.js MVP tracks that are live today.
 * Player-facing progress lives in `lib/skills.ts`, which is canonical.
 */
export const LANDING_SKILLS: LandingSkill[] = [
  { name: "Async JavaScript", icon: Repeat, color: "fuchsia" },
  { name: "Node.js Runtime", icon: Hexagon, color: "emerald" },
  { name: "Event Loop", icon: Zap, color: "amber" },
  { name: "Error Handling", icon: ShieldCheck, color: "fuchsia" },
  { name: "API Performance", icon: Gauge, color: "electric" },
  { name: "Background Jobs", icon: Server, color: "cyan" },
  { name: "Debugging", icon: Bug, color: "orange" },
  { name: "Concurrency", icon: GitBranch, color: "emerald" },
];

/**
 * Roadmap tiles rendered muted under the live skills. Deliberately a separate
 * array so nothing can render them as available or make them clickable.
 */
export const FUTURE_SKILL_TRACKS: LandingSkill[] = [
  { name: "SQL and Databases", icon: Database, color: "slate" },
  { name: "Redis and Caching", icon: Layers, color: "slate" },
  { name: "System Design", icon: Network, color: "slate" },
  { name: "Cloud Reliability", icon: Cloud, color: "slate" },
];

export const BENEFITS: Benefit[] = [
  {
    title: "Realistic Node.js Incidents",
    description:
      "Debug backend failures modelled on real production Node.js services.",
    icon: Activity,
  },
  {
    title: "Interview Readiness",
    description:
      "Practise the reasoning practical Node.js and backend interviews ask for.",
    icon: GraduationCap,
  },
  {
    title: "Game Progression",
    description:
      "Stay motivated through XP, ranks, streaks and mission chapters.",
    icon: Sparkles,
  },
];
