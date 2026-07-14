import {
  Activity,
  Award,
  Braces,
  Bug,
  Crown,
  Database,
  Flame,
  GitBranch,
  Gauge,
  GraduationCap,
  Layers,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trophy,
  Wrench,
  Zap,
} from "lucide-react";
import type {
  Benefit,
  CareerRank,
  GameStat,
  HowItWorksStep,
  NavLink,
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
  { label: "Missions", href: "#mission" },
  { label: "Career Path", href: "#career" },
  { label: "Skills", href: "#skills" },
  { label: "Pricing", href: "#pricing" },
];

export const TECH_TAGS: string[] = [
  "JavaScript",
  "Node.js",
  "Backend",
  "Debugging",
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
    title: "Get the Mission",
    description:
      "Receive a realistic production incident or coding challenge.",
    icon: Terminal,
  },
  {
    step: 2,
    title: "Investigate",
    description:
      "Inspect logs, metrics, traces, code, and database activity.",
    icon: Search,
  },
  {
    step: 3,
    title: "Apply the Fix",
    description: "Choose or implement the best technical solution.",
    icon: Wrench,
  },
  {
    step: 4,
    title: "Level Up",
    description:
      "Earn XP, unlock skills, and advance your engineering rank.",
    icon: Rocket,
  },
];

export const CAREER_RANKS: CareerRank[] = [
  {
    name: "Intern Engineer",
    levelRange: "Lv. 1–4",
    xpRange: "0 – 999 XP",
    state: "unlocked",
    icon: GraduationCap,
  },
  {
    name: "Junior Backend Engineer",
    levelRange: "Lv. 5–14",
    xpRange: "1,000 – 4,999 XP",
    state: "current",
    icon: Braces,
  },
  {
    name: "Mid-Level Engineer",
    levelRange: "Lv. 15–29",
    xpRange: "5,000 – 14,999 XP",
    state: "locked",
    icon: Layers,
  },
  {
    name: "Senior Engineer",
    levelRange: "Lv. 30–49",
    xpRange: "15,000 – 29,999 XP",
    state: "locked",
    icon: ShieldCheck,
  },
  {
    name: "Tech Lead",
    levelRange: "Lv. 50+",
    xpRange: "30,000+ XP",
    state: "locked",
    icon: Crown,
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
