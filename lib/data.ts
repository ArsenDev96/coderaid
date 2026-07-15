import {
  Activity,
  Award,
  Braces,
  Brain,
  Bug,
  Code2,
  Crosshair,
  Crown,
  Database,
  Flag,
  Flame,
  GitBranch,
  Gauge,
  GraduationCap,
  Hexagon,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  Wrench,
  Zap,
} from "lucide-react";
import type {
  Benefit,
  CareerRank,
  FlowStep,
  GameStat,
  HeroHighlight,
  HowItWorksStep,
  LandingSkill,
  NavLink,
  RankAccent,
  Skill,
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
    label: "Real production incidents",
    icon: Crosshair,
    accent: "text-violet-300",
  },
  { label: "Hands-on problem solving", icon: Code2, accent: "text-electric-300" },
  {
    label: "Improve skills while you play",
    icon: TrendingUp,
    accent: "text-emerald-300",
  },
];

/* --------------------- Not Another Coding Quiz --------------------------- */

export const TRADITIONAL_TRAITS: string[] = [
  "Isolated questions",
  "One correct answer",
  "Syntax focused",
];

export const CODERAID_FLOW: FlowStep[] = [
  { label: "Incident Occurs", icon: Crosshair },
  { label: "Gather Evidence", icon: Search },
  { label: "Diagnose Root Cause", icon: Brain },
  { label: "Apply Fix", icon: Wrench },
  { label: "Verify & See Impact", icon: ShieldCheck },
];

export const GAME_STATS: GameStat[] = [
  { label: "XP Earned", value: "12,450", icon: Zap, accent: "violet" },
  { label: "Missions Completed", value: "24", icon: Trophy, accent: "electric" },
  {
    label: "Current Rank",
    value: "Junior Engineer",
    icon: Award,
    accent: "violet",
  },
  { label: "Day Streak", value: "7", icon: Flame, accent: "electric" },
];

export const HOW_IT_WORKS: HowItWorksStep[] = [
  {
    step: 1,
    title: "Receive Mission",
    description: "Get a real-world incident from production.",
    icon: Flag,
  },
  {
    step: 2,
    title: "Investigate",
    description: "Explore code, logs, metrics and databases.",
    icon: Search,
  },
  {
    step: 3,
    title: "Diagnose",
    description: "Find the root cause behind the issue.",
    icon: Brain,
  },
  {
    step: 4,
    title: "Apply Fix",
    description: "Implement the best fix and improve the system.",
    icon: Wrench,
  },
  {
    step: 5,
    title: "Verify & Earn XP",
    description: "Run tests, see the impact and earn XP.",
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

export const CAREER_RANKS: CareerRank[] = [
  { name: "Intern", xpRange: "0 – 499 XP", stars: 1, icon: Star, accent: "slate" },
  {
    name: "Junior",
    xpRange: "500 – 2,999 XP",
    stars: 1,
    icon: Star,
    accent: "violet",
  },
  {
    name: "Mid-Level",
    xpRange: "3,000 – 9,999 XP",
    stars: 2,
    icon: Star,
    accent: "electric",
  },
  {
    name: "Senior",
    xpRange: "10,000 – 24,999 XP",
    stars: 3,
    icon: Star,
    accent: "emerald",
  },
  {
    name: "Tech Lead",
    xpRange: "25,000 – 49,999 XP",
    stars: 0,
    icon: Crown,
    accent: "amber",
  },
  {
    name: "Architect",
    xpRange: "50,000+ XP",
    stars: 0,
    icon: Crown,
    accent: "fuchsia",
  },
];

export const SKILLS: Skill[] = [
  {
    name: "JavaScript",
    icon: Braces,
    level: 6,
    progress: 62,
    missions: 12,
    color: "amber",
  },
  {
    name: "Async Programming",
    icon: Zap,
    level: 5,
    progress: 48,
    missions: 10,
    color: "emerald",
  },
  {
    name: "SQL",
    icon: Database,
    level: 6,
    progress: 66,
    missions: 14,
    color: "electric",
  },
  {
    name: "Debugging",
    icon: Bug,
    level: 7,
    progress: 78,
    missions: 16,
    color: "fuchsia",
  },
  {
    name: "Performance",
    icon: Gauge,
    level: 5,
    progress: 52,
    missions: 9,
    color: "orange",
  },
  {
    name: "System Design",
    icon: GitBranch,
    level: 4,
    progress: 40,
    missions: 8,
    color: "cyan",
  },
];

/**
 * Marketing skill grid. Kept separate from `SKILLS`, which carries the demo
 * player's level/progress and drives the dashboard.
 */
export const LANDING_SKILLS: LandingSkill[] = [
  { name: "JavaScript Runtime", icon: Braces, color: "amber" },
  { name: "Node.js & Express", icon: Hexagon, color: "emerald" },
  { name: "SQL & Databases", icon: Database, color: "electric" },
  { name: "Debugging & Testing", icon: Bug, color: "fuchsia" },
  { name: "Performance Optimization", icon: Gauge, color: "cyan" },
  { name: "System Design", icon: Server, color: "orange" },
];

export const BENEFITS: Benefit[] = [
  {
    title: "Real Incidents",
    description:
      "Practice realistic backend incidents inspired by production systems.",
    icon: Activity,
  },
  {
    title: "Interview Readiness",
    description:
      "Improve technical reasoning and prepare for backend interviews.",
    icon: GraduationCap,
  },
  {
    title: "Game Progression",
    description:
      "Stay motivated through XP, ranks, streaks, missions, and boss fights.",
    icon: Sparkles,
  },
];
