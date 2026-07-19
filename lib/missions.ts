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

/**
 * Authored *content* state for a mission — what the catalogue knows about it,
 * independent of any player.
 *
 * `available` — written and playable.
 * `locked` — deliberately gated by the catalogue itself.
 * `in-development` — inside the Node.js MVP scope, but its stage content
 * (investigation → results) isn't written yet, so it must not be startable.
 * `coming-soon` — a future track (databases, caching, distributed systems)
 * kept visible as a roadmap signal. Never counts toward MVP progress.
 *
 * "Completed" and "in progress" are deliberately *not* here: those are facts
 * about a player, and they are derived from the progression ledger by
 * `missionAvailability(mission, ledger)` in `lib/availability.ts`.
 */
export type MissionStatus =
  | "available"
  | "locked"
  | "in-development"
  | "coming-soon";

/** Node.js MVP categories. Future-track missions use the last two. */
export type Category =
  | "Async JavaScript"
  | "Node.js APIs"
  | "Workers & Performance"
  | "Databases"
  | "Distributed Systems";

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
  /** Display label for the reward, e.g. "Event Loop +1". */
  rewardSkill: string;
  /**
   * Stable id of the skill this mission primarily builds, from `lib/skills.ts`.
   * The grading engine credits skill XP through this, so the reward is a real
   * link into the taxonomy rather than a string that has to be parsed.
   * Absent on future-track missions, whose subjects are not skills yet.
   */
  rewardSkillId?: string;
  briefing?: MissionBriefing;
};

/**
 * `nodejs` chapters are the shipped MVP scope. `future` chapters stay visible
 * so the roadmap is legible, but they are excluded from progress, filters and
 * every "what should I play next?" calculation.
 */
export type ChapterTrack = "nodejs" | "future";

export type Chapter = {
  id: number;
  name: string;
  description: string;
  icon: LucideIcon;
  track: ChapterTrack;
};

export const CHAPTERS: Chapter[] = [
  {
    id: 1,
    name: "Async JavaScript",
    description:
      "The event loop, promises and async control flow — the runtime behaviour behind most Node.js incidents.",
    icon: Zap,
    track: "nodejs",
  },
  {
    id: 2,
    name: "Node.js APIs",
    description:
      "Request handling, auth, health and shutdown behaviour in production HTTP services.",
    icon: Server,
    track: "nodejs",
  },
  {
    id: 3,
    name: "Workers and Performance",
    description:
      "Background jobs, worker pools, memory and connection pressure under real traffic.",
    icon: Gauge,
    track: "nodejs",
  },
  {
    id: 4,
    name: "Databases",
    description:
      "Query plans, N+1 patterns, deadlocks and replication. Added after the Node.js MVP.",
    icon: Database,
    track: "future",
  },
  {
    id: 5,
    name: "Caching and Distributed Systems",
    description:
      "Cache behaviour and multi-service failure modes. Added after the Node.js MVP.",
    icon: Network,
    track: "future",
  },
];

export const MISSIONS: Mission[] = [
  /* --------------------- Chapter 1 — Async JavaScript --------------------- */
  {
    id: "event-loop-overload",
    index: 1,
    chapterId: 1,
    title: "Event Loop Overload",
    difficulty: "Easy",
    minutes: 20,
    xp: 80,
    status: "in-development",
    category: "Async JavaScript",
    tags: ["Node.js", "JavaScript", "Async"],
    description:
      "A synchronous loop is blocking the event loop and freezing the API. Break the work up and keep the process responsive.",
    objectives: [
      { text: "Reproduce the blocked event loop", done: true },
      { text: "Identify the synchronous hot path", done: true },
      { text: "Refactor to non-blocking work", done: true },
      { text: "Verify latency returns to normal", done: true },
    ],
    rewardSkill: "Event Loop +1",
    rewardSkillId: "event-loop",
  },
  {
    id: "promise-all-cascade",
    index: 2,
    chapterId: 1,
    title: "Promise.all Failure Cascade",
    difficulty: "Easy",
    minutes: 25,
    xp: 100,
    status: "in-development",
    category: "Async JavaScript",
    tags: ["Node.js", "Async", "Error Handling"],
    description:
      "One rejected promise is taking down an entire batch. Make the batch resilient without losing error visibility.",
    objectives: [
      { text: "Trace the rejected promise", done: true },
      { text: "Compare allSettled vs all", done: true },
      { text: "Add partial-failure handling", done: true },
      { text: "Confirm the batch survives failures", done: true },
    ],
    rewardSkill: "Promises +1",
    rewardSkillId: "promises",
  },
  {
    id: "async-map-trap",
    index: 3,
    chapterId: 1,
    title: "The Async Map Trap",
    difficulty: "Easy",
    minutes: 25,
    xp: 100,
    status: "in-development",
    category: "Async JavaScript",
    tags: ["Node.js", "Async", "JavaScript"],
    description:
      "An async callback inside .map() returns promises nobody awaits, so a job reports success before any work finishes.",
    objectives: [
      { text: "Spot the un-awaited promise array", done: false },
      { text: "Trace why the job exits early", done: false },
      { text: "Await the batch correctly", done: false },
      { text: "Verify every item is processed", done: false },
    ],
    rewardSkill: "Async JavaScript +1",
    rewardSkillId: "async-javascript",
  },
  {
    id: "overlapping-scheduler-runs",
    index: 4,
    chapterId: 1,
    title: "Overlapping Scheduler Runs",
    difficulty: "Medium",
    minutes: 30,
    xp: 120,
    status: "in-development",
    category: "Async JavaScript",
    tags: ["Node.js", "Async", "Background Jobs"],
    description:
      "A cron-style interval fires again before the previous run finishes, so the same records get processed twice.",
    objectives: [
      { text: "Correlate duplicate job log lines", done: false },
      { text: "Measure run duration vs interval", done: false },
      { text: "Add a run lock or drain guard", done: false },
      { text: "Confirm runs never overlap", done: false },
    ],
    rewardSkill: "Background Jobs +1",
    rewardSkillId: "background-jobs",
  },
  {
    id: "unhandled-rejection-storm",
    index: 5,
    chapterId: 1,
    title: "Unhandled Rejection Storm",
    difficulty: "Hard",
    minutes: 35,
    xp: 140,
    status: "in-development",
    category: "Async JavaScript",
    tags: ["Node.js", "Async", "Error Handling"],
    description:
      "Unhandled promise rejections are crashing the service. Add resilient error boundaries across the async layer.",
    objectives: [
      { text: "Trace the unhandled rejections", done: false },
      { text: "Add error boundaries and logging", done: false },
      { text: "Harden the async call sites", done: false },
      { text: "Verify the service stays up", done: false },
    ],
    rewardSkill: "Error Handling +1",
    rewardSkillId: "error-handling",
  },

  /* ----------------------- Chapter 2 — Node.js APIs ----------------------- */
  {
    id: "user-signup-latency-spike",
    index: 6,
    chapterId: 2,
    title: "User Signup Latency Spike",
    difficulty: "Medium",
    minutes: 35,
    xp: 140,
    status: "available",
    category: "Node.js APIs",
    tags: ["Node.js", "Backend", "Request Performance"],
    description:
      "New user registrations are taking several seconds to complete. Investigate the signup flow, identify the bottleneck, and restore normal response times.",
    objectives: [
      { text: "Investigate the slow signup endpoint", done: true },
      { text: "Profile each step of the request", done: true },
      { text: "Diagnose the real root cause", done: false },
      { text: "Ship the fix and monitor results", done: false },
    ],
    rewardSkill: "Request Performance +1",
    rewardSkillId: "request-performance",
    briefing: {
      severity: "medium",
      technologies: ["Node.js", "JavaScript", "Backend", "Request Performance"],
      firstPhase: "Reproduce the Issue",
      steps: [
        "Reproduce the slow signup request.",
        "Identify the bottleneck using logs, metrics and the trace.",
        "Apply the best fix and verify the improvement.",
      ],
      skills: ["Root-Cause Analysis", "Request Performance", "Node.js Runtime"],
      context: [
        { label: "Affected endpoint", value: "POST /api/signup" },
        { label: "First reported", value: "Shortly after the 4.2.0 release" },
        { label: "Impact", value: "Signups succeed but take ~3.2s" },
        { label: "Environment", value: "Node.js 20 · production" },
      ],
    },
  },
  {
    id: "jwt-session-expiry",
    index: 7,
    chapterId: 2,
    title: "JWT Session Expiry Bug",
    difficulty: "Easy",
    minutes: 25,
    xp: 100,
    status: "in-development",
    category: "Node.js APIs",
    tags: ["Node.js", "Auth", "Backend"],
    description:
      "Users are being logged out early. Track down the token expiry math and restore correct session lifetimes.",
    objectives: [
      { text: "Decode the failing token", done: true },
      { text: "Spot the expiry miscalculation", done: true },
      { text: "Fix the token refresh window", done: true },
      { text: "Validate sessions persist correctly", done: true },
    ],
    rewardSkill: "Authentication +1",
    rewardSkillId: "authentication",
  },
  {
    id: "health-check-flapping",
    index: 8,
    chapterId: 2,
    title: "Health Check Flapping",
    difficulty: "Medium",
    minutes: 30,
    xp: 120,
    status: "in-development",
    category: "Node.js APIs",
    tags: ["Node.js", "Reliability", "Backend"],
    description:
      "Instances keep cycling in and out of the load balancer. Stabilise the health check before traffic drops again.",
    objectives: [
      { text: "Review health-check timings", done: false },
      { text: "Find the blocking dependency", done: false },
      { text: "Separate liveness from readiness", done: false },
      { text: "Confirm instances stay healthy", done: false },
    ],
    rewardSkill: "Process Lifecycle +1",
    rewardSkillId: "process-lifecycle",
  },
  {
    id: "graceful-shutdown-bug",
    index: 9,
    chapterId: 2,
    title: "Graceful Shutdown Bug",
    difficulty: "Medium",
    minutes: 35,
    xp: 130,
    status: "in-development",
    category: "Node.js APIs",
    tags: ["Node.js", "Reliability", "Process Lifecycle"],
    description:
      "Deploys drop in-flight requests. Wire up graceful shutdown so rollouts stop losing traffic.",
    objectives: [
      { text: "Observe dropped requests on deploy", done: false },
      { text: "Handle termination signals", done: false },
      { text: "Drain connections before exit", done: false },
      { text: "Verify zero-downtime rollout", done: false },
    ],
    rewardSkill: "Process Lifecycle +1",
    rewardSkillId: "process-lifecycle",
  },
  {
    id: "rate-limiter-race",
    index: 10,
    chapterId: 2,
    title: "Rate Limiter Race Condition",
    difficulty: "Hard",
    minutes: 35,
    xp: 140,
    status: "in-development",
    category: "Node.js APIs",
    tags: ["Node.js", "Concurrency", "Backend"],
    description:
      "Concurrent requests are slipping past the rate limiter. Close the race and make the limiter correct under load.",
    objectives: [
      { text: "Reproduce the race under load", done: false },
      { text: "Identify the non-atomic counter", done: false },
      { text: "Introduce an atomic operation", done: false },
      { text: "Load-test the fixed limiter", done: false },
    ],
    rewardSkill: "Request Performance +1",
    rewardSkillId: "request-performance",
  },

  /* ---------------- Chapter 3 — Workers and Performance ------------------ */
  {
    id: "memory-leak-worker",
    index: 11,
    chapterId: 3,
    title: "Memory Leak in Worker Pool",
    difficulty: "Hard",
    minutes: 40,
    xp: 160,
    status: "in-development",
    category: "Workers & Performance",
    tags: ["Node.js", "Worker Threads", "Performance"],
    description:
      "Worker processes grow until they crash. Hunt the leak with heap snapshots and stop the restarts.",
    objectives: [
      { text: "Capture heap snapshots over time", done: false },
      { text: "Locate the retained references", done: false },
      { text: "Release the leaked resources", done: false },
      { text: "Confirm stable memory usage", done: false },
    ],
    rewardSkill: "Closures and Memory +1",
    rewardSkillId: "closures-memory",
  },
  {
    id: "worker-queue-backlog",
    index: 12,
    chapterId: 3,
    title: "Worker Queue Backlog",
    difficulty: "Hard",
    minutes: 40,
    xp: 160,
    status: "in-development",
    category: "Workers & Performance",
    tags: ["Node.js", "Background Jobs", "Performance"],
    description:
      "Background jobs are piling up faster than workers can drain them. Find the choke point and clear the backlog.",
    objectives: [
      { text: "Measure enqueue vs drain rate", done: false },
      { text: "Profile the slowest job type", done: false },
      { text: "Tune concurrency and batching", done: false },
      { text: "Confirm the queue drains", done: false },
    ],
    rewardSkill: "Background Jobs +1",
    rewardSkillId: "background-jobs",
  },
  {
    id: "connection-pool-exhaustion",
    index: 13,
    chapterId: 3,
    title: "Connection Pool Exhaustion",
    difficulty: "Hard",
    minutes: 40,
    xp: 160,
    status: "in-development",
    category: "Workers & Performance",
    tags: ["Node.js", "Concurrency", "Performance"],
    description:
      "Requests hang waiting for a pooled connection that never comes back. Track the leak and restore headroom.",
    objectives: [
      { text: "Watch pool saturation metrics", done: false },
      { text: "Find connections never released", done: false },
      { text: "Fix the leaking call path", done: false },
      { text: "Verify pool usage stabilises", done: false },
    ],
    rewardSkill: "Performance Debugging +1",
    rewardSkillId: "performance-debugging",
  },
  {
    id: "slow-api-incident",
    index: 14,
    chapterId: 3,
    title: "The Slow API Incident",
    difficulty: "Medium",
    minutes: 25,
    xp: 180,
    status: "in-development",
    category: "Workers & Performance",
    tags: ["Node.js", "Backend", "Request Performance"],
    description:
      "Users are reporting slow responses when fetching orders. The slowdown began after a recent deployment.",
    objectives: [
      { text: "Read the incident metrics and traces", done: true },
      { text: "Inspect the hot request handler", done: true },
      { text: "Diagnose the real root cause", done: true },
      { text: "Apply and verify the fix", done: true },
    ],
    rewardSkill: "Performance Debugging +1",
    rewardSkillId: "performance-debugging",
    briefing: {
      severity: "high",
      technologies: ["Node.js", "JavaScript", "Backend"],
      firstPhase: "Reproduce the Issue",
      steps: [
        "Reproduce the slow response issue.",
        "Identify the bottleneck using logs and code.",
        "Apply the best fix and verify the improvement.",
      ],
      skills: ["Root-Cause Analysis", "Performance Debugging", "Log Analysis"],
      context: [
        { label: "Affected endpoint", value: "GET /api/orders" },
        { label: "First reported", value: "14 min after the v2.8.1 deploy" },
        { label: "Impact", value: "p95 latency up 10x, checkout timeouts" },
        { label: "Environment", value: "Node.js 20 · production" },
      ],
    },
  },

  /* ------------------ Chapter 4 — Databases (coming soon) ---------------- */
  {
    id: "n-plus-one-carnage",
    index: 15,
    chapterId: 4,
    title: "N+1 Query Carnage",
    difficulty: "Medium",
    minutes: 35,
    xp: 140,
    status: "coming-soon",
    category: "Databases",
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
    index: 16,
    chapterId: 4,
    title: "Index Miss Investigation",
    difficulty: "Medium",
    minutes: 30,
    xp: 120,
    status: "coming-soon",
    category: "Databases",
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
    index: 17,
    chapterId: 4,
    title: "Database Deadlocks in Checkout",
    difficulty: "Hard",
    minutes: 50,
    xp: 200,
    status: "coming-soon",
    category: "Databases",
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
  {
    id: "read-replica-lag",
    index: 18,
    chapterId: 4,
    title: "Read Replica Lag",
    difficulty: "Hard",
    minutes: 45,
    xp: 180,
    status: "coming-soon",
    category: "Databases",
    tags: ["Databases", "System Design"],
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

  /* -------- Chapter 5 — Caching and Distributed Systems (coming soon) ---- */
  {
    id: "redis-cache-meltdown",
    index: 19,
    chapterId: 5,
    title: "Redis Cache Meltdown",
    difficulty: "Hard",
    minutes: 40,
    xp: 160,
    status: "coming-soon",
    category: "Distributed Systems",
    tags: ["Caching", "Performance"],
    description:
      "Memory usage is climbing and cache misses are spiking. Tame the cache before it takes production down.",
    objectives: [
      { text: "Inspect Redis memory metrics", done: false },
      { text: "Find the runaway key pattern", done: false },
      { text: "Apply eviction and TTL strategy", done: false },
      { text: "Confirm hit-rate recovers", done: false },
    ],
    rewardSkill: "Caching +1",
  },
  {
    id: "payment-service-meltdown",
    index: 20,
    chapterId: 5,
    title: "Payment Service Meltdown",
    difficulty: "Expert",
    minutes: 90,
    xp: 500,
    status: "coming-soon",
    category: "Distributed Systems",
    tags: ["System Design", "Backend", "Performance"],
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
];

/* ----------------------------- Mission flow ----------------------------- */

/**
 * Canonical stage order every playable mission moves through. The step counter
 * shown on each stage page is derived from this, so "Step 4 of 6" stays
 * consistent across Investigation → Diagnosis → Fix regardless of how many
 * objectives a mission's briefing happens to list.
 */
export const MISSION_FLOW = [
  "Briefing",
  "Investigation",
  "Diagnosis",
  "Fix",
  "Verification",
  "Complete",
] as const;

export type MissionStage = (typeof MISSION_FLOW)[number];

export function missionStep(stage: MissionStage): {
  step: number;
  totalSteps: number;
} {
  return {
    step: MISSION_FLOW.indexOf(stage) + 1,
    totalSteps: MISSION_FLOW.length,
  };
}

/* --------------------------- Scope and tracks --------------------------- */

export const NODE_CHAPTERS = CHAPTERS.filter((c) => c.track === "nodejs");
export const FUTURE_CHAPTERS = CHAPTERS.filter((c) => c.track === "future");

const NODE_CHAPTER_IDS = new Set(NODE_CHAPTERS.map((c) => c.id));

/** True for missions inside the shipped Node.js MVP scope. */
export function isNodeMission(mission: Mission): boolean {
  return NODE_CHAPTER_IDS.has(mission.chapterId);
}

/** The Node.js MVP catalogue — the default list for progress and filters. */
export const NODE_MISSIONS = MISSIONS.filter(isNodeMission);

export function chapterTrack(chapterId: number): ChapterTrack {
  return CHAPTERS.find((c) => c.id === chapterId)?.track ?? "future";
}

/* ------------------------------- Filters -------------------------------- */

/** Filter options only ever offer the Node.js MVP categories. */
export const CATEGORIES: Category[] = [
  "Async JavaScript",
  "Node.js APIs",
  "Workers & Performance",
];

export const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard", "Expert"];

export const CURRENT_MISSION_ID = "user-signup-latency-spike";

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
  "Async JavaScript": ["Async JavaScript", "Event Loop", "Error Handling"],
  "Node.js APIs": ["Node.js Runtime", "API Design", "Root-Cause Analysis"],
  "Workers & Performance": [
    "Performance Debugging",
    "Background Jobs",
    "Metrics Analysis",
  ],
  Databases: ["SQL", "Performance Debugging"],
  "Distributed Systems": ["System Design", "Performance Debugging"],
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

/* Chapter, chapter-state and overall progress now live in `lib/availability.ts`:
   they are facts about the player, derived from the progression ledger, not
   properties of the catalogue. */

/* ------------------------------- Styling -------------------------------- */

export const DIFFICULTY_BADGE: Record<Difficulty, string> = {
  Easy: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  Medium: "border-electric-400/30 bg-electric-500/10 text-electric-300",
  Hard: "border-amber-400/30 bg-amber-500/10 text-amber-300",
  Expert: "border-rose-400/30 bg-rose-500/10 text-rose-300",
};

export const TAG_BADGE: Record<string, string> = {
  "Node.js": "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  JavaScript: "border-amber-400/30 bg-amber-500/10 text-amber-300",
  Async: "border-violet-400/30 bg-violet-500/10 text-violet-300",
  Backend: "border-violet-400/30 bg-violet-500/10 text-violet-300",
  "Request Performance": "border-electric-400/30 bg-electric-500/10 text-electric-300",
  Performance: "border-electric-400/30 bg-electric-500/10 text-electric-300",
  "Error Handling": "border-rose-400/30 bg-rose-500/10 text-rose-300",
  "Background Jobs": "border-electric-400/30 bg-electric-500/10 text-electric-300",
  Concurrency: "border-violet-400/30 bg-violet-500/10 text-violet-300",
  "Worker Threads": "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  "Process Lifecycle": "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  Reliability: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  Auth: "border-violet-400/30 bg-violet-500/10 text-violet-300",
  SQL: "border-slate-400/30 bg-slate-500/10 text-slate-300",
  Databases: "border-slate-400/30 bg-slate-500/10 text-slate-300",
  Caching: "border-slate-400/30 bg-slate-500/10 text-slate-300",
  "System Design": "border-slate-400/30 bg-slate-500/10 text-slate-300",
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
  Backend: {
    icon: Server,
    cls: "border-violet-400/25 bg-violet-500/10 text-violet-300",
  },
  "Request Performance": {
    icon: Gauge,
    cls: "border-electric-400/25 bg-electric-500/10 text-electric-300",
  },
};

/** Icon + accent for each practiced-skill chip. */
export const SKILL_META: Record<string, { icon: LucideIcon; cls: string }> = {
  "Root-Cause Analysis": { icon: Bug, cls: "text-violet-300" },
  "Performance Debugging": { icon: Gauge, cls: "text-emerald-300" },
  "Request Performance": { icon: Gauge, cls: "text-electric-300" },
  "Log Analysis": { icon: Bug, cls: "text-violet-300" },
  "Metrics Analysis": { icon: Gauge, cls: "text-electric-300" },
  "Async JavaScript": { icon: Zap, cls: "text-violet-300" },
  "Event Loop": { icon: Zap, cls: "text-amber-300" },
  "Error Handling": { icon: Bug, cls: "text-rose-300" },
  "Node.js Runtime": { icon: Hexagon, cls: "text-emerald-300" },
  "API Design": { icon: Server, cls: "text-violet-300" },
  "Background Jobs": { icon: Server, cls: "text-electric-300" },
  JavaScript: { icon: Braces, cls: "text-amber-300" },
  "Node.js": { icon: Hexagon, cls: "text-emerald-300" },
  SQL: { icon: Database, cls: "text-slate-300" },
  "System Design": { icon: Network, cls: "text-slate-300" },
};
