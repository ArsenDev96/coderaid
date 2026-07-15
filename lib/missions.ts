import {
  Braces,
  Bug,
  Database,
  Gauge,
  Hexagon,
  Network,
  Server,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type Difficulty = "Easy" | "Medium" | "Hard" | "Expert";
export type Severity = "low" | "medium" | "high";
export type MissionStatus = "completed" | "current" | "available" | "locked";
export type Category =
  | "JavaScript"
  | "Node.js"
  | "SQL"
  | "Performance"
  | "System Design";

export type Objective = { text: string; done: boolean };

/**
 * Pre-investigation briefing shown at /missions/[missionId]/briefing.
 * Optional: only missions that are playable in the MVP carry one.
 */
export type MissionBriefing = {
  severity: Severity;
  /** Stack involved, rendered as technology chips. */
  technologies: string[];
  /** Numbered objectives the player will work through. */
  steps: string[];
  /** Skills practiced during the mission. */
  skills: string[];
  /** Label of the first investigation phase, e.g. "Reproduce the Issue". */
  firstPhase: string;
  /** Extra context revealed by the secondary "View Mission Details" action. */
  context: { label: string; value: string }[];
};

export type Mission = {
  id: string;
  index: number; // global mission number shown in the row
  chapterId: number;
  title: string;
  difficulty: Difficulty;
  minutes: number;
  xp: number;
  status: MissionStatus;
  category: Category;
  tags: string[];
  description: string;
  objectives: Objective[];
  rewardSkill: string;
  briefing?: MissionBriefing;
};

export type Chapter = {
  id: number;
  name: string;
  icon: LucideIcon;
};

export const CHAPTERS: Chapter[] = [
  { id: 1, name: "JavaScript Fundamentals", icon: Braces },
  { id: 2, name: "Async Operations", icon: Zap },
  { id: 3, name: "Node.js Services", icon: Server },
  { id: 4, name: "Database Performance", icon: Database },
  { id: 5, name: "System Design", icon: Network },
];

export const MISSIONS: Mission[] = [
  /* ---------------------- Chapter 1 — JavaScript ---------------------- */
  {
    id: "event-loop-overload",
    index: 1,
    chapterId: 1,
    title: "Event Loop Overload",
    difficulty: "Easy",
    minutes: 20,
    xp: 80,
    status: "completed",
    category: "JavaScript",
    tags: ["JavaScript", "Async"],
    description:
      "A synchronous loop is blocking the event loop and freezing the API. Break the work up and keep the process responsive.",
    objectives: [
      { text: "Reproduce the blocked event loop", done: true },
      { text: "Identify the synchronous hot path", done: true },
      { text: "Refactor to non-blocking work", done: true },
      { text: "Verify latency returns to normal", done: true },
    ],
    rewardSkill: "JS +1",
  },
  {
    id: "promise-all-cascade",
    index: 2,
    chapterId: 1,
    title: "Promise.all Failure Cascade",
    difficulty: "Easy",
    minutes: 25,
    xp: 100,
    status: "completed",
    category: "JavaScript",
    tags: ["JavaScript", "Async"],
    description:
      "One rejected promise is taking down an entire batch. Make the batch resilient without losing error visibility.",
    objectives: [
      { text: "Trace the rejected promise", done: true },
      { text: "Compare allSettled vs all", done: true },
      { text: "Add partial-failure handling", done: true },
      { text: "Confirm the batch survives failures", done: true },
    ],
    rewardSkill: "Async +1",
  },
  {
    id: "jwt-session-expiry",
    index: 3,
    chapterId: 1,
    title: "JWT Session Expiry Bug",
    difficulty: "Easy",
    minutes: 25,
    xp: 100,
    status: "completed",
    category: "JavaScript",
    tags: ["JavaScript", "Auth"],
    description:
      "Users are being logged out early. Track down the token expiry math and restore correct session lifetimes.",
    objectives: [
      { text: "Decode the failing token", done: true },
      { text: "Spot the expiry miscalculation", done: true },
      { text: "Fix the token refresh window", done: true },
      { text: "Validate sessions persist correctly", done: true },
    ],
    rewardSkill: "JS +1",
  },

  /* ---------------------- Chapter 2 — Async Ops ----------------------- */
  {
    id: "user-signup-latency",
    index: 4,
    chapterId: 2,
    title: "User Signup Latency Spike",
    difficulty: "Medium",
    minutes: 35,
    xp: 140,
    status: "current",
    category: "Node.js",
    tags: ["Node.js", "Backend", "Performance"],
    description:
      "New user signups are taking too long. Find the bottleneck and get things running smoothly again.",
    objectives: [
      { text: "Investigate slow signup endpoint", done: true },
      { text: "Profile database query performance", done: true },
      { text: "Optimize and fix the root cause", done: true },
      { text: "Ship the fix and monitor results", done: false },
    ],
    rewardSkill: "Perf +1",
  },
  {
    id: "redis-cache-meltdown",
    index: 5,
    chapterId: 2,
    title: "Redis Cache Meltdown",
    difficulty: "Hard",
    minutes: 40,
    xp: 160,
    status: "available",
    category: "Performance",
    tags: ["Node.js", "Caching", "Performance"],
    description:
      "Memory usage is climbing and cache misses are spiking. Tame the cache before it takes production down.",
    objectives: [
      { text: "Inspect Redis memory metrics", done: false },
      { text: "Find the runaway key pattern", done: false },
      { text: "Apply eviction and TTL strategy", done: false },
      { text: "Confirm hit-rate recovers", done: false },
    ],
    rewardSkill: "Perf +1",
  },
  {
    id: "rate-limiter-race",
    index: 6,
    chapterId: 2,
    title: "Rate Limiter Race Condition",
    difficulty: "Hard",
    minutes: 35,
    xp: 140,
    status: "available",
    category: "Node.js",
    tags: ["Node.js", "Concurrency"],
    description:
      "Concurrent requests are slipping past the rate limiter. Close the race and make the limiter correct under load.",
    objectives: [
      { text: "Reproduce the race under load", done: false },
      { text: "Identify the non-atomic counter", done: false },
      { text: "Introduce an atomic operation", done: false },
      { text: "Load-test the fixed limiter", done: false },
    ],
    rewardSkill: "Async +1",
  },
  {
    id: "memory-leak-worker",
    index: 7,
    chapterId: 2,
    title: "Memory Leak in Worker Pool",
    difficulty: "Hard",
    minutes: 40,
    xp: 160,
    status: "locked",
    category: "Performance",
    tags: ["Node.js", "Performance"],
    description:
      "Worker processes grow until they crash. Hunt the leak with heap snapshots and stop the restarts.",
    objectives: [
      { text: "Capture heap snapshots over time", done: false },
      { text: "Locate the retained references", done: false },
      { text: "Release the leaked resources", done: false },
      { text: "Confirm stable memory usage", done: false },
    ],
    rewardSkill: "Debugging +1",
  },
  {
    id: "unhandled-rejection-storm",
    index: 8,
    chapterId: 2,
    title: "Unhandled Rejection Storm",
    difficulty: "Hard",
    minutes: 35,
    xp: 140,
    status: "locked",
    category: "Node.js",
    tags: ["Node.js", "Async"],
    description:
      "Unhandled promise rejections are crashing the service. Add resilient error boundaries across the async layer.",
    objectives: [
      { text: "Trace the unhandled rejections", done: false },
      { text: "Add error boundaries and logging", done: false },
      { text: "Harden the async call sites", done: false },
      { text: "Verify the service stays up", done: false },
    ],
    rewardSkill: "Async +1",
  },

  /* -------------------- Chapter 3 — Node.js Services ------------------ */
  {
    id: "slow-api-incident",
    index: 9,
    chapterId: 3,
    title: "The Slow API Incident",
    difficulty: "Medium",
    minutes: 25,
    xp: 180,
    status: "completed",
    category: "Node.js",
    tags: ["Node.js", "Backend", "Performance"],
    description:
      "Users are reporting slow responses when fetching orders. The slowdown began after a recent deployment.",
    objectives: [
      { text: "Read the incident metrics and traces", done: true },
      { text: "Inspect the hot request handler", done: true },
      { text: "Diagnose the real root cause", done: true },
      { text: "Apply and verify the fix", done: true },
    ],
    rewardSkill: "Perf +1",
    briefing: {
      severity: "high",
      technologies: ["JavaScript", "Node.js", "PostgreSQL"],
      firstPhase: "Reproduce the Issue",
      steps: [
        "Reproduce the slow response issue.",
        "Identify the bottleneck using logs and code.",
        "Apply the best fix and verify the improvement.",
      ],
      skills: ["Debugging", "SQL Optimization", "Performance"],
      context: [
        { label: "Affected endpoint", value: "GET /api/orders" },
        { label: "First reported", value: "14 min after the v2.8.1 deploy" },
        { label: "Impact", value: "p95 latency up 10x, checkout timeouts" },
        { label: "Environment", value: "Node.js 20 · PostgreSQL 15 · production" },
      ],
    },
  },
  {
    id: "health-check-flapping",
    index: 10,
    chapterId: 3,
    title: "Health Check Flapping",
    difficulty: "Medium",
    minutes: 30,
    xp: 120,
    status: "available",
    category: "Node.js",
    tags: ["Node.js", "Reliability"],
    description:
      "Instances keep cycling in and out of the load balancer. Stabilise the health check before traffic drops again.",
    objectives: [
      { text: "Review health-check timings", done: false },
      { text: "Find the blocking dependency", done: false },
      { text: "Separate liveness from readiness", done: false },
      { text: "Confirm instances stay healthy", done: false },
    ],
    rewardSkill: "Node +1",
  },
  {
    id: "graceful-shutdown-bug",
    index: 11,
    chapterId: 3,
    title: "Graceful Shutdown Bug",
    difficulty: "Medium",
    minutes: 35,
    xp: 130,
    status: "locked",
    category: "Node.js",
    tags: ["Node.js", "Reliability"],
    description:
      "Deploys drop in-flight requests. Wire up graceful shutdown so rollouts stop losing traffic.",
    objectives: [
      { text: "Observe dropped requests on deploy", done: false },
      { text: "Handle termination signals", done: false },
      { text: "Drain connections before exit", done: false },
      { text: "Verify zero-downtime rollout", done: false },
    ],
    rewardSkill: "Node +1",
  },
  {
    id: "worker-queue-backlog",
    index: 12,
    chapterId: 3,
    title: "Worker Queue Backlog",
    difficulty: "Hard",
    minutes: 40,
    xp: 160,
    status: "locked",
    category: "Node.js",
    tags: ["Node.js", "Queues"],
    description:
      "Background jobs are piling up faster than workers can drain them. Find the choke point and clear the backlog.",
    objectives: [
      { text: "Measure enqueue vs drain rate", done: false },
      { text: "Profile the slowest job type", done: false },
      { text: "Tune concurrency and batching", done: false },
      { text: "Confirm the queue drains", done: false },
    ],
    rewardSkill: "Node +1",
  },
  {
    id: "connection-pool-exhaustion",
    index: 13,
    chapterId: 3,
    title: "Connection Pool Exhaustion",
    difficulty: "Hard",
    minutes: 40,
    xp: 160,
    status: "locked",
    category: "Node.js",
    tags: ["Node.js", "Databases"],
    description:
      "Requests hang waiting for a database connection. Track the leak and restore pool headroom.",
    objectives: [
      { text: "Watch pool saturation metrics", done: false },
      { text: "Find connections never released", done: false },
      { text: "Fix the leaking call path", done: false },
      { text: "Verify pool usage stabilises", done: false },
    ],
    rewardSkill: "Debugging +1",
  },

  /* ------------------ Chapter 4 — Database Performance ---------------- */
  {
    id: "n-plus-one-carnage",
    index: 14,
    chapterId: 4,
    title: "N+1 Query Carnage",
    difficulty: "Medium",
    minutes: 35,
    xp: 140,
    status: "locked",
    category: "SQL",
    tags: ["SQL", "Performance"],
    description:
      "A report fires hundreds of queries per request. Collapse the N+1 pattern into an efficient batch.",
    objectives: [
      { text: "Count queries per request", done: false },
      { text: "Spot the N+1 loop", done: false },
      { text: "Batch with a single query", done: false },
      { text: "Verify latency drops sharply", done: false },
    ],
    rewardSkill: "SQL +1",
  },
  {
    id: "index-miss-investigation",
    index: 15,
    chapterId: 4,
    title: "Index Miss Investigation",
    difficulty: "Medium",
    minutes: 30,
    xp: 120,
    status: "locked",
    category: "SQL",
    tags: ["SQL", "Performance"],
    description:
      "A full table scan is crushing a hot query. Read the query plan and add the index that fixes it.",
    objectives: [
      { text: "Read the EXPLAIN plan", done: false },
      { text: "Identify the missing index", done: false },
      { text: "Add and validate the index", done: false },
      { text: "Confirm the scan is gone", done: false },
    ],
    rewardSkill: "SQL +1",
  },
  {
    id: "db-deadlocks-checkout",
    index: 16,
    chapterId: 4,
    title: "Database Deadlocks in Checkout",
    difficulty: "Hard",
    minutes: 50,
    xp: 200,
    status: "locked",
    category: "SQL",
    tags: ["SQL", "Backend"],
    description:
      "Random checkout failures trace back to database deadlocks. Reorder access and end the contention.",
    objectives: [
      { text: "Read the deadlock graph", done: false },
      { text: "Find the conflicting lock order", done: false },
      { text: "Reorder transactions consistently", done: false },
      { text: "Confirm checkouts succeed", done: false },
    ],
    rewardSkill: "SQL +2",
  },

  /* --------------------- Chapter 5 — System Design -------------------- */
  {
    id: "payment-service-meltdown",
    index: 17,
    chapterId: 5,
    title: "Payment Service Meltdown",
    difficulty: "Expert",
    minutes: 90,
    xp: 500,
    status: "locked",
    category: "System Design",
    tags: ["Node.js", "SQL", "Backend", "Performance"],
    description:
      "A critical outage is impacting payments. Trace the root cause, restore service, and prevent future incidents.",
    objectives: [
      { text: "Triage the multi-service outage", done: false },
      { text: "Correlate traces across services", done: false },
      { text: "Restore the failing dependency", done: false },
      { text: "Ship safeguards to prevent recurrence", done: false },
    ],
    rewardSkill: "Boss Loot",
  },
  {
    id: "read-replica-lag",
    index: 18,
    chapterId: 5,
    title: "Read Replica Lag",
    difficulty: "Hard",
    minutes: 45,
    xp: 180,
    status: "locked",
    category: "System Design",
    tags: ["System Design", "Databases"],
    description:
      "Users see stale data after writes. Design around replication lag without hammering the primary.",
    objectives: [
      { text: "Measure replication lag", done: false },
      { text: "Map read-after-write paths", done: false },
      { text: "Route critical reads correctly", done: false },
      { text: "Verify consistency guarantees", done: false },
    ],
    rewardSkill: "Design +1",
  },
];

/* ------------------------------- Filters -------------------------------- */

export const CATEGORIES: Category[] = [
  "JavaScript",
  "Node.js",
  "SQL",
  "Performance",
  "System Design",
];

export const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard", "Expert"];

export const CURRENT_MISSION_ID = "user-signup-latency";

/* ------------------------------- Helpers -------------------------------- */

export function missionsForChapter(chapterId: number, list = MISSIONS) {
  return list.filter((m) => m.chapterId === chapterId);
}

export function getMission(id: string): Mission | undefined {
  return MISSIONS.find((m) => m.id === id);
}

/** Briefing content for any mission: authored values win, the rest is derived. */
export type ResolvedBriefing = MissionBriefing;

const SEVERITY_BY_DIFFICULTY: Record<Difficulty, Severity> = {
  Easy: "low",
  Medium: "medium",
  Hard: "high",
  Expert: "high",
};

const CATEGORY_SKILLS: Record<Category, string[]> = {
  JavaScript: ["JavaScript", "Debugging"],
  "Node.js": ["Node.js", "Debugging", "Performance"],
  SQL: ["SQL Optimization", "Performance"],
  Performance: ["Performance", "Debugging"],
  "System Design": ["System Design", "Performance"],
};

/**
 * Every mission is briefable: the mission itself already carries the scenario,
 * objectives, difficulty and rewards. Missions may add a richer authored
 * `briefing` (like slow-api-incident) which takes precedence field by field.
 */
export function resolveBriefing(mission: Mission): ResolvedBriefing {
  const authored = mission.briefing;
  const chapter = CHAPTERS.find((c) => c.id === mission.chapterId);

  return {
    severity: authored?.severity ?? SEVERITY_BY_DIFFICULTY[mission.difficulty],
    technologies: authored?.technologies ?? mission.tags,
    steps: authored?.steps ?? mission.objectives.map((o) => o.text),
    skills: authored?.skills ?? CATEGORY_SKILLS[mission.category],
    firstPhase: authored?.firstPhase ?? "Investigate",
    context: authored?.context ?? [
      { label: "Focus area", value: mission.category },
      {
        label: "Chapter",
        value: chapter ? `${chapter.id} · ${chapter.name}` : `${mission.chapterId}`,
      },
      { label: "Skill reward", value: mission.rewardSkill },
      { label: "Mission", value: `#${mission.index}` },
    ],
  };
}

const toNearest5 = (n: number) => Math.round(n / 5) * 5;

/**
 * Human-readable duration range for the briefing, derived from the mission's
 * canonical `minutes` so the list and the briefing can never disagree.
 * Mission estimates carry a ±20% window, rounded to the nearest 5 minutes
 * (e.g. 25 → "20–30 min").
 */
export function estimatedRange(minutes: number): string {
  return `${toNearest5(minutes * 0.8)}–${toNearest5(minutes * 1.2)} min`;
}


/** Chapter progress is derived from mission status so counts always match rows. */
export function chapterProgress(chapterId: number) {
  const all = missionsForChapter(chapterId);
  return {
    done: all.filter((m) => m.status === "completed").length,
    total: all.length,
  };
}

/* ------------------------------- Styling -------------------------------- */

export const DIFFICULTY_BADGE: Record<Difficulty, string> = {
  Easy: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  Medium: "border-electric-400/30 bg-electric-500/10 text-electric-300",
  Hard: "border-amber-400/30 bg-amber-500/10 text-amber-300",
  Expert: "border-rose-400/30 bg-rose-500/10 text-rose-300",
};

export const TAG_BADGE: Record<string, string> = {
  "Node.js": "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  Backend: "border-violet-400/30 bg-violet-500/10 text-violet-300",
  Performance: "border-electric-400/30 bg-electric-500/10 text-electric-300",
  JavaScript: "border-amber-400/30 bg-amber-500/10 text-amber-300",
  SQL: "border-electric-400/30 bg-electric-500/10 text-electric-300",
  PostgreSQL: "border-electric-400/30 bg-electric-500/10 text-electric-300",
};

export const SEVERITY_BADGE: Record<Severity, { label: string; cls: string }> = {
  low: {
    label: "Low Severity",
    cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  },
  medium: {
    label: "Medium Severity",
    cls: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  },
  high: {
    label: "High Severity",
    cls: "border-rose-500/40 bg-rose-500/10 text-rose-300",
  },
};

/** Icon + accent for each technology chip on the briefing. */
export const TECH_META: Record<string, { icon: LucideIcon; cls: string }> = {
  JavaScript: {
    icon: Braces,
    cls: "border-amber-400/25 bg-amber-500/10 text-amber-300",
  },
  "Node.js": {
    icon: Hexagon,
    cls: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
  },
  PostgreSQL: {
    icon: Database,
    cls: "border-electric-400/25 bg-electric-500/10 text-electric-300",
  },
};

/** Icon + accent for each practiced-skill chip. */
export const SKILL_META: Record<string, { icon: LucideIcon; cls: string }> = {
  Debugging: { icon: Bug, cls: "text-violet-300" },
  "SQL Optimization": { icon: Database, cls: "text-electric-300" },
  Performance: { icon: Gauge, cls: "text-emerald-300" },
  JavaScript: { icon: Braces, cls: "text-amber-300" },
  "Node.js": { icon: Hexagon, cls: "text-emerald-300" },
  "System Design": { icon: Network, cls: "text-electric-300" },
};
