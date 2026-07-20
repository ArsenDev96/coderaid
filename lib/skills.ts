import {
  Activity,
  Bug,
  Cloud,
  Database,
  FileSearch,
  Gauge,
  Hexagon,
  Layers,
  Network,
  Radar,
  Repeat,
  Server,
  ShieldCheck,
  Timer,
  Waves,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  EMPTY_VIEW,
  canStart as canStartMission,
  type PlayerView,
} from "./availability";
import { getMission, type Mission } from "./missions";
import {
  EMPTY_LEDGER,
  MAX_SKILL_LEVEL,
  SKILL_XP_PER_LEVEL,
  skillLevelProgress,
  skillXpFor,
  type Ledger,
} from "./progress";

/* -------------------------------- Types --------------------------------- */

/**
 * The canonical Node.js MVP skill taxonomy. This module is the single source
 * of truth: the Skills page, the dashboard summary and mission reward
 * references all read from here, and every reference uses a stable skill `id`
 * rather than a display name.
 */
export type SkillCategoryId = "runtime" | "node-core" | "apis" | "debugging";

export type SkillTier = "core" | "advanced";
export type SkillLevelLabel =
  | "Not Started"
  | "Beginner"
  | "Intermediate"
  | "Advanced"
  | "Expert";
export type SkillStrength = "Strong" | "Good" | "Learning";

/** The authored half of a skill: what it is, never how far the player got. */
export type SkillDef = {
  id: string;
  name: string;
  category: SkillCategoryId;
  tier: SkillTier;
  description: string;
  /** Missions that build this skill — reused from the shared mission library. */
  missionIds: string[];
  icon: LucideIcon;
  /** Icon-tile accent classes. */
  accent: string;
};

/**
 * A skill as the player has it: the definition plus their real standing in it,
 * derived from the skill XP the grading engine has credited to the ledger.
 */
export type Skill = SkillDef & {
  level: number;
  /** 0–100 progress through the current level. */
  progress: number;
  /** XP earned toward the next level. */
  currentXp: number;
  /** XP the current level costs. */
  nextLevelXp: number;
  /** Lifetime XP in this skill, across every level. */
  totalXp: number;
};

export type SkillCategory = {
  id: SkillCategoryId;
  name: string;
  description: string;
};

/* ------------------------------ Categories ------------------------------ */

export const SKILL_CATEGORIES: SkillCategory[] = [
  {
    id: "runtime",
    name: "JavaScript Runtime",
    description: "How JavaScript actually executes inside the Node.js runtime.",
  },
  {
    id: "node-core",
    name: "Node.js Core",
    description: "The runtime primitives every backend service is built on.",
  },
  {
    id: "apis",
    name: "Backend APIs",
    description: "Request handling, auth, validation and background work.",
  },
  {
    id: "debugging",
    name: "Production Debugging",
    description: "Reading real signals and finding the true root cause.",
  },
];

/* -------------------------------- Skills -------------------------------- */

// Definitions only. A skill's level and XP are not authored anywhere — they are
// earned, mission by mission, and read back out of the progression ledger by
// `skillsFor(ledger)`. A new player sees every skill at level 0, "Not Started",
// because that is the truth.
export const SKILL_DEFS: SkillDef[] = [
  /* ------------------------- JavaScript Runtime ------------------------- */
  {
    id: "async-javascript",
    name: "Async JavaScript",
    category: "runtime",
    tier: "core",
    description:
      "async/await, control flow, and the mistakes that silently skip work.",
    missionIds: [
      "promise-all-cascade",
      "async-map-trap",
      "overlapping-scheduler-runs",
      "jwt-session-expiry",
      "rate-limiter-race",
      "slow-api-incident",
    ],
    icon: Repeat,
    accent: "border-violet-400/25 bg-violet-500/10 text-violet-300",
  },
  {
    id: "promises",
    name: "Promises",
    category: "runtime",
    tier: "core",
    description:
      "Chaining, combinators, and how one rejection cascades through a batch.",
    missionIds: [
      "promise-all-cascade",
      "async-map-trap",
      "unhandled-rejection-storm",
      "jwt-session-expiry",
    ],
    icon: Workflow,
    accent: "border-electric-400/25 bg-electric-500/10 text-electric-300",
  },
  {
    id: "event-loop",
    name: "Event Loop",
    category: "runtime",
    tier: "core",
    description:
      "Phases, microtasks, and what blocking the loop does to your latency.",
    missionIds: ["event-loop-overload"],
    icon: Zap,
    accent: "border-amber-400/25 bg-amber-500/10 text-amber-300",
  },
  {
    id: "closures-memory",
    name: "Closures and Memory",
    category: "runtime",
    tier: "advanced",
    description: "Retained references, heap growth, and reading a snapshot.",
    missionIds: ["memory-leak-worker"],
    icon: Layers,
    accent: "border-rose-400/25 bg-rose-500/10 text-rose-300",
  },
  {
    id: "error-handling",
    name: "Error Handling",
    category: "runtime",
    tier: "core",
    description:
      "Boundaries, unhandled rejections, and keeping failures observable.",
    missionIds: [
      "promise-all-cascade",
      "unhandled-rejection-storm",
      "jwt-session-expiry",
      "graceful-shutdown-bug",
      "worker-queue-backlog",
      "connection-pool-exhaustion",
    ],
    icon: ShieldCheck,
    accent: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
  },

  /* ---------------------------- Node.js Core ---------------------------- */
  {
    id: "nodejs-runtime",
    name: "Node.js Runtime",
    category: "node-core",
    tier: "core",
    description: "Non-blocking I/O and the runtime sitting under your APIs.",
    missionIds: [
      "event-loop-overload",
      "unhandled-rejection-storm",
      "slow-api-incident",
      "user-signup-latency-spike",
      "health-check-flapping",
      "graceful-shutdown-bug",
      "memory-leak-worker",
      "connection-pool-exhaustion",
    ],
    icon: Hexagon,
    accent: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
  },
  {
    id: "streams",
    name: "Streams",
    category: "node-core",
    tier: "advanced",
    description: "Backpressure, piping, and processing data without buffering it all.",
    missionIds: [],
    icon: Waves,
    accent: "border-electric-400/25 bg-electric-500/10 text-electric-300",
  },
  {
    id: "event-emitter",
    name: "EventEmitter",
    category: "node-core",
    tier: "advanced",
    description: "Listener lifecycles, leaks, and event-driven service design.",
    missionIds: ["memory-leak-worker"],
    icon: Activity,
    accent: "border-violet-400/25 bg-violet-500/10 text-violet-300",
  },
  {
    id: "process-lifecycle",
    name: "Process Lifecycle",
    category: "node-core",
    tier: "core",
    description: "Signals, health, readiness, and draining work before exit.",
    missionIds: [
      "unhandled-rejection-storm",
      "health-check-flapping",
      "graceful-shutdown-bug",
    ],
    icon: Server,
    accent: "border-slate-400/25 bg-slate-500/10 text-slate-300",
  },
  {
    id: "worker-threads",
    name: "Worker Threads",
    category: "node-core",
    tier: "advanced",
    description: "Offloading CPU work without starving the main thread.",
    missionIds: ["event-loop-overload", "memory-leak-worker"],
    icon: Layers,
    accent: "border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-300",
  },

  /* ---------------------------- Backend APIs ---------------------------- */
  {
    id: "api-design",
    name: "API Design",
    category: "apis",
    tier: "core",
    description: "Resource modelling, status codes, and predictable contracts.",
    missionIds: [
      "slow-api-incident",
      "health-check-flapping",
      "jwt-session-expiry",
      "graceful-shutdown-bug",
      "rate-limiter-race",
      "worker-queue-backlog",
      "connection-pool-exhaustion",
    ],
    icon: Network,
    accent: "border-electric-400/25 bg-electric-500/10 text-electric-300",
  },
  {
    id: "authentication",
    name: "Authentication",
    category: "apis",
    tier: "core",
    description: "Tokens, expiry windows, and sessions that behave correctly.",
    missionIds: [
      "jwt-session-expiry",
      "rate-limiter-race",
    ],
    icon: ShieldCheck,
    accent: "border-violet-400/25 bg-violet-500/10 text-violet-300",
  },
  {
    id: "validation",
    name: "Validation",
    category: "apis",
    tier: "core",
    description: "Rejecting bad input early, before it reaches your data layer.",
    missionIds: [],
    icon: ShieldCheck,
    accent: "border-amber-400/25 bg-amber-500/10 text-amber-300",
  },
  {
    id: "request-performance",
    name: "Request Performance",
    category: "apis",
    tier: "advanced",
    description: "Finding the work on the critical path and taking it off.",
    missionIds: [
      "user-signup-latency-spike",
      "slow-api-incident",
      "rate-limiter-race",
      "connection-pool-exhaustion",
    ],
    icon: Gauge,
    accent: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
  },
  {
    id: "background-jobs",
    name: "Background Jobs",
    category: "apis",
    tier: "advanced",
    description: "Queues, workers, and moving slow work out of the request.",
    missionIds: [
      "worker-queue-backlog",
      "overlapping-scheduler-runs",
      "async-map-trap",
      "user-signup-latency-spike",
      "graceful-shutdown-bug",
    ],
    icon: Timer,
    accent: "border-electric-400/25 bg-electric-500/10 text-electric-300",
  },

  /* ------------------------- Production Debugging ----------------------- */
  {
    id: "log-analysis",
    name: "Log Analysis",
    category: "debugging",
    tier: "core",
    description: "Reading a noisy stream and pulling the signal out of it.",
    missionIds: [
      "overlapping-scheduler-runs",
      "unhandled-rejection-storm",
      "slow-api-incident",
      "user-signup-latency-spike",
      "worker-queue-backlog",
    ],
    icon: FileSearch,
    accent: "border-violet-400/25 bg-violet-500/10 text-violet-300",
  },
  {
    id: "metrics-analysis",
    name: "Metrics Analysis",
    category: "debugging",
    tier: "core",
    description: "Percentiles, deploy markers, and what a spike actually means.",
    missionIds: [
      "event-loop-overload",
      "user-signup-latency-spike",
      "connection-pool-exhaustion",
      "health-check-flapping",
      "rate-limiter-race",
      "memory-leak-worker",
      "worker-queue-backlog",
      "slow-api-incident",
    ],
    icon: Activity,
    accent: "border-electric-400/25 bg-electric-500/10 text-electric-300",
  },
  {
    id: "distributed-tracing",
    name: "Distributed Tracing",
    category: "debugging",
    tier: "advanced",
    description: "Span timings that show exactly where a request spends itself.",
    missionIds: [
      "user-signup-latency-spike",
      "jwt-session-expiry",
      "slow-api-incident",
    ],
    icon: Radar,
    accent: "border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-300",
  },
  {
    id: "root-cause-analysis",
    name: "Root-Cause Analysis",
    category: "debugging",
    tier: "core",
    description: "Turning correlated evidence into a defensible diagnosis.",
    missionIds: [
      "event-loop-overload",
      "promise-all-cascade",
      "async-map-trap",
      "overlapping-scheduler-runs",
      "unhandled-rejection-storm",
      "user-signup-latency-spike",
      "slow-api-incident",
      "connection-pool-exhaustion",
      "jwt-session-expiry",
      "health-check-flapping",
      "graceful-shutdown-bug",
      "rate-limiter-race",
      "memory-leak-worker",
      "worker-queue-backlog",
    ],
    icon: Bug,
    accent: "border-amber-400/25 bg-amber-500/10 text-amber-300",
  },
  {
    id: "performance-debugging",
    name: "Performance Debugging",
    category: "debugging",
    tier: "advanced",
    description: "Profiling hot paths and proving the fix with real numbers.",
    missionIds: [
      "event-loop-overload",
      "slow-api-incident",
      "memory-leak-worker",
      "connection-pool-exhaustion",
      "health-check-flapping",
      "rate-limiter-race",
      "worker-queue-backlog",
    ],
    icon: Gauge,
    accent: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
  },
];

/* --------------------------- Derived from play -------------------------- */

/** A skill definition resolved against the XP the player has earned in it. */
export function resolveSkill(def: SkillDef, ledger: Ledger): Skill {
  const totalXp = skillXpFor(ledger, def.id);
  const { level, into, needed, pct } = skillLevelProgress(totalXp);
  return {
    ...def,
    level,
    progress: pct,
    currentXp: into,
    nextLevelXp: needed,
    totalXp,
  };
}

/** Every skill, as this player has it. The zero ledger yields the zero state. */
export function skillsFor(ledger: Ledger = EMPTY_LEDGER): Skill[] {
  return SKILL_DEFS.map((def) => resolveSkill(def, ledger));
}

export function getSkillDef(id: string): SkillDef | undefined {
  return SKILL_DEFS.find((s) => s.id === id);
}

export function getSkill(id: string, ledger: Ledger = EMPTY_LEDGER): Skill | undefined {
  const def = getSkillDef(id);
  return def ? resolveSkill(def, ledger) : undefined;
}

/** Level for a skill id, 0 when the skill doesn't exist or isn't started. */
export function skillLevel(id: string, ledger: Ledger = EMPTY_LEDGER): number {
  return getSkill(id, ledger)?.level ?? 0;
}

/* ---------------------------- Future tracks ----------------------------- */

export type FutureTrack = {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  accent: string;
};

/**
 * Roadmap-only tracks. Rendered muted with a Coming Soon badge and no detail
 * drawer — they are deliberately not `Skill`s, so nothing can accidentally
 * count them toward progress, radar axes or recommendations.
 */
export const FUTURE_TRACKS: FutureTrack[] = [
  {
    id: "sql-databases",
    name: "SQL and Databases",
    description: "Query plans, indexes, N+1 patterns and transactional integrity.",
    icon: Database,
    accent: "border-white/10 bg-white/[0.03] text-slate-400",
  },
  {
    id: "redis-caching",
    name: "Redis and Caching",
    description: "Cache strategies, eviction, TTLs and stampede protection.",
    icon: Layers,
    accent: "border-white/10 bg-white/[0.03] text-slate-400",
  },
  {
    id: "system-design",
    name: "System Design",
    description: "Service boundaries, data flow and resilient architectures.",
    icon: Network,
    accent: "border-white/10 bg-white/[0.03] text-slate-400",
  },
  {
    id: "cloud-reliability",
    name: "Cloud and Reliability",
    description: "Deploys, autoscaling, SLOs and staying up under pressure.",
    icon: Cloud,
    accent: "border-white/10 bg-white/[0.03] text-slate-400",
  },
];

/* ------------------------------- Helpers -------------------------------- */

export function levelLabel(level: number): SkillLevelLabel {
  if (level >= 9) return "Expert";
  if (level >= 7) return "Advanced";
  if (level >= 4) return "Intermediate";
  if (level >= 1) return "Beginner";
  return "Not Started";
}

export const LEVEL_LABELS: SkillLevelLabel[] = [
  "Not Started",
  "Beginner",
  "Intermediate",
  "Advanced",
  "Expert",
];

export function strengthFor(progress: number): SkillStrength {
  if (progress >= 75) return "Strong";
  if (progress >= 55) return "Good";
  return "Learning";
}

export const STRENGTH_BADGE: Record<SkillStrength, string> = {
  Strong: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  Good: "border-electric-400/30 bg-electric-500/10 text-electric-300",
  Learning: "border-amber-400/30 bg-amber-500/10 text-amber-300",
};

export function categoryName(id: SkillCategoryId): string {
  return SKILL_CATEGORIES.find((c) => c.id === id)?.name ?? id;
}

export function skillsInCategory(
  id: SkillCategoryId,
  ledger: Ledger = EMPTY_LEDGER,
): Skill[] {
  return skillsFor(ledger).filter((s) => s.category === id);
}

function avg(nums: number[]): number {
  return nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : 0;
}

/**
 * How far a skill has come toward being maxed, 0–100.
 *
 * Deliberately not `skill.progress`, which measures progress *within* the
 * current level: a level-8 skill one point past its threshold would read as 2%
 * and drag the radar down. Mastery measures the whole climb.
 */
export function masteryPct(skill: Skill): number {
  const ceiling = MAX_SKILL_LEVEL * SKILL_XP_PER_LEVEL;
  return Math.min(100, Math.round((skill.totalXp / ceiling) * 100));
}

export function categoryAverage(
  id: SkillCategoryId,
  ledger: Ledger = EMPTY_LEDGER,
): number {
  return avg(skillsInCategory(id, ledger).map(masteryPct));
}

/** Compact summary shown at the top — derived from real skill XP, never authored. */
export function skillsSummary(ledger: Ledger = EMPTY_LEDGER) {
  const skills = skillsFor(ledger);
  const overall = avg(skills.map(masteryPct));
  // "Mastered" means a skill the player has actually taken to Advanced.
  const mastered = skills.filter((s) => s.level >= 7).length;
  const started = skills.filter((s) => s.totalXp > 0).length;

  const ranked = SKILL_CATEGORIES.map((c) => ({
    category: c,
    average: categoryAverage(c.id, ledger),
  })).sort((a, b) => b.average - a.average);

  const top = ranked[0];
  const focus = ranked[ranked.length - 1];

  return {
    overall,
    overallLabel: levelLabel(avg(skills.map((s) => s.level))),
    mastered,
    started,
    total: skills.length,
    topCategory: top.category,
    topAverage: top.average,
    focusCategory: focus.category,
  };
}

/**
 * What to work on next: the least-developed skills that a playable mission can
 * actually improve. Suggesting a skill with no written incident behind it would
 * be advice the player can't act on.
 */
export function skillsToImprove(
  ledger: Ledger = EMPTY_LEDGER,
  view: PlayerView = EMPTY_VIEW,
  limit = 4,
): Skill[] {
  const actionable = skillsFor(ledger).filter((s) =>
    relatedMissions(s).some((m) => canStartMission(m, view)),
  );
  const pool = actionable.length > 0 ? actionable : skillsFor(ledger);
  return [...pool].sort((a, b) => a.totalXp - b.totalXp).slice(0, limit);
}

export function relatedMissions(skill: SkillDef): Mission[] {
  return skill.missionIds
    .map(getMission)
    .filter((m): m is Mission => Boolean(m));
}

/** Missions building this skill that the player has actually finished. */
export function completedMissions(
  skill: SkillDef,
  view: PlayerView = EMPTY_VIEW,
): Mission[] {
  return relatedMissions(skill).filter((m) => m.id in view.ledger.missions);
}

/**
 * The mission to point a "Practice" action at. Only ever a mission the player
 * can actually start, so the Skills page can't hand out a dead CTA.
 */
export function recommendedMission(
  skill: SkillDef,
  view: PlayerView = EMPTY_VIEW,
): Mission | undefined {
  const related = relatedMissions(skill).filter((m) => canStartMission(m, view));
  return related.find((m) => !(m.id in view.ledger.missions)) ?? related[0];
}

/** Radar axes: one per category, valued by its average mastery. */
export function radarData(
  ledger: Ledger = EMPTY_LEDGER,
): { label: string; short: string; value: number }[] {
  return SKILL_CATEGORIES.map((c) => ({
    label: c.name,
    short: RADAR_SHORT[c.id],
    value: categoryAverage(c.id, ledger),
  }));
}

const RADAR_SHORT: Record<SkillCategoryId, string> = {
  runtime: "Runtime",
  "node-core": "Node Core",
  apis: "APIs",
  debugging: "Debugging",
};

/* -------------------------- Recent skill activity ----------------------- */

export type SkillActivity = {
  id: string;
  title: string;
  detail: string;
  when: string;
  icon: LucideIcon;
  accent: string;
};

const ACTIVITY_ACCENTS = [
  "border-violet-400/25 bg-violet-500/10 text-violet-300",
  "border-amber-400/25 bg-amber-500/10 text-amber-300",
  "border-electric-400/25 bg-electric-500/10 text-electric-300",
];

/** "2 days ago" from a real completion timestamp. */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "recently";
  const minutes = Math.max(0, Math.round((now.getTime() - then) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return days === 1 ? "yesterday" : `${days} days ago`;
  const weeks = Math.round(days / 7);
  return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
}

/**
 * The player's most recent skill gains, newest first — real completions with
 * the XP they actually earned, replacing the two authored "recent achievement"
 * cards that used to sit here regardless of whether anything had happened.
 */
export function recentSkillActivity(
  ledger: Ledger = EMPTY_LEDGER,
  limit = 3,
): SkillActivity[] {
  return Object.values(ledger.missions)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, limit)
    .map((record, i) => {
      const mission = getMission(record.missionId);
      const skill = mission?.rewardSkillId
        ? getSkill(mission.rewardSkillId, ledger)
        : undefined;
      return {
        id: record.missionId,
        title: skill ? `${skill.name} level ${skill.level}` : "Incident resolved",
        detail: `${mission?.title ?? record.missionId} · scored ${record.score}`,
        when: relativeTime(record.completedAt),
        icon: skill?.icon ?? Bug,
        accent: skill?.accent ?? ACTIVITY_ACCENTS[i % ACTIVITY_ACCENTS.length],
      };
    });
}
