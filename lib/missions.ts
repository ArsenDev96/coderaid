import {
  Braces,
  CircleDot,
  Database,
  Play,
  Server,
  Skull,
  Star,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type Difficulty = "Easy" | "Medium" | "Hard" | "Expert";
export type MissionStatus = "completed" | "available" | "locked" | "boss";
export type MissionBadge = "recommended" | "new";
export type PrimaryTag = "JS" | "Node.js" | "SQL";

export type PreviewStep = { text: string; done: boolean };

export type Mission = {
  id: string;
  chapterId: number;
  title: string;
  difficulty: Difficulty;
  minutes: number;
  primaryTag: PrimaryTag;
  tags: string[];
  xp: number;
  rewardSkill: string;
  status: MissionStatus;
  badge?: MissionBadge;
  requiredRank: string;
  description: string;
  preview: PreviewStep[];
  practice: string[];
  unlockHint?: string;
};

export type Chapter = {
  id: number;
  name: string;
  blurb: string;
  icon: LucideIcon;
  done: number;
  total: number;
  pct: number;
  boss?: boolean;
};

export const CHAPTERS: Chapter[] = [
  {
    id: 1,
    name: "JavaScript Fundamentals",
    blurb: "Master the core building blocks.",
    icon: Braces,
    done: 3,
    total: 3,
    pct: 100,
  },
  {
    id: 2,
    name: "Async Operations",
    blurb: "Handle async code like a pro.",
    icon: Zap,
    done: 2,
    total: 3,
    pct: 66,
  },
  {
    id: 3,
    name: "Node.js Services",
    blurb: "Build resilient backend services.",
    icon: Server,
    done: 1,
    total: 3,
    pct: 33,
  },
  {
    id: 4,
    name: "Database Performance",
    blurb: "Optimize queries and data flows.",
    icon: Database,
    done: 0,
    total: 3,
    pct: 0,
  },
  {
    id: 5,
    name: "Production Incidents",
    blurb: "Solve real-world outages.",
    icon: Skull,
    done: 0,
    total: 1,
    pct: 0,
    boss: true,
  },
];

export const MISSIONS: Mission[] = [
  // Chapter 1 — JavaScript Fundamentals (all completed)
  {
    id: "event-loop-overload",
    chapterId: 1,
    title: "Event Loop Overload",
    difficulty: "Easy",
    minutes: 20,
    primaryTag: "JS",
    tags: ["JavaScript", "Async"],
    xp: 80,
    rewardSkill: "JS +1",
    status: "completed",
    requiredRank: "Intern Engineer",
    description:
      "A synchronous loop is blocking the event loop and freezing the API. Break the work up and keep the process responsive.",
    preview: [
      { text: "Reproduce the blocked event loop", done: true },
      { text: "Identify the synchronous hot path", done: true },
      { text: "Refactor to non-blocking work", done: true },
      { text: "Verify latency returns to normal", done: true },
    ],
    practice: ["Event Loop", "Non-blocking I/O", "Profiling"],
  },
  {
    id: "promise-all-cascade",
    chapterId: 1,
    title: "Promise.all Failure Cascade",
    difficulty: "Medium",
    minutes: 30,
    primaryTag: "JS",
    tags: ["JavaScript", "Async"],
    xp: 120,
    rewardSkill: "Async +1",
    status: "completed",
    requiredRank: "Intern Engineer",
    description:
      "One rejected promise is taking down an entire batch. Make the batch resilient without losing error visibility.",
    preview: [
      { text: "Trace the rejected promise", done: true },
      { text: "Compare allSettled vs all", done: true },
      { text: "Add partial-failure handling", done: true },
      { text: "Confirm the batch survives failures", done: true },
    ],
    practice: ["Promises", "Error Handling", "Concurrency"],
  },
  {
    id: "jwt-session-expiry",
    chapterId: 1,
    title: "JWT Session Expiry Bug",
    difficulty: "Medium",
    minutes: 25,
    primaryTag: "JS",
    tags: ["JavaScript", "Auth"],
    xp: 100,
    rewardSkill: "JS +1",
    status: "completed",
    requiredRank: "Intern Engineer",
    description:
      "Users are being logged out early. Track down the token expiry math and restore correct session lifetimes.",
    preview: [
      { text: "Decode the failing token", done: true },
      { text: "Spot the expiry miscalculation", done: true },
      { text: "Fix the token refresh window", done: true },
      { text: "Validate sessions persist correctly", done: true },
    ],
    practice: ["JWT", "Auth Flows", "Time Handling"],
  },

  // Chapter 2 — Async Operations
  {
    id: "user-signup-latency",
    chapterId: 2,
    title: "User Signup Latency Spike",
    difficulty: "Medium",
    minutes: 35,
    primaryTag: "Node.js",
    tags: ["Node.js", "Backend", "Performance"],
    xp: 140,
    rewardSkill: "Perf +1",
    status: "available",
    badge: "recommended",
    requiredRank: "Junior Backend Engineer",
    description:
      "New user signups are taking too long. Find the bottleneck and get things running smoothly again.",
    preview: [
      { text: "Investigate slow signup endpoint", done: true },
      { text: "Profile database query performance", done: true },
      { text: "Optimize and fix the root cause", done: true },
      { text: "Ship the fix and monitor results", done: false },
    ],
    practice: [
      "Async/Await",
      "Database Query Optimization",
      "Performance Profiling",
    ],
  },
  {
    id: "redis-cache-meltdown",
    chapterId: 2,
    title: "Redis Cache Meltdown",
    difficulty: "Hard",
    minutes: 40,
    primaryTag: "Node.js",
    tags: ["Node.js", "Backend", "Performance"],
    xp: 160,
    rewardSkill: "Perf +1",
    status: "available",
    badge: "new",
    requiredRank: "Junior Backend Engineer",
    description:
      "Memory usage is climbing and cache misses are spiking. Tame the cache before it takes production down.",
    preview: [
      { text: "Inspect Redis memory metrics", done: false },
      { text: "Find the runaway key pattern", done: false },
      { text: "Apply eviction and TTL strategy", done: false },
      { text: "Confirm hit-rate recovers", done: false },
    ],
    practice: ["Caching", "Redis", "Memory Management"],
  },
  {
    id: "rate-limiter-race",
    chapterId: 2,
    title: "Rate Limiter Race Condition",
    difficulty: "Hard",
    minutes: 35,
    primaryTag: "Node.js",
    tags: ["Node.js", "Concurrency"],
    xp: 160,
    rewardSkill: "Async +1",
    status: "locked",
    requiredRank: "Junior Backend Engineer",
    description:
      "Concurrent requests are slipping past the rate limiter. Close the race and make the limiter correct under load.",
    preview: [
      { text: "Reproduce the race under load", done: false },
      { text: "Identify the non-atomic counter", done: false },
      { text: "Introduce an atomic operation", done: false },
      { text: "Load-test the fixed limiter", done: false },
    ],
    practice: ["Concurrency", "Atomicity", "Distributed Systems"],
    unlockHint: "Complete User Signup Latency Spike to unlock.",
  },

  // Chapter 3 — Node.js Services
  {
    id: "slow-api-incident",
    chapterId: 3,
    title: "Slow API Incident",
    difficulty: "Hard",
    minutes: 45,
    primaryTag: "Node.js",
    tags: ["Node.js", "Backend", "Performance"],
    xp: 180,
    rewardSkill: "Perf +1",
    status: "available",
    requiredRank: "Junior Backend Engineer",
    description:
      "Production response times jumped 10x. CPU is normal but database load increased. Find the bottleneck and choose the best fix.",
    preview: [
      { text: "Read the incident metrics and traces", done: false },
      { text: "Inspect the hot request handler", done: false },
      { text: "Diagnose the real root cause", done: false },
      { text: "Apply and verify the fix", done: false },
    ],
    practice: ["Tracing", "Query Optimization", "Incident Response"],
  },
  {
    id: "memory-leak-worker",
    chapterId: 3,
    title: "Memory Leak in Worker Pool",
    difficulty: "Hard",
    minutes: 40,
    primaryTag: "Node.js",
    tags: ["Node.js", "Performance"],
    xp: 150,
    rewardSkill: "Debugging +1",
    status: "locked",
    requiredRank: "Mid-Level Engineer",
    description:
      "Worker processes grow until they crash. Hunt the leak with heap snapshots and stop the restarts.",
    preview: [
      { text: "Capture heap snapshots over time", done: false },
      { text: "Locate the retained references", done: false },
      { text: "Release the leaked resources", done: false },
      { text: "Confirm stable memory usage", done: false },
    ],
    practice: ["Heap Analysis", "Debugging", "Node Internals"],
    unlockHint: "Complete Slow API Incident to unlock.",
  },
  {
    id: "unhandled-rejection-storm",
    chapterId: 3,
    title: "Unhandled Rejection Storm",
    difficulty: "Hard",
    minutes: 35,
    primaryTag: "Node.js",
    tags: ["Node.js", "Async"],
    xp: 150,
    rewardSkill: "Async +1",
    status: "locked",
    requiredRank: "Mid-Level Engineer",
    description:
      "Unhandled promise rejections are crashing the service. Add resilient error boundaries across the async layer.",
    preview: [
      { text: "Trace the unhandled rejections", done: false },
      { text: "Add error boundaries and logging", done: false },
      { text: "Harden the async call sites", done: false },
      { text: "Verify the service stays up", done: false },
    ],
    practice: ["Error Handling", "Observability", "Resilience"],
    unlockHint: "Complete Slow API Incident to unlock.",
  },

  // Chapter 4 — Database Performance (all locked)
  {
    id: "db-deadlocks-checkout",
    chapterId: 4,
    title: "Database Deadlocks in Checkout",
    difficulty: "Hard",
    minutes: 50,
    primaryTag: "SQL",
    tags: ["SQL", "Backend"],
    xp: 200,
    rewardSkill: "SQL +2",
    status: "locked",
    requiredRank: "Mid-Level Engineer",
    description:
      "Random checkout failures trace back to database deadlocks. Reorder access and end the contention.",
    preview: [
      { text: "Read the deadlock graph", done: false },
      { text: "Find the conflicting lock order", done: false },
      { text: "Reorder transactions consistently", done: false },
      { text: "Confirm checkouts succeed", done: false },
    ],
    practice: ["Transactions", "Locking", "SQL Tuning"],
    unlockHint: "Reach the Database Performance chapter to unlock.",
  },
  {
    id: "n-plus-one-carnage",
    chapterId: 4,
    title: "N+1 Query Carnage",
    difficulty: "Medium",
    minutes: 35,
    primaryTag: "SQL",
    tags: ["SQL", "Performance"],
    xp: 140,
    rewardSkill: "SQL +1",
    status: "locked",
    requiredRank: "Mid-Level Engineer",
    description:
      "A report fires hundreds of queries per request. Collapse the N+1 pattern into an efficient batch.",
    preview: [
      { text: "Count queries per request", done: false },
      { text: "Spot the N+1 loop", done: false },
      { text: "Batch with a single query", done: false },
      { text: "Verify latency drops sharply", done: false },
    ],
    practice: ["N+1 Queries", "Joins", "Query Optimization"],
    unlockHint: "Reach the Database Performance chapter to unlock.",
  },
  {
    id: "index-miss-investigation",
    chapterId: 4,
    title: "Index Miss Investigation",
    difficulty: "Medium",
    minutes: 30,
    primaryTag: "SQL",
    tags: ["SQL", "Performance"],
    xp: 120,
    rewardSkill: "SQL +1",
    status: "locked",
    requiredRank: "Mid-Level Engineer",
    description:
      "A full table scan is crushing a hot query. Read the query plan and add the index that fixes it.",
    preview: [
      { text: "Read the EXPLAIN plan", done: false },
      { text: "Identify the missing index", done: false },
      { text: "Add and validate the index", done: false },
      { text: "Confirm the scan is gone", done: false },
    ],
    practice: ["Indexes", "Query Plans", "SQL Tuning"],
    unlockHint: "Reach the Database Performance chapter to unlock.",
  },

  // Chapter 5 — Boss Fight
  {
    id: "payment-service-meltdown",
    chapterId: 5,
    title: "Payment Service Meltdown",
    difficulty: "Expert",
    minutes: 90,
    primaryTag: "Node.js",
    tags: ["Node.js", "SQL", "Backend", "Performance"],
    xp: 500,
    rewardSkill: "Boss Loot",
    status: "boss",
    requiredRank: "Mid-Level Engineer",
    description:
      "A critical outage is impacting payments. Trace the root cause, restore service, and prevent future incidents.",
    preview: [
      { text: "Triage the multi-service outage", done: false },
      { text: "Correlate traces across services", done: false },
      { text: "Restore the failing dependency", done: false },
      { text: "Ship safeguards to prevent recurrence", done: false },
    ],
    practice: ["Incident Command", "Root Cause Analysis", "System Design"],
    unlockHint: "Complete 3 more missions to challenge the boss.",
  },
];

export function missionsForChapter(chapterId: number): Mission[] {
  return MISSIONS.filter((m) => m.chapterId === chapterId);
}

export const RECOMMENDED_MISSION_ID = "user-signup-latency";

/* ------------------------------ Top stats ------------------------------- */

export const MISSION_STATS = {
  overallPct: 34,
  completedMissions: 24,
  totalMissions: 70,
  completedDelta: "14% this week",
  chaptersDone: 2,
  chaptersTotal: 5,
  chaptersPct: 40,
  nextUnlock: "Payment Service Meltdown",
  nextUnlockHint: "Complete 3 more missions",
};

/* ------------------------------- Legend --------------------------------- */

export type LegendItem = { label: string; icon: LucideIcon; className: string };

export const LEGEND: LegendItem[] = [
  { label: "Completed", icon: CircleDot, className: "text-emerald-400" },
  { label: "Available", icon: CircleDot, className: "text-electric-400" },
  { label: "New", icon: Play, className: "text-violet-400" },
  { label: "Locked", icon: CircleDot, className: "text-slate-500" },
  { label: "Boss Fight", icon: Skull, className: "text-rose-400" },
  { label: "Recommended", icon: Star, className: "text-amber-400" },
];

/* --------------------------- Tag color mapping -------------------------- */

export const TAG_COLORS: Record<PrimaryTag, string> = {
  JS: "border-amber-400/30 bg-amber-500/10 text-amber-300",
  "Node.js": "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  SQL: "border-electric-400/30 bg-electric-500/10 text-electric-300",
};

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  Easy: "text-emerald-300",
  Medium: "text-amber-300",
  Hard: "text-orange-300",
  Expert: "text-rose-300",
};
