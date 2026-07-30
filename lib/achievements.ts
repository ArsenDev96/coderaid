import {
  Activity,
  Bug,
  CalendarCheck,
  Flag,
  Flame,
  Medal,
  Repeat,
  ShieldAlert,
  Target,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { rankMinXp } from "./data";
import { PERFECT_SCORE } from "./grading";
import { MISSIONS, type Mission } from "./missions";
import {
  EMPTY_LEDGER,
  bestScore,
  completedMissionIds,
  streakDays,
  type Ledger,
} from "./progress";
import {
  catalogueReach,
  isProductionIncident,
  type CatalogueReach,
} from "./reach";
import { skillLevel } from "./skills";

/* -------------------------------- Types --------------------------------- */

export type AchievementCategory =
  | "mission-progress"
  | "technical-skills"
  | "consistency"
  | "quality"
  | "special";

export type Achievement = {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  progress: number;
  target: number;
  unlocked: boolean;
  /** ISO date (YYYY-MM-DD). Only present once the achievement is unlocked. */
  unlockedAt?: string;
  /** A key into `ACHIEVEMENT_ICONS` — resolved to a Lucide icon for rendering. */
  icon?: string;
  /** Badge accent; ignored while locked, which always renders muted. */
  tone: AchievementTone;
  /** Where to go to make progress. Only points at routes that exist. */
  link?: { href: string; label: string };
  /** How the requirement reads on a locked card. */
  requirement: string;
  /**
   * True when no amount of play on the *authored catalogue* could unlock this —
   * the target needs content that has not been written. Derived from
   * `catalogueReach()`, never authored, so writing the missions that fund it
   * clears the flag on its own.
   *
   * A roadmap achievement is rendered as roadmap rather than as a locked goal,
   * and is excluded from the unlocked-of-total figure and from "next to
   * unlock" — counting a goal nobody can reach against the player would make
   * 100% impossible and would hand out advice they cannot act on.
   */
  roadmap: boolean;
};

export type AchievementTone = "violet" | "electric" | "emerald" | "amber" | "slate";

/* ------------------------------ Categories ------------------------------ */

export const ACHIEVEMENT_CATEGORIES: {
  id: AchievementCategory;
  label: string;
}[] = [
  { id: "mission-progress", label: "Mission Progress" },
  { id: "technical-skills", label: "Technical Skills" },
  { id: "consistency", label: "Consistency" },
  { id: "quality", label: "Quality" },
  { id: "special", label: "Special" },
];

export const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  flag: Flag,
  medal: Medal,
  bug: Bug,
  eventLoop: Activity,
  repeat: Repeat,
  target: Target,
  trophy: Trophy,
  flame: Flame,
  calendar: CalendarCheck,
  incident: ShieldAlert,
  rank: Zap,
};

/* ------------------------------- Sources -------------------------------- */

/**
 * Everything an achievement is allowed to measure. Achievements never store
 * their own state — they read these, so a value can only ever be as unlocked as
 * the underlying progress. That also makes unlocking idempotent by
 * construction: re-deriving after a refresh re-computes the same answer.
 */
export type AchievementSources = {
  /** Missions run to the end, whatever the outcome. */
  completedMissions: Mission[];
  /** Missions whose applied fix actually resolved the incident. */
  resolvedMissions: Mission[];
  /** Resolved runs where no hint was opened. */
  hintFreeResolved: number;
  streakDays: number;
  totalXp: number;
  /** Best score across the player's graded runs. */
  bestScore: number;
  /** Level for a skill id, from the canonical Node.js skill taxonomy. */
  skillLevel: (skillId: string) => number;
};

/**
 * Progress as the rest of the app knows it — read straight off the progression
 * ledger. Completed missions, streak, XP, best score and skill levels are all
 * things the player earned; none of them is authored anywhere.
 */
export function achievementSources(
  ledger: Ledger = EMPTY_LEDGER,
): AchievementSources {
  const completed = new Set(completedMissionIds(ledger));
  const resolved = new Set(
    Object.values(ledger.missions)
      .filter((r) => r.resolved)
      .map((r) => r.missionId),
  );

  return {
    completedMissions: MISSIONS.filter((m) => completed.has(m.id)),
    resolvedMissions: MISSIONS.filter((m) => resolved.has(m.id)),
    hintFreeResolved: Object.values(ledger.missions).filter(
      (r) => r.resolved && r.hintsUsed === 0,
    ).length,
    streakDays: streakDays(ledger),
    totalXp: ledger.totalXp,
    bestScore: bestScore(ledger),
    skillLevel: (skillId: string) => skillLevel(skillId, ledger),
  };
}

/* ------------------------------ Thresholds ------------------------------ */

/** The level at which a skill reads as "Advanced" on the Skills page. */
const ADVANCED_LEVEL = 7;

/* ------------------------------ Definitions ----------------------------- */

type AchievementDef = Omit<Achievement, "progress" | "unlocked" | "roadmap"> & {
  /** Raw progress, measured from live sources. Clamped to `target` on read. */
  measure: (s: AchievementSources) => number;
  /**
   * The highest value `measure` could *ever* report on the authored catalogue.
   * Compared against `target` to decide whether this achievement is reachable
   * at all. Omit only for a measure the catalogue cannot bound — a streak is
   * limited by the player's own days, not by how many missions exist.
   */
  reach?: (r: CatalogueReach) => number;
};

// No unlock dates are authored here. When a threshold was crossed is a fact
// about the player, so it is stamped onto the ledger the moment derivation
// first reports the achievement as unlocked, and read back in via `unlockedAt`.
const DEFS: AchievementDef[] = [
  /* ------------------------- Mission progress ------------------------- */
  {
    id: "first-mission",
    title: "First Incident Resolved",
    description: "Diagnose and fix your first Node.js incident.",
    requirement: "Resolve 1 incident",
    category: "mission-progress",
    icon: "flag",
    tone: "violet",
    target: 1,
    link: { href: "/missions", label: "View missions" },
    measure: (s) => s.resolvedMissions.length,
    reach: (r) => r.playableMissions,
  },
  {
    id: "ten-missions",
    title: "10 Incidents Resolved",
    description: "Work 10 Node.js missions through to a verified fix.",
    requirement: "Resolve 10 incidents",
    category: "mission-progress",
    icon: "medal",
    tone: "electric",
    target: 10,
    link: { href: "/missions", label: "View missions" },
    measure: (s) => s.resolvedMissions.length,
    reach: (r) => r.playableMissions,
  },
  {
    id: "chapter-one-cleared",
    title: "Async JavaScript Cleared",
    description:
      "Complete every mission in Chapter 1 — the event loop, promises and async control flow.",
    requirement: "Complete all Chapter 1: Async JavaScript missions",
    category: "mission-progress",
    icon: "trophy",
    tone: "violet",
    target: MISSIONS.filter((m) => m.chapterId === 1).length,
    link: { href: "/missions/map", label: "Open mission map" },
    measure: (s) => s.resolvedMissions.filter((m) => m.chapterId === 1).length,
    reach: (r) => r.playableInChapter(1),
  },

  /* ------------------------- Technical skills ------------------------- */
  {
    id: "debugging-specialist",
    title: "Root-Cause Specialist",
    description: "Reach Advanced level in Root-Cause Analysis.",
    requirement: `Reach Root-Cause Analysis level ${ADVANCED_LEVEL}`,
    category: "technical-skills",
    icon: "bug",
    tone: "electric",
    target: ADVANCED_LEVEL,
    link: { href: "/skills", label: "View skills" },
    measure: (s) => s.skillLevel("root-cause-analysis"),
    reach: (r) => r.skillLevelCeiling("root-cause-analysis"),
  },
  {
    id: "event-loop-master",
    title: "Event Loop Master",
    description: "Reach Advanced level in Event Loop.",
    requirement: `Reach Event Loop level ${ADVANCED_LEVEL}`,
    category: "technical-skills",
    icon: "eventLoop",
    tone: "emerald",
    target: ADVANCED_LEVEL,
    link: { href: "/skills", label: "View skills" },
    // Roadmap at MVP volume: `event-loop-overload` is the only authored mission
    // that builds this skill, so it tops out at level 2 against a target of 7.
    measure: (s) => s.skillLevel("event-loop"),
    reach: (r) => r.skillLevelCeiling("event-loop"),
  },
  {
    id: "async-expert",
    title: "Async Expert",
    description: "Reach Advanced level in Async JavaScript.",
    requirement: `Reach Async JavaScript level ${ADVANCED_LEVEL}`,
    category: "technical-skills",
    icon: "repeat",
    tone: "amber",
    target: ADVANCED_LEVEL,
    link: { href: "/skills", label: "View skills" },
    measure: (s) => s.skillLevel("async-javascript"),
    reach: (r) => r.skillLevelCeiling("async-javascript"),
  },

  /* --------------------------- Consistency ---------------------------- */
  {
    id: "seven-day-streak",
    title: "7-Day Streak",
    description: "Debug Node.js missions 7 days in a row.",
    requirement: "Reach a 7-day streak",
    category: "consistency",
    icon: "flame",
    tone: "amber",
    target: 7,
    link: { href: "/dashboard", label: "Open dashboard" },
    measure: (s) => s.streakDays,
  },
  {
    id: "thirty-day-streak",
    title: "30-Day Streak",
    description: "Debug Node.js missions 30 days in a row.",
    requirement: "Reach a 30-day streak",
    category: "consistency",
    icon: "calendar",
    tone: "violet",
    target: 30,
    link: { href: "/dashboard", label: "Open dashboard" },
    measure: (s) => s.streakDays,
  },

  /* ----------------------------- Quality ------------------------------ */
  {
    id: "perfect-diagnosis",
    title: "Perfect Diagnosis",
    description: "Land the exact root cause and fix on a mission — 100%.",
    requirement: "Score 100 on any mission",
    category: "quality",
    icon: "target",
    tone: "violet",
    target: 100,
    link: { href: "/missions", label: "View missions" },
    measure: (s) => s.bestScore,
    // Any single playable mission can be scored perfectly.
    reach: (r) => (r.playableMissions > 0 ? PERFECT_SCORE : 0),
  },
  {
    id: "zero-hints-used",
    title: "Unassisted Debugger",
    description: "Resolve 5 incidents without opening a single hint.",
    requirement: "Complete 5 missions hint-free",
    category: "quality",
    icon: "trophy",
    tone: "electric",
    target: 5,
    link: { href: "/missions", label: "View missions" },
    // Hint usage is recorded per run, so this now measures what it claims:
    // incidents resolved without a single hint opened.
    measure: (s) => s.hintFreeResolved,
    reach: (r) => r.playableMissions,
  },

  /* ----------------------------- Special ------------------------------ */
  {
    id: "production-incident-master",
    title: "On-Call Veteran",
    description:
      "Resolve 10 missions the briefing rates above low severity — real production pressure.",
    requirement: "Resolve 10 higher-severity incidents",
    category: "special",
    icon: "incident",
    tone: "slate",
    target: 10,
    link: { href: "/missions", label: "View missions" },
    measure: (s) => s.resolvedMissions.filter(isProductionIncident).length,
    reach: (r) => r.productionIncidents,
  },
  {
    id: "backend-engineer-rank",
    title: "Backend Engineer Rank",
    description: "Reach the Backend Engineer rank on the Node.js ladder.",
    requirement: `Earn ${rankMinXp("Backend Engineer").toLocaleString("en-US")} XP`,
    category: "special",
    icon: "rank",
    tone: "slate",
    target: rankMinXp("Backend Engineer"),
    link: { href: "/dashboard", label: "View career progress" },
    measure: (s) => s.totalXp,
    // Roadmap at MVP volume: the whole catalogue is worth 1,830 XP against a
    // 10,000 XP rank, so this needs Chapters 4 and 5 before it means anything.
    reach: (r) => r.xpCeiling,
  },
];

/* ------------------------------- Derivation ------------------------------ */

/**
 * Every achievement, with progress and unlock state measured from the sources.
 * Pure: the same progress always derives the same result, so a refresh can't
 * unlock anything twice.
 */
export function getAchievements(
  sources: AchievementSources = achievementSources(),
  unlockTimes: Record<string, string> = {},
  reach: CatalogueReach = catalogueReach(),
): Achievement[] {
  return DEFS.map(({ measure, reach: reachOf, ...def }) => {
    const progress = Math.min(measure(sources), def.target);
    const unlocked = progress >= def.target;
    return {
      ...def,
      progress,
      unlocked,
      // The recorded crossing time, if this achievement has actually crossed.
      unlockedAt: unlocked ? unlockTimes[def.id] : undefined,
      // Reachability is a fact about the catalogue, not about the player, so it
      // is measured here rather than authored on the definition.
      roadmap: reachOf ? reachOf(reach) < def.target : false,
    };
  });
}

/** The achievements the authored catalogue can actually award. */
export function earnable(list: Achievement[]): Achievement[] {
  return list.filter((a) => !a.roadmap);
}

/** Ids of everything currently unlocked — what the ledger stamps times for. */
export function unlockedIds(list: Achievement[]): string[] {
  return list.filter((a) => a.unlocked).map((a) => a.id);
}

export function completionRatio(a: Achievement): number {
  return a.target === 0 ? 0 : a.progress / a.target;
}

/**
 * Display order: unlocked first (most recently earned first), then locked by
 * how close they are — so what you just earned and what you're about to earn
 * both sit at the top. Roadmap goals sort last whatever their ratio: they are
 * not something the player is "close to", however full their bar looks.
 */
export function sortAchievements(list: Achievement[]): Achievement[] {
  return [...list].sort((a, b) => {
    if (a.roadmap !== b.roadmap) return a.roadmap ? 1 : -1;
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    if (a.unlocked) return (b.unlockedAt ?? "").localeCompare(a.unlockedAt ?? "");
    return completionRatio(b) - completionRatio(a);
  });
}

/** The most recently unlocked achievement, by unlock date. */
export function latestAchievement(list: Achievement[]): Achievement | undefined {
  return list
    .filter((a) => a.unlocked && a.unlockedAt)
    .sort((a, b) => (b.unlockedAt ?? "").localeCompare(a.unlockedAt ?? ""))[0];
}

/**
 * The locked achievement closest to completion — never one already earned, and
 * never a roadmap goal. "Event Loop Master, 2 of 7" would read as the nearest
 * thing to earn while being the one thing no play can deliver.
 */
export function nextToUnlock(list: Achievement[]): Achievement | undefined {
  return earnable(list)
    .filter((a) => !a.unlocked)
    .sort((a, b) => completionRatio(b) - completionRatio(a))[0];
}

/**
 * The unlocked-of-total figure, over what the catalogue can actually award.
 * Roadmap goals are excluded from both halves, so a player who earns everything
 * earnable sees 100% instead of a ceiling they cannot explain. `roadmap` counts
 * them separately, for a UI that wants to say how many are still to come.
 */
export function achievementSummary(list: Achievement[]) {
  const earnableList = earnable(list);
  const unlocked = earnableList.filter((a) => a.unlocked);
  return {
    unlocked: unlocked.length,
    total: earnableList.length,
    roadmap: list.length - earnableList.length,
    pct: earnableList.length
      ? Math.round((unlocked.length / earnableList.length) * 100)
      : 0,
  };
}

/* ------------------------------- Formatting ------------------------------ */

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Formats an authored ISO date without going through `Date`, which would apply
 * a timezone and could render differently on the server than in the browser.
 */
export function formatUnlockDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

/* -------------------------------- Styling -------------------------------- */

export const TONE_STYLES: Record<
  AchievementTone,
  { badge: string; icon: string; bar: string; glow: string }
> = {
  violet: {
    badge: "border-violet-400/50 bg-violet-500/[0.12]",
    icon: "text-violet-300",
    bar: "from-violet-500 to-violet-400",
    glow: "shadow-[0_0_36px_-10px_rgba(139,92,246,0.6)]",
  },
  electric: {
    badge: "border-electric-400/50 bg-electric-500/[0.12]",
    icon: "text-electric-300",
    bar: "from-electric-500 to-electric-400",
    glow: "shadow-[0_0_36px_-10px_rgba(56,189,248,0.6)]",
  },
  emerald: {
    badge: "border-emerald-400/50 bg-emerald-500/[0.12]",
    icon: "text-emerald-300",
    bar: "from-emerald-500 to-emerald-400",
    glow: "shadow-[0_0_36px_-10px_rgba(52,211,153,0.6)]",
  },
  amber: {
    badge: "border-amber-400/50 bg-amber-500/[0.12]",
    icon: "text-amber-300",
    bar: "from-amber-500 to-amber-400",
    glow: "shadow-[0_0_36px_-10px_rgba(251,191,36,0.6)]",
  },
  slate: {
    badge: "border-slate-300/40 bg-slate-400/[0.10]",
    icon: "text-slate-300",
    bar: "from-slate-400 to-slate-300",
    glow: "shadow-[0_0_36px_-10px_rgba(203,213,225,0.5)]",
  },
};

/** Locked badges are muted regardless of their tone. */
export const LOCKED_ICON = "text-slate-600";
