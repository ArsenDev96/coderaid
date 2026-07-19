import type { LucideIcon } from "lucide-react";

export type NavLink = {
  label: string;
  href: string;
};

/* `GameStat` was removed with `GAME_STATS` — it only ever typed a fabricated
   player's XP, streak and rank. Player-facing figures come from the
   progression ledger (`lib/progress.ts`) and are typed there. */

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
  /** Authoritative lower XP bound. `xpRange` is display only. */
  minXp: number;
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
  | "cyan"
  /** Muted treatment used by roadmap tiles that are not yet available. */
  | "slate";

/* The marketing `Skill` type (name + progress + level + missions) is gone too.
   It described a skill as a static tile with a level baked in; the real one is
   `Skill` in `lib/skills.ts`, where level and XP are resolved per player. The
   landing grid uses `LandingSkill` below, which carries no progress at all. */

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
