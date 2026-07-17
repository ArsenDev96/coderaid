import {
  Bug,
  CalendarCheck,
  Database,
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
import { CAREER_RANKS } from "./data";
import { DEMO_PLAYER } from "./dashboard";
import { MISSIONS, resolveBriefing, type Mission } from "./missions";
import { resultsConfigs } from "./results";
import { SKILLS } from "./skills";

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
  database: Database,
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
  completedMissions: Mission[];
  streakDays: number;
  totalXp: number;
  /** Best score across missions the player has results for. */
  bestScore: number;
  skillLevel: (skillId: string) => number;
};

function skillLevel(skillId: string): number {
  return SKILLS.find((s) => s.id === skillId)?.level ?? 0;
}

/**
 * Progress as the rest of the app knows it. `extraCompletedIds` folds in the
 * reward ledger's claimed missions (see `claimedMissionIds`) so a mission the
 * player actually finished counts here too, without a second tally.
 */
export function achievementSources(extraCompletedIds: string[] = []): AchievementSources {
  const claimed = new Set(extraCompletedIds);
  const completedMissions = MISSIONS.filter(
    (m) => m.status === "completed" || claimed.has(m.id),
  );

  const scores = Object.values(resultsConfigs)
    .filter((r) => r.status === "resolved")
    .map((r) => r.score);

  return {
    completedMissions,
    streakDays: DEMO_PLAYER.streakDays,
    totalXp: DEMO_PLAYER.totalXp,
    bestScore: scores.length ? Math.max(...scores) : 0,
    skillLevel,
  };
}

/* ------------------------------ Thresholds ------------------------------ */

/** The level at which a skill reads as "Advanced" on the Skills page. */
const ADVANCED_LEVEL = 7;

/**
 * The XP a career rank starts at, read off its `xpRange` so the threshold can't
 * drift from the rank ladder shown on the landing page and dashboard.
 * "10,000 – 24,999 XP" → 10000; "50,000+ XP" → 50000.
 */
function rankMinXp(rankName: string): number {
  const rank = CAREER_RANKS.find((r) => r.name === rankName);
  if (!rank) return 0;
  return Number(rank.xpRange.split("–")[0].replace(/[^\d]/g, "")) || 0;
}

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

// Unlock dates are authored: nothing in the app records when a threshold was
// actually crossed. They're only ever shown for achievements that derivation
// already says are unlocked, so a date can never imply progress that isn't real.
const DEFS: AchievementDef[] = [
  /* ------------------------- Mission progress ------------------------- */
  {
    id: "first-mission",
    title: "First Mission",
    description: "Complete your first mission.",
    requirement: "Complete 1 mission",
    category: "mission-progress",
    icon: "flag",
    tone: "violet",
    target: 1,
    unlockedAt: "2026-05-12",
    link: { href: "/missions", label: "View missions" },
    measure: (s) => s.completedMissions.length,
  },
  {
    id: "ten-missions",
    title: "10 Missions Completed",
    description: "Complete 10 missions.",
    requirement: "Complete 10 missions",
    category: "mission-progress",
    icon: "medal",
    tone: "electric",
    target: 10,
    link: { href: "/missions", label: "View missions" },
    measure: (s) => s.completedMissions.length,
  },
  {
    id: "chapter-one-cleared",
    title: "Fundamentals Cleared",
    description: "Complete every mission in Chapter 1.",
    requirement: "Complete all Chapter 1 missions",
    category: "mission-progress",
    icon: "trophy",
    tone: "violet",
    target: MISSIONS.filter((m) => m.chapterId === 1).length,
    unlockedAt: "2026-05-28",
    link: { href: "/missions/map", label: "Open mission map" },
    measure: (s) => s.completedMissions.filter((m) => m.chapterId === 1).length,
  },

  /* ------------------------- Technical skills ------------------------- */
  {
    id: "debugging-specialist",
    title: "Debugging Specialist",
    description: "Reach Advanced level in Debugging.",
    requirement: `Reach Debugging level ${ADVANCED_LEVEL}`,
    category: "technical-skills",
    icon: "bug",
    tone: "electric",
    target: ADVANCED_LEVEL,
    unlockedAt: "2026-06-14",
    link: { href: "/skills", label: "View skills" },
    measure: (s) => s.skillLevel("debugging"),
  },
  {
    id: "sql-optimizer",
    title: "SQL Optimizer",
    description: "Reach Advanced level in PostgreSQL.",
    requirement: `Reach PostgreSQL level ${ADVANCED_LEVEL}`,
    category: "technical-skills",
    icon: "database",
    tone: "emerald",
    target: ADVANCED_LEVEL,
    link: { href: "/skills", label: "View skills" },
    measure: (s) => s.skillLevel("postgresql"),
  },
  {
    id: "async-expert",
    title: "Async Expert",
    description: "Reach Advanced level in Async & Concurrency.",
    requirement: `Reach Async & Concurrency level ${ADVANCED_LEVEL}`,
    category: "technical-skills",
    icon: "repeat",
    tone: "amber",
    target: ADVANCED_LEVEL,
    link: { href: "/skills", label: "View skills" },
    measure: (s) => s.skillLevel("async-concurrency"),
  },

  /* --------------------------- Consistency ---------------------------- */
  {
    id: "seven-day-streak",
    title: "7-Day Streak",
    description: "Complete missions 7 days in a row.",
    requirement: "Reach a 7-day streak",
    category: "consistency",
    icon: "flame",
    tone: "amber",
    target: 7,
    unlockedAt: "2026-07-16",
    link: { href: "/dashboard", label: "Open dashboard" },
    measure: (s) => s.streakDays,
  },
  {
    id: "thirty-day-streak",
    title: "30-Day Streak",
    description: "Complete missions 30 days in a row.",
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
    description: "Solve a mission with 100% accuracy.",
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
    title: "Zero Hints Used",
    description: "Complete 5 missions without using any hints.",
    requirement: "Complete 5 missions hint-free",
    category: "quality",
    icon: "trophy",
    tone: "electric",
    target: 5,
    link: { href: "/missions", label: "View missions" },
    // Hints are always-on tool copy today — nothing records a hint as "used", so
    // every completed mission counts as hint-free. Narrow this to the missions
    // that were genuinely hint-free once hint usage is tracked.
    measure: (s) => s.completedMissions.length,
  },

  /* ----------------------------- Special ------------------------------ */
  {
    id: "production-incident-master",
    title: "Production Incident Master",
    description: "Resolve 10 production incident missions.",
    requirement: "Resolve 10 production incidents",
    category: "special",
    icon: "incident",
    tone: "slate",
    target: 10,
    link: { href: "/missions", label: "View missions" },
    measure: (s) => s.completedMissions.filter(isProductionIncident).length,
  },
  {
    id: "senior-engineer-rank",
    title: "Senior Engineer Rank",
    description: "Reach the Senior rank on the career ladder.",
    requirement: `Earn ${rankMinXp("Senior").toLocaleString("en-US")} XP`,
    category: "special",
    icon: "rank",
    tone: "slate",
    target: rankMinXp("Senior"),
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
): Achievement[] {
  return DEFS.map(({ measure, unlockedAt, ...def }) => {
    const progress = Math.min(measure(sources), def.target);
    const unlocked = progress >= def.target;
    return {
      ...def,
      progress,
      unlocked,
      // A date only means something once the requirement is actually met.
      unlockedAt: unlocked ? unlockedAt : undefined,
    };
  });
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
