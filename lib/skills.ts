import {
  Boxes,
  Braces,
  Bug,
  Database,
  FlaskConical,
  Gauge,
  GitBranch,
  Hexagon,
  Layers,
  Network,
  Repeat,
  Server,
  Terminal,
  Webhook,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { getMission, type Mission } from "./missions";

/* -------------------------------- Types --------------------------------- */

export type SkillCategoryId =
  | "language"
  | "backend"
  | "database"
  | "performance"
  | "architecture"
  | "testing";

export type SkillTier = "core" | "advanced";
export type SkillLevelLabel = "Beginner" | "Intermediate" | "Advanced" | "Expert";
export type SkillStrength = "Strong" | "Good" | "Learning";

export type Skill = {
  id: string;
  name: string;
  category: SkillCategoryId;
  tier: SkillTier;
  level: number;
  progress: number; // 0–100, kept in sync with currentXp / nextLevelXp
  currentXp: number;
  nextLevelXp: number;
  description: string;
  /** Missions that build this skill — reused from the shared mission library. */
  missionIds: string[];
  icon: LucideIcon;
  /** Icon-tile accent classes. */
  accent: string;
};

export type SkillCategory = {
  id: SkillCategoryId;
  name: string;
  description: string;
};

/* ------------------------------ Categories ------------------------------ */

export const SKILL_CATEGORIES: SkillCategory[] = [
  {
    id: "language",
    name: "Programming Languages",
    description: "Core language runtimes and their execution models.",
  },
  {
    id: "backend",
    name: "Backend Development",
    description: "Frameworks and APIs that power backend services.",
  },
  {
    id: "database",
    name: "Databases",
    description: "Relational and document stores, and how to query them well.",
  },
  {
    id: "performance",
    name: "Performance & Scale",
    description: "Latency, caching, and background processing.",
  },
  {
    id: "architecture",
    name: "Architecture",
    description: "Designing resilient, scalable systems.",
  },
  {
    id: "testing",
    name: "Quality & Testing",
    description: "Finding, reproducing, and preventing defects.",
  },
];

/* -------------------------------- Skills -------------------------------- */

// Progress and XP are held as static profile data — the Skills page reads them,
// it never mutates or re-accumulates, so a refresh always shows the same values.
const raw: Omit<Skill, "progress">[] = [
  // Programming Languages
  {
    id: "javascript",
    name: "JavaScript",
    category: "language",
    tier: "core",
    level: 6,
    currentXp: 800,
    nextLevelXp: 1000,
    description:
      "The event loop, closures, prototypes, and modern async patterns.",
    missionIds: ["event-loop-overload", "jwt-session-expiry"],
    icon: Braces,
    accent: "border-amber-400/25 bg-amber-500/10 text-amber-300",
  },
  {
    id: "typescript",
    name: "TypeScript",
    category: "language",
    tier: "core",
    level: 5,
    currentXp: 650,
    nextLevelXp: 1000,
    description: "Static typing, generics, and safer service interfaces.",
    missionIds: ["user-signup-latency-spike"],
    icon: Braces,
    accent: "border-electric-400/25 bg-electric-500/10 text-electric-300",
  },
  {
    id: "nodejs",
    name: "Node.js",
    category: "language",
    tier: "core",
    level: 7,
    currentXp: 750,
    nextLevelXp: 1000,
    description: "Non-blocking I/O, streams, and the runtime under your APIs.",
    missionIds: ["slow-api-incident", "health-check-flapping", "graceful-shutdown-bug"],
    icon: Hexagon,
    accent: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
  },
  {
    id: "async-concurrency",
    name: "Async & Concurrency",
    category: "language",
    tier: "advanced",
    level: 5,
    currentXp: 550,
    nextLevelXp: 1000,
    description: "Promises, race conditions, and safe concurrent work.",
    missionIds: ["promise-all-cascade", "rate-limiter-race", "unhandled-rejection-storm"],
    icon: Repeat,
    accent: "border-violet-400/25 bg-violet-500/10 text-violet-300",
  },

  // Backend Development
  {
    id: "express",
    name: "Express.js",
    category: "backend",
    tier: "core",
    level: 6,
    currentXp: 700,
    nextLevelXp: 1000,
    description: "Routing, middleware, and request lifecycle handling.",
    missionIds: ["slow-api-incident"],
    icon: Server,
    accent: "border-slate-400/25 bg-slate-500/10 text-slate-300",
  },
  {
    id: "nestjs",
    name: "NestJS",
    category: "backend",
    tier: "advanced",
    level: 7,
    currentXp: 800,
    nextLevelXp: 1000,
    description: "Modules, providers, and structured service architecture.",
    missionIds: ["user-signup-latency-spike"],
    icon: Hexagon,
    accent: "border-rose-400/25 bg-rose-500/10 text-rose-300",
  },
  {
    id: "api-design",
    name: "REST APIs",
    category: "backend",
    tier: "core",
    level: 8,
    currentXp: 850,
    nextLevelXp: 1000,
    description: "Resource modelling, status codes, and versioning.",
    missionIds: ["slow-api-incident", "health-check-flapping"],
    icon: Webhook,
    accent: "border-electric-400/25 bg-electric-500/10 text-electric-300",
  },
  {
    id: "graphql",
    name: "GraphQL",
    category: "backend",
    tier: "advanced",
    level: 5,
    currentXp: 600,
    nextLevelXp: 1000,
    description: "Schemas, resolvers, and avoiding over-fetching.",
    missionIds: ["n-plus-one-carnage"],
    icon: GitBranch,
    accent: "border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-300",
  },

  // Databases
  {
    id: "postgresql",
    name: "PostgreSQL",
    category: "database",
    tier: "core",
    level: 6,
    currentXp: 700,
    nextLevelXp: 1000,
    description: "Query planning, indexes, and transactional integrity.",
    missionIds: ["index-miss-investigation", "db-deadlocks-checkout"],
    icon: Database,
    accent: "border-electric-400/25 bg-electric-500/10 text-electric-300",
  },
  {
    id: "mysql",
    name: "MySQL",
    category: "database",
    tier: "core",
    level: 5,
    currentXp: 650,
    nextLevelXp: 1000,
    description: "Schema design and query tuning for relational data.",
    missionIds: ["index-miss-investigation"],
    icon: Database,
    accent: "border-amber-400/25 bg-amber-500/10 text-amber-300",
  },
  {
    id: "mongodb",
    name: "MongoDB",
    category: "database",
    tier: "advanced",
    level: 4,
    currentXp: 500,
    nextLevelXp: 1000,
    description: "Document modelling, aggregation, and read patterns.",
    missionIds: [],
    icon: Database,
    accent: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
  },
  {
    id: "redis",
    name: "Redis",
    category: "database",
    tier: "advanced",
    level: 5,
    currentXp: 600,
    nextLevelXp: 1000,
    description: "Caching, eviction, and in-memory data structures.",
    missionIds: ["redis-cache-meltdown"],
    icon: Layers,
    accent: "border-rose-400/25 bg-rose-500/10 text-rose-300",
  },

  // Performance & Scale
  {
    id: "performance",
    name: "Performance Optimization",
    category: "performance",
    tier: "advanced",
    level: 6,
    currentXp: 720,
    nextLevelXp: 1000,
    description: "Profiling, bottleneck analysis, and latency reduction.",
    missionIds: ["slow-api-incident", "user-signup-latency-spike", "n-plus-one-carnage"],
    icon: Gauge,
    accent: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
  },
  {
    id: "caching",
    name: "Caching",
    category: "performance",
    tier: "advanced",
    level: 4,
    currentXp: 420,
    nextLevelXp: 1000,
    description: "Cache strategies, invalidation, and stampede protection.",
    missionIds: ["redis-cache-meltdown"],
    icon: Zap,
    accent: "border-amber-400/25 bg-amber-500/10 text-amber-300",
  },
  {
    id: "queues",
    name: "Queues & Background Jobs",
    category: "performance",
    tier: "advanced",
    level: 3,
    currentXp: 300,
    nextLevelXp: 1000,
    description: "Offloading slow work to reliable background processing.",
    missionIds: ["worker-queue-backlog", "user-signup-latency-spike"],
    icon: Boxes,
    accent: "border-violet-400/25 bg-violet-500/10 text-violet-300",
  },

  // Architecture
  {
    id: "system-design",
    name: "System Design",
    category: "architecture",
    tier: "advanced",
    level: 2,
    currentXp: 200,
    nextLevelXp: 1000,
    description: "Scaling services, data flow, and resilient architectures.",
    missionIds: ["payment-service-meltdown", "read-replica-lag"],
    icon: Network,
    accent: "border-electric-400/25 bg-electric-500/10 text-electric-300",
  },
  {
    id: "microservices",
    name: "Microservices",
    category: "architecture",
    tier: "advanced",
    level: 2,
    currentXp: 250,
    nextLevelXp: 1000,
    description: "Service boundaries, communication, and failure isolation.",
    missionIds: ["payment-service-meltdown"],
    icon: Boxes,
    accent: "border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-300",
  },

  // Quality & Testing
  {
    id: "debugging",
    name: "Debugging",
    category: "testing",
    tier: "core",
    level: 7,
    currentXp: 780,
    nextLevelXp: 1000,
    description: "Logs, traces, profiling, and production root-cause analysis.",
    missionIds: ["memory-leak-worker", "connection-pool-exhaustion", "slow-api-incident"],
    icon: Bug,
    accent: "border-violet-400/25 bg-violet-500/10 text-violet-300",
  },
  {
    id: "testing",
    name: "Testing",
    category: "testing",
    tier: "core",
    level: 4,
    currentXp: 380,
    nextLevelXp: 1000,
    description: "Verifying behaviour and guarding against regressions.",
    missionIds: ["promise-all-cascade"],
    icon: FlaskConical,
    accent: "border-amber-400/25 bg-amber-500/10 text-amber-300",
  },
];

export const SKILLS: Skill[] = raw.map((s) => ({
  ...s,
  progress: Math.round((s.currentXp / s.nextLevelXp) * 100),
}));

/* ------------------------------- Helpers -------------------------------- */

export function levelLabel(level: number): SkillLevelLabel {
  if (level >= 9) return "Expert";
  if (level >= 7) return "Advanced";
  if (level >= 4) return "Intermediate";
  return "Beginner";
}

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

export function skillsInCategory(id: SkillCategoryId): Skill[] {
  return SKILLS.filter((s) => s.category === id);
}

function avg(nums: number[]): number {
  return nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : 0;
}

export function categoryAverage(id: SkillCategoryId): number {
  return avg(skillsInCategory(id).map((s) => s.progress));
}

/** Compact summary shown at the top — derived from the skills, never hardcoded. */
export function skillsSummary() {
  const overall = avg(SKILLS.map((s) => s.progress));
  const mastered = SKILLS.filter((s) => s.progress >= 70).length;

  const ranked = SKILL_CATEGORIES.map((c) => ({
    category: c,
    average: categoryAverage(c.id),
  })).sort((a, b) => b.average - a.average);

  const top = ranked[0];
  const focus = ranked[ranked.length - 1];

  return {
    overall,
    overallLabel: levelLabel(Math.round(overall / 12.5)),
    mastered,
    total: SKILLS.length,
    progressDelta: 12, // static month-over-month figure
    topCategory: top.category,
    topAverage: top.average,
    focusCategory: focus.category,
  };
}

/** Lowest-progress skills — a simple, honest "what to work on next". */
export function skillsToImprove(limit = 4): Skill[] {
  return [...SKILLS].sort((a, b) => a.progress - b.progress).slice(0, limit);
}

export function relatedMissions(skill: Skill): Mission[] {
  return skill.missionIds
    .map(getMission)
    .filter((m): m is Mission => Boolean(m));
}

export function completedMissions(skill: Skill): Mission[] {
  return relatedMissions(skill).filter((m) => m.status === "completed");
}

/** The mission to point a "Practice" action at: the first not-yet-completed one. */
export function recommendedMission(skill: Skill): Mission | undefined {
  const related = relatedMissions(skill);
  return related.find((m) => m.status !== "completed") ?? related[0];
}

/** Radar axes: one per category, valued by its average progress. */
export function radarData(): { label: string; short: string; value: number }[] {
  return SKILL_CATEGORIES.map((c) => ({
    label: c.name,
    short: RADAR_SHORT[c.id],
    value: categoryAverage(c.id),
  }));
}

const RADAR_SHORT: Record<SkillCategoryId, string> = {
  language: "Languages",
  backend: "Backend",
  database: "Database",
  performance: "Performance",
  architecture: "Architecture",
  testing: "Testing",
};

/* ---------------------------- Achievements ------------------------------ */

export type SkillAchievement = {
  id: string;
  title: string;
  detail: string;
  when: string;
  icon: LucideIcon;
  accent: string;
};

export const RECENT_ACHIEVEMENTS: SkillAchievement[] = [
  {
    id: "backend-builder",
    title: "Backend Builder",
    detail: "Reached 70% average in the Backend category",
    when: "2 days ago",
    icon: Hexagon,
    accent: "border-violet-400/25 bg-violet-500/10 text-violet-300",
  },
  {
    id: "javascript-pro",
    title: "JavaScript Pro",
    detail: "Reached 80% in JavaScript",
    when: "1 week ago",
    icon: Braces,
    accent: "border-amber-400/25 bg-amber-500/10 text-amber-300",
  },
];
