import type { LucideIcon } from "lucide-react";

export type NavLink = {
  label: string;
  href: string;
};

export type GameStat = {
  label: string;
  value: string;
  icon: LucideIcon;
  accent: "violet" | "electric";
};

export type HowItWorksStep = {
  step: number;
  title: string;
  description: string;
  icon: LucideIcon;
};

export type RankState = "unlocked" | "current" | "locked";

export type CareerRank = {
  name: string;
  levelRange: string;
  xpRange: string;
  state: RankState;
  icon: LucideIcon;
};

export type SkillColor =
  | "amber"
  | "emerald"
  | "electric"
  | "fuchsia"
  | "orange"
  | "cyan";

export type Skill = {
  name: string;
  icon: LucideIcon;
  progress: number; // 0 - 100 (drives the bar)
  level: number;
  missions: number;
  color: SkillColor;
};

export type Benefit = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export type TechTag = {
  label: string;
};
