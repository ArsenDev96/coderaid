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
import { MISSIONS, resolveBriefing, type Mission } from "./missions";
import {
  EMPTY_LEDGER,
  bestScore,
  completedMissionIds,
  streakDays,
  type Ledger,
} from "./progress";
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

/**
 * A production incident, as opposed to a fundamentals exercise: anything the
 * briefing rates above "low" severity.
 */
function isProductionIncident(mission: Mission): boolean {
  return resolveBriefing(mission).severity !== "low";
}

/* ------------------------------ Definitions ----------------------------- */

type AchievementDef = Omit<Achievement, "progress" | "unlocked"> & {
  /** Raw progress, measured from live sources. Clamped to `target` on read. */
  measure: (s: AchievementSources) => number;
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
    measure: (s) => s.skillLevel("event-loop"),
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
): Achievement[] {
  return DEFS.map(({ measure, ...def }) => {
    const progress = Math.min(measure(sources), def.target);
    const unlocked = progress >= def.target;
    return {
      ...def,
      progress,
      unlocked,
      // The recorded crossing time, if this achievement has actually crossed.
      unlockedAt: unlocked ? unlockTimes[def.id] : undefined,
    };
  });
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
 * both sit at the top.
 */
export function sortAchievements(list: Achievement[]): Achievement[] {
  return [...list].sort((a, b) => {
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

/** The locked achievement closest to completion — never one already earned. */
export function nextToUnlock(list: Achievement[]): Achievement | undefined {
  return list
    .filter((a) => !a.unlocked)
    .sort((a, b) => completionRatio(b) - completionRatio(a))[0];
}

export function achievementSummary(list: Achievement[]) {
  const unlocked = list.filter((a) => a.unlocked);
  return {
    unlocked: unlocked.length,
    total: list.length,
    pct: list.length ? Math.round((unlocked.length / list.length) * 100) : 0,
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
