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

export type RankAccent =
  | "slate"
  | "violet"
  | "electric"
  | "emerald"
  | "amber"
  | "fuchsia";

export type CareerRank = {
  name: string;
  xpRange: string;
  /** Pips shown inside the rank badge; crown ranks render a crown instead. */
  stars: number;
  icon: LucideIcon;
  accent: RankAccent;
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

/** Icon bullet under the hero CTAs. */
export type HeroHighlight = {
  label: string;
  icon: LucideIcon;
  accent: string;
};

/** A skill card in the marketing grid — no player progress, unlike `Skill`. */
export type LandingSkill = {
  name: string;
  icon: LucideIcon;
  color: SkillColor;
};

/** One node of the CodeRaid loop shown in the comparison section. */
export type FlowStep = {
  label: string;
  icon: LucideIcon;
};
