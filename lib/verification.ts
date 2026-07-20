import {
  Activity,
  Clock,
  Gauge,
  ShieldCheck,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

/* -------------------------------- Types --------------------------------- */

export type MetricIconId =
  | "trending"
  | "gauge"
  | "shield"
  | "clock"
  | "activity";

export type MetricAccent = "violet" | "amber" | "emerald" | "electric";

/**
 * Icons are referenced by key, not by component: the config crosses the
 * server→client boundary as props, and a function can't be serialized.
 */
export const METRIC_ICONS: Record<MetricIconId, LucideIcon> = {
  trending: TrendingUp,
  gauge: Gauge,
  shield: ShieldCheck,
  clock: Clock,
  activity: Activity,
};

export const METRIC_ACCENT: Record<MetricAccent, string> = {
  violet: "border-violet-400/25 bg-violet-500/10 text-violet-300",
  amber: "border-amber-400/25 bg-amber-500/10 text-amber-300",
  emerald: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
  electric: "border-electric-400/25 bg-electric-500/10 text-electric-300",
};

export type VerificationMetric = {
  id: string;
  label: string;
  before: string;
  after: string;
  status: "pass" | "warning" | "fail";
  /** Change summary, e.g. "↓ 87% improvement" or "Stable". */
  delta: string;
  deltaTone: "good" | "neutral";
  icon: MetricIconId;
  accent: MetricAccent;
};

export type VerificationCheck = {
  id: string;
  label: string;
  passed: boolean;
  /**
   * Whether this check only passes because the applied fix actually resolved
   * the root cause. Checks about the *rest* of the system (the database is
   * healthy, errors are low) stay true either way; checks about the incident
   * itself fail when the fix didn't address it. Defaults to true.
   */
  dependsOnFix?: boolean;
};

export type RequestSpan = { label: string; durationMs: number };

/** Before/after latency series drawn as two connected lines split at the fix. */
export type VerificationChart = {
  caption: string;
  yMax: number;
  unit: string;
  xLabels: string[];
  fixLabel: string;
  /** 0–1 position of the "fix applied" marker along the x-axis. */
  fixFraction: number;
  before: number[];
  after: number[];
};

export type MissionVerificationConfig = {
  missionId: string;
  metrics: VerificationMetric[];
  chart: VerificationChart;
  requestBreakdown: RequestSpan[];
  breakdownTotalMs: number;
  logs: string[];
  checks: VerificationCheck[];
  summary: { headline: string; detail: string };

  /* --- The same incident, as it looks when the fix didn't resolve it --- */
  unresolvedSummary: { headline: string; detail: string };
  unresolvedLogs: string[];
  unresolvedBreakdown: RequestSpan[];
  unresolvedBreakdownTotalMs: number;
};

/**
 * What the verification run actually reports, given whether the player's fix
 * resolved the root cause.
 *
 * The authored config describes the incident *after the correct fix*. When the
 * applied fix doesn't address the cause, nothing improved: the metrics hold at
 * their "before" values, the chart's after-line matches its before-line, the
 * logs still show the slow step, and every check that depends on the fix fails.
 * This is the difference between a guided tour and a simulator.
 */
export function resolveVerification(
  config: MissionVerificationConfig,
  resolved: boolean,
): MissionVerificationConfig & { resolved: boolean } {
  if (resolved) return { ...config, resolved };

  return {
    ...config,
    resolved,
    metrics: config.metrics.map((m) => ({
      ...m,
      after: m.before,
      status: "fail" as const,
      delta: "No change",
      deltaTone: "neutral" as const,
    })),
    chart: { ...config.chart, after: [...config.chart.before] },
    requestBreakdown: config.unresolvedBreakdown,
    breakdownTotalMs: config.unresolvedBreakdownTotalMs,
    logs: config.unresolvedLogs,
    checks: config.checks.map((c) => ({
      ...c,
      passed: c.dependsOnFix === false ? c.passed : false,
    })),
    summary: config.unresolvedSummary,
  };
}

export type VerificationState = {
  run: boolean;
  completed: boolean;
};

/* ------------------------------- Content -------------------------------- */

const SIGNUP_LATENCY_VERIFICATION: MissionVerificationConfig = {
  missionId: "user-signup-latency-spike",

  metrics: [
    {
      id: "p95",
      label: "Signup API P95",
      before: "3.2s",
      after: "412ms",
      status: "pass",
      delta: "↓ 87% improvement",
      deltaTone: "good",
      icon: "trending",
      accent: "violet",
    },
    {
      id: "avg",
      label: "Signup API Avg",
      before: "2.0s",
      after: "298ms",
      status: "pass",
      delta: "↓ 85% improvement",
      deltaTone: "good",
      icon: "gauge",
      accent: "amber",
    },
    {
      id: "error-rate",
      label: "Error Rate",
      before: "0.03%",
      after: "0.02%",
      status: "pass",
      delta: "Stable",
      deltaTone: "neutral",
      icon: "shield",
      accent: "emerald",
    },
    {
      id: "email-queue-lag",
      label: "Email Queue Lag",
      before: "0s (sync)",
      after: "3.1s",
      status: "pass",
      delta: "Processing normally",
      deltaTone: "good",
      icon: "clock",
      accent: "electric",
    },
    {
      id: "throughput",
      label: "Throughput",
      before: "110 req/min",
      after: "152 req/min",
      status: "pass",
      delta: "↑ 38% increase",
      deltaTone: "good",
      icon: "activity",
      accent: "emerald",
    },
  ],

  chart: {
    caption: "Signup API Response Time (P95)",
    yMax: 4,
    unit: "s",
    xLabels: ["09:30", "09:45", "10:00", "10:15", "10:30", "10:45", "11:00"],
    fixLabel: "Fix Applied",
    fixFraction: 0.5,
    before: [2.9, 3.05, 2.95, 3.2, 3.1, 3.05, 3.2, 3.1],
    after: [3.1, 1.05, 0.68, 0.55, 0.5, 0.46, 0.44, 0.42],
  },

  requestBreakdown: [
    { label: "Validate Payload", durationMs: 12 },
    { label: "Hash Password", durationMs: 154 },
    { label: "Insert User", durationMs: 31 },
    { label: "Enqueue Welcome Email", durationMs: 18 },
  ],
  breakdownTotalMs: 215,

  logs: [
    "11:03:21.102 INFO POST /api/signup started",
    "11:03:21.114 INFO Validating signup payload",
    "11:03:21.236 INFO Password hash completed in 155ms",
    "11:03:21.272 INFO User record inserted in 31ms",
    "11:03:21.290 INFO Welcome email queued in 18ms",
    "11:03:21.292 INFO POST /api/signup completed in 215ms",
  ],

  checks: [
    { id: "latency", label: "Signup latency is back to normal", passed: true },
    {
      id: "database",
      label: "Database performance is healthy",
      passed: true,
      dependsOnFix: false,
    },
    {
      id: "email",
      label: "Email delivery is processed in the background",
      passed: true,
    },
    {
      id: "errors",
      label: "Error rate remains low",
      passed: true,
      dependsOnFix: false,
    },
    { id: "resolved", label: "The fix successfully resolved the issue", passed: true },
  ],

  summary: {
    headline: "Great work! Your fix has been verified successfully.",
    detail: "You can continue to the final results and earn your XP.",
  },

  unresolvedSummary: {
    headline: "Verification failed — signup latency is unchanged.",
    detail:
      "The change you applied didn't take the slow step off the request path. You can still continue to your results.",
  },

  /** Logs replayed when the fix didn't resolve the incident. */
  unresolvedLogs: [
    "11:03:21.102 INFO POST /api/signup started",
    "11:03:21.114 INFO Validating signup payload",
    "11:03:21.236 INFO Password hash completed in 155ms",
    "11:03:21.272 INFO User record inserted in 31ms",
    "11:03:23.943 WARN sendWelcomeEmail resolved after 2671ms",
    "11:03:23.945 INFO POST /api/signup completed in 2886ms",
  ],

  /** Request breakdown when the slow step is still on the critical path. */
  unresolvedBreakdown: [
    { label: "Validate Payload", durationMs: 12 },
    { label: "Hash Password", durationMs: 154 },
    { label: "Insert User", durationMs: 31 },
    { label: "Send Welcome Email", durationMs: 2671 },
  ],
  unresolvedBreakdownTotalMs: 2868,
};

const EVENT_LOOP_VERIFICATION: MissionVerificationConfig = {
  missionId: "event-loop-overload",

  metrics: [
    {
      id: "event-loop-lag",
      label: "Event Loop Lag (p95)",
      before: "6.8s",
      after: "35ms",
      status: "pass",
      delta: "↓ 99% improvement",
      deltaTone: "good",
      icon: "activity",
      accent: "violet",
    },
    {
      id: "api-p95",
      label: "API P95 (all routes)",
      before: "5.2s",
      after: "240ms",
      status: "pass",
      delta: "↓ 95% improvement",
      deltaTone: "good",
      icon: "trending",
      accent: "amber",
    },
    {
      id: "report-request",
      label: "Report Request Duration",
      before: "7.4s",
      after: "120ms",
      status: "pass",
      delta: "Accepted as a job",
      deltaTone: "good",
      icon: "clock",
      accent: "electric",
    },
    {
      id: "throughput",
      label: "Throughput",
      before: "85 req/min",
      after: "210 req/min",
      status: "pass",
      delta: "↑ 147% increase",
      deltaTone: "good",
      icon: "gauge",
      accent: "emerald",
    },
    {
      id: "timeout-rate",
      label: "Timeout Rate",
      before: "8.4%",
      after: "0.3%",
      status: "pass",
      delta: "↓ 96% improvement",
      deltaTone: "good",
      icon: "shield",
      accent: "emerald",
    },
    {
      id: "db-latency",
      label: "Database Query Time",
      before: "42ms",
      after: "43ms",
      status: "pass",
      delta: "Stable",
      deltaTone: "neutral",
      icon: "gauge",
      accent: "electric",
    },
  ],

  chart: {
    caption: "API Response Time across every endpoint (P95)",
    yMax: 6,
    unit: "s",
    xLabels: ["10:00", "10:15", "10:30", "10:45", "11:00", "11:15", "11:30"],
    fixLabel: "Fix Applied",
    fixFraction: 0.5,
    before: [5.0, 5.2, 5.15, 5.3, 5.2, 5.25, 5.2, 5.3],
    after: [5.3, 1.4, 0.62, 0.38, 0.3, 0.26, 0.25, 0.24],
  },

  requestBreakdown: [
    { label: "Auth Validation", durationMs: 8 },
    { label: "Queue Report Job", durationMs: 96 },
    { label: "Respond 202 Accepted", durationMs: 16 },
  ],
  breakdownTotalMs: 120,

  logs: [
    "10:52:03.118 INFO GET /api/reports/weekly 202 accepted  job=rpt_8241",
    "10:52:03.124 INFO report worker started  job=rpt_8241  records=480000",
    "10:52:03.131 INFO GET /api/health 200 4ms",
    "10:52:03.190 INFO GET /api/users/me 200 61ms",
    "10:52:09.842 INFO report worker finished  job=rpt_8241  duration_ms=6714",
    "10:52:09.845 INFO event_loop_lag_ms=31",
  ],

  checks: [
    {
      id: "event-loop",
      label: "Event-loop lag is back to normal",
      passed: true,
    },
    {
      id: "unrelated-endpoints",
      label: "Unrelated endpoints stay responsive",
      passed: true,
    },
    {
      id: "report-output",
      label: "The weekly report output is unchanged",
      passed: true,
    },
    {
      id: "worker-failures",
      label: "Worker failures are reported instead of crashing the request",
      passed: true,
    },
    {
      id: "database",
      label: "Database performance remains stable",
      passed: true,
      dependsOnFix: false,
    },
  ],

  summary: {
    headline: "Verified — the event loop is responsive again.",
    detail:
      "Reports still get built, but no longer at the cost of every other request. Continue to your results.",
  },

  unresolvedSummary: {
    headline: "Verification failed — the event loop is still blocked.",
    detail:
      "The change you applied left the aggregation on the main JavaScript thread. You can still continue to your results.",
  },

  /** Logs replayed when the fix didn't resolve the incident. */
  unresolvedLogs: [
    "10:52:03.118 INFO GET /api/reports/weekly started",
    "10:52:03.124 INFO building weekly report  records=480000",
    "10:52:07.955 WARN request timeout  path=/api/users/me  duration_ms=5033",
    "10:52:10.441 WARN GET /api/health 200 4948ms  (queued 4941ms)",
    "10:52:10.538 INFO weekly report generated  duration_ms=7414",
    "10:52:10.541 WARN event_loop_lag_ms=6802",
  ],

  /** Request breakdown while the aggregation still runs on the main thread. */
  unresolvedBreakdown: [
    { label: "Auth Validation", durationMs: 8 },
    { label: "Database Fetch", durationMs: 128 },
    { label: "Report Aggregation", durationMs: 7190 },
    { label: "Serialization", durationMs: 62 },
  ],
  unresolvedBreakdownTotalMs: 7388,
};

const PROMISE_CASCADE_VERIFICATION: MissionVerificationConfig = {
  missionId: "promise-all-cascade",

  metrics: [
    {
      id: "vendors-persisted",
      label: "Vendors Enriched",
      before: "0 / 48",
      after: "47 / 48",
      status: "pass",
      delta: "Successes are kept",
      deltaTone: "good",
      icon: "trending",
      accent: "violet",
    },
    {
      id: "run-success-rate",
      label: "Run Success Rate",
      before: "18%",
      after: "100%",
      status: "pass",
      delta: "Partial runs now complete",
      deltaTone: "good",
      icon: "shield",
      accent: "emerald",
    },
    {
      id: "wasted-calls",
      label: "Wasted Vendor Calls",
      before: "47 / run",
      after: "0 / run",
      status: "pass",
      delta: "↓ 100%",
      deltaTone: "good",
      icon: "gauge",
      accent: "amber",
    },
    {
      id: "failure-attribution",
      label: "Named Failures",
      before: "0 of 1",
      after: "1 of 1",
      status: "pass",
      delta: "Every failure is attributed",
      deltaTone: "good",
      icon: "activity",
      accent: "electric",
    },
    {
      id: "run-duration",
      label: "Run Duration",
      before: "2.1s",
      after: "2.2s",
      status: "pass",
      delta: "Stable",
      deltaTone: "neutral",
      icon: "clock",
      accent: "electric",
    },
  ],

  chart: {
    caption: "Vendor profiles persisted per nightly run",
    yMax: 50,
    unit: "",
    xLabels: ["Run 1", "Run 2", "Run 3", "Run 4", "Run 5", "Run 6", "Run 7"],
    fixLabel: "Fix Applied",
    fixFraction: 0.5,
    before: [0, 0, 48, 0, 0, 0, 0, 0],
    after: [0, 47, 47, 48, 47, 47, 48, 47],
  },

  requestBreakdown: [
    { label: "Start Run", durationMs: 24 },
    { label: "Settle 48 Vendor Calls", durationMs: 2032 },
    { label: "Persist 47 Profiles", durationMs: 118 },
    { label: "Record 1 Failure", durationMs: 9 },
  ],
  breakdownTotalMs: 2183,

  logs: [
    "02:00:00.104 INFO enrichment run started  run=r_4520  vendors=48",
    "02:00:00.812 WARN vendor fetch failed  vendor=northwind  status=503",
    "02:00:02.136 INFO all 48 vendor calls settled  fulfilled=47  rejected=1",
    "02:00:02.254 INFO persisted 47 vendor profiles",
    "02:00:02.263 WARN run completed with failures  run=r_4520  failed=[northwind]",
    "02:00:02.264 INFO enrichment run finished  run=r_4520  persisted=47",
  ],

  checks: [
    {
      id: "successes-kept",
      label: "Successful vendor results are persisted",
      passed: true,
    },
    {
      id: "one-failure-not-fatal",
      label: "One failing vendor no longer ends the run",
      passed: true,
    },
    {
      id: "failure-named",
      label: "The failing vendor is reported by name",
      passed: true,
    },
    {
      id: "no-wasted-work",
      label: "No vendor call completes with nowhere to go",
      passed: true,
    },
    {
      id: "vendor-health",
      label: "Vendor API health is unchanged",
      passed: true,
      dependsOnFix: false,
    },
  ],

  summary: {
    headline: "Verified — a broken vendor no longer costs you the run.",
    detail:
      "47 profiles were kept and northwind was reported by name. Continue to your results.",
  },

  unresolvedSummary: {
    headline: "Verification failed — the run still keeps nothing.",
    detail:
      "The batch still shares a single outcome, so one 503 discards every successful result. You can still continue to your results.",
  },

  unresolvedLogs: [
    "02:00:00.104 INFO enrichment run started  run=r_4520  vendors=48",
    "02:00:00.812 ERROR vendor fetch failed  vendor=northwind  status=503",
    '02:00:00.814 ERROR enrichment run failed  run=r_4520  reason="Request failed with status code 503"',
    "02:00:02.140 DEBUG vendor fetch ok  vendor=westgate  duration_ms=2032",
    "02:00:02.144 WARN run r_4520 already settled — discarding 47 vendor results",
    "02:00:02.150 INFO enrichment run finished  run=r_4520  persisted=0",
  ],

  unresolvedBreakdown: [
    { label: "Start Run", durationMs: 24 },
    { label: "Fetch Until First Rejection", durationMs: 790 },
    { label: "Run Marked Failed", durationMs: 2 },
    { label: "Orphaned Calls Still Finishing", durationMs: 1218 },
  ],
  unresolvedBreakdownTotalMs: 2034,
};

const ASYNC_MAP_VERIFICATION: MissionVerificationConfig = {
  missionId: "async-map-trap",

  metrics: [
    {
      id: "thumbnails-produced",
      label: "Thumbnails per Batch",
      before: "313 / 500",
      after: "500 / 500",
      status: "pass",
      delta: "Every upload processed",
      deltaTone: "good",
      icon: "trending",
      accent: "violet",
    },
    {
      id: "job-duration",
      label: "Job Duration",
      before: "14ms",
      after: "4.2s",
      status: "pass",
      delta: "Now reflects real work",
      deltaTone: "good",
      icon: "clock",
      accent: "amber",
    },
    {
      id: "failures-attributed",
      label: "Failures Attributed to a Job",
      before: "0%",
      after: "100%",
      status: "pass",
      delta: "Retryable instead of orphaned",
      deltaTone: "good",
      icon: "shield",
      accent: "emerald",
    },
    {
      id: "orphaned-operations",
      label: "Operations Outliving the Job",
      before: "187",
      after: "0",
      status: "pass",
      delta: "↓ 100%",
      deltaTone: "good",
      icon: "activity",
      accent: "electric",
    },
    {
      id: "worker-cpu",
      label: "Worker CPU",
      before: "9%",
      after: "46%",
      status: "pass",
      delta: "Bounded at concurrency 8",
      deltaTone: "neutral",
      icon: "gauge",
      accent: "electric",
    },
  ],

  chart: {
    caption: "Thumbnails produced per 500-file batch",
    yMax: 520,
    unit: "",
    xLabels: ["b_910", "b_911", "b_912", "b_913", "b_914", "b_915", "b_916"],
    fixLabel: "Fix Applied",
    fixFraction: 0.5,
    before: [318, 305, 313, 297, 311, 308, 316, 302],
    after: [313, 500, 500, 499, 500, 500, 500, 500],
  },

  requestBreakdown: [
    { label: "Read Pending Uploads", durationMs: 12 },
    { label: "Generate 500 Thumbnails (concurrency 8)", durationMs: 4048 },
    { label: "Attach Thumbnails", durationMs: 121 },
    { label: "Complete Batch", durationMs: 19 },
  ],
  breakdownTotalMs: 4200,

  logs: [
    "09:12:04.021 INFO job started  job=process-uploads  batch=b_916  files=500",
    "09:12:06.117 DEBUG progress  completed=240/500",
    "09:12:07.884 WARN thumbnail failed  file=IMG_0184.jpg  batch=b_916  retry=queued",
    "09:12:08.203 DEBUG progress  completed=500/500",
    "09:12:08.219 INFO job completed  job=process-uploads  batch=b_916  duration_ms=4198",
    "09:12:08.221 INFO batch summary  thumbnails=500  orphaned=0",
  ],

  checks: [
    {
      id: "job-waits",
      label: "The job finishes only when the work does",
      passed: true,
    },
    {
      id: "all-thumbnails",
      label: "Every upload in the batch has a thumbnail",
      passed: true,
    },
    {
      id: "failures-retryable",
      label: "A failed file is attributed to its batch and retried",
      passed: true,
    },
    {
      id: "no-orphans",
      label: "No operation outlives the job that started it",
      passed: true,
    },
    {
      id: "storage-healthy",
      label: "Storage writes remain error-free",
      passed: true,
      dependsOnFix: false,
    },
  ],

  summary: {
    headline: "Verified — the job now waits for the work it started.",
    detail:
      "All 500 thumbnails landed inside the job, and the one bad file was queued for retry. Continue to your results.",
  },

  unresolvedSummary: {
    headline: "Verification failed — the job still finishes before the work.",
    detail:
      "The mapped promises are still unowned, so the batch reports success in milliseconds and uploads are still dropped. You can still continue to your results.",
  },

  unresolvedLogs: [
    "09:12:04.021 INFO job started  job=process-uploads  batch=b_916  files=500",
    "09:12:04.035 INFO job completed  job=process-uploads  batch=b_916  duration_ms=14",
    "09:12:04.402 DEBUG thumbnail written  file=IMG_0001.jpg  duration_ms=381",
    "09:12:06.884 ERROR thumbnail failed  file=IMG_0184.jpg  batch=unknown",
    "09:12:06.885 WARN batch b_916 already reported success — error not attributed to a job",
    "09:12:12.006 WARN worker recycled after idle timeout — 187 operations still pending",
  ],

  unresolvedBreakdown: [
    { label: "Read Pending Uploads", durationMs: 12 },
    { label: "Start 500 Thumbnail Promises", durationMs: 2 },
    { label: "Complete Batch", durationMs: 14 },
    { label: "Detached Work, Outside the Job", durationMs: 7978 },
  ],
  unresolvedBreakdownTotalMs: 8006,
};

const SCHEDULER_OVERLAP_VERIFICATION: MissionVerificationConfig = {
  missionId: "overlapping-scheduler-runs",

  metrics: [
    {
      id: "duplicate-charges",
      label: "Duplicate Charges (24h)",
      before: "38",
      after: "0",
      status: "pass",
      delta: "↓ 100%",
      deltaTone: "good",
      icon: "shield",
      accent: "emerald",
    },
    {
      id: "concurrent-runs",
      label: "Concurrent Runs (peak)",
      before: "2",
      after: "1",
      status: "pass",
      delta: "Runs can no longer overlap",
      deltaTone: "good",
      icon: "activity",
      accent: "violet",
    },
    {
      id: "invoices-charged-twice",
      label: "Invoices Read by Two Runs",
      before: "412",
      after: "0",
      status: "pass",
      delta: "Each run sees fresh state",
      deltaTone: "good",
      icon: "trending",
      accent: "amber",
    },
    {
      id: "sync-cadence",
      label: "Effective Sync Cadence",
      before: "60s (nominal)",
      after: "155s (95s run + 60s gap)",
      status: "warning",
      delta: "Paced by run duration",
      deltaTone: "neutral",
      icon: "clock",
      accent: "electric",
    },
    {
      id: "run-duration-metric",
      label: "Sync Run Duration",
      before: "95s",
      after: "95s",
      status: "pass",
      delta: "Unchanged — this fix is about ordering",
      deltaTone: "neutral",
      icon: "gauge",
      accent: "electric",
    },
  ],

  chart: {
    caption: "Duplicate charges per hour",
    yMax: 6,
    unit: "",
    xLabels: ["02:00", "02:30", "03:00", "03:30", "04:00", "04:30", "05:00"],
    fixLabel: "Fix Applied",
    fixFraction: 0.5,
    before: [4, 5, 4, 5, 4, 5, 4, 5],
    after: [4, 1, 0, 0, 0, 0, 0, 0],
  },

  requestBreakdown: [
    { label: "Start Run", durationMs: 180 },
    { label: "Read Pending Invoices", durationMs: 640 },
    { label: "Charge 412 Invoices", durationMs: 93800 },
    { label: "Complete Run", durationMs: 220 },
  ],
  breakdownTotalMs: 94840,

  logs: [
    "05:00:00.008 INFO sync run started  run=s_920  instance=billing-sync-7d9c",
    "05:00:31.442 INFO invoice charged  invoice=INV-20418  run=s_920",
    "05:01:00.004 DEBUG tick skipped — previous run still in progress",
    "05:01:34.902 INFO sync run finished  run=s_920  duration_ms=94894  invoices=412",
    "05:02:34.907 INFO sync run started  run=s_921  instance=billing-sync-7d9c",
    "05:02:35.140 DEBUG pending invoices  count=0  (s_920 marked all 412)",
  ],

  checks: [
    {
      id: "no-overlap",
      label: "A run never starts while another is in progress",
      passed: true,
    },
    {
      id: "no-duplicate-charges",
      label: "No invoice is charged twice",
      passed: true,
    },
    {
      id: "fresh-pending-list",
      label: "Each run reads the pending list after the last one finished",
      passed: true,
    },
    {
      id: "failures-do-not-stop-scheduling",
      label: "A failed run still schedules the next one",
      passed: true,
    },
    {
      id: "provider-unchanged",
      label: "Payment provider delivery is unchanged",
      passed: true,
      dependsOnFix: false,
    },
  ],

  summary: {
    headline: "Verified — runs are serialised and the duplicates have stopped.",
    detail:
      "The sync is now paced by its own completion rather than the clock. Continue to your results.",
  },

  unresolvedSummary: {
    headline: "Verification failed — runs still overlap.",
    detail:
      "The schedule is still driven by the clock, so a 95-second run still collides with the next tick and re-charges the same invoices. You can still continue to your results.",
  },

  unresolvedLogs: [
    "05:00:00.008 INFO sync run started  run=s_920  instance=billing-sync-7d9c",
    "05:00:31.442 INFO invoice charged  invoice=INV-20418  run=s_920",
    "05:01:00.007 INFO sync run started  run=s_921  instance=billing-sync-7d9c",
    "05:01:00.009 WARN previous run s_920 still in progress (60002ms elapsed)",
    "05:01:12.883 INFO invoice charged  invoice=INV-20418  run=s_921",
    "05:01:35.104 INFO sync run finished  run=s_920  duration_ms=95096  invoices=412",
  ],

  unresolvedBreakdown: [
    { label: "Run s_920 — Charging", durationMs: 95096 },
    { label: "Run s_921 — Started at 60s, Overlapping", durationMs: 34000 },
    { label: "INV-20418 Charged Twice", durationMs: 476 },
  ],
  unresolvedBreakdownTotalMs: 129572,
};

const REJECTION_STORM_VERIFICATION: MissionVerificationConfig = {
  missionId: "unhandled-rejection-storm",

  metrics: [
    {
      id: "restarts",
      label: "Process Restarts (1h)",
      before: "41",
      after: "0",
      status: "pass",
      delta: "↓ 100%",
      deltaTone: "good",
      icon: "shield",
      accent: "emerald",
    },
    {
      id: "unhandled-rejections",
      label: "Unhandled Rejections (1h)",
      before: "41",
      after: "0",
      status: "pass",
      delta: "Every rejection has an owner",
      deltaTone: "good",
      icon: "activity",
      accent: "violet",
    },
    {
      id: "stranded-messages",
      label: "Messages Stranded",
      before: "214 / crash",
      after: "0",
      status: "pass",
      delta: "Failures are marked, not lost",
      deltaTone: "good",
      icon: "trending",
      accent: "amber",
    },
    {
      id: "delivery-success",
      label: "Delivery Success Rate",
      before: "61%",
      after: "96.6%",
      status: "pass",
      delta: "Matches provider health",
      deltaTone: "good",
      icon: "gauge",
      accent: "electric",
    },
    {
      id: "uptime",
      label: "Uptime Between Restarts",
      before: "88s",
      after: "> 6h",
      status: "pass",
      delta: "Crash loop cleared",
      deltaTone: "good",
      icon: "clock",
      accent: "electric",
    },
  ],

  chart: {
    caption: "Process restarts per 30 minutes",
    yMax: 25,
    unit: "",
    xLabels: ["13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"],
    fixLabel: "Fix Applied",
    fixFraction: 0.5,
    before: [19, 21, 20, 22, 19, 21, 20, 22],
    after: [20, 3, 0, 0, 0, 0, 0, 0],
  },

  requestBreakdown: [
    { label: "Validate + Enqueue", durationMs: 14 },
    { label: "HTTP 202 Returned", durationMs: 4 },
    { label: "Detached: Provider Send", durationMs: 1784 },
    { label: "Mark Delivered or Failed", durationMs: 11 },
  ],
  breakdownTotalMs: 1813,

  logs: [
    "16:41:07.114 INFO POST /api/notifications 202 18ms  request=req_91004",
    "16:41:08.902 WARN push provider responded 500  provider=apns  notification=n_6120",
    "16:41:08.904 WARN delivery failed  notification=n_6120  marked=failed  retry=queued",
    "16:41:08.906 INFO process healthy  uptime_s=21847",
    "16:41:12.330 INFO delivery succeeded on retry  notification=n_6120  attempt=2",
    "16:41:12.331 INFO outbox  pending=0  failed=0  delivered=1382",
  ],

  checks: [
    {
      id: "no-crash",
      label: "A provider failure no longer ends the process",
      passed: true,
    },
    {
      id: "no-unhandled",
      label: "No rejection escapes the async boundary",
      passed: true,
    },
    {
      id: "message-preserved",
      label: "A failed delivery is marked and stays retryable",
      passed: true,
    },
    {
      id: "requests-unaffected",
      label: "Notification requests still return 202 immediately",
      passed: true,
      dependsOnFix: false,
    },
    {
      id: "provider-health",
      label: "Provider error rate is unchanged",
      passed: true,
      dependsOnFix: false,
    },
  ],

  summary: {
    headline: "Verified — the service survives a failing provider.",
    detail:
      "Deliveries now fail individually and stay retryable instead of taking the process with them. Continue to your results.",
  },

  unresolvedSummary: {
    headline: "Verification failed — the process is still exiting.",
    detail:
      "The rejection still has no owner, so Node still terminates the process and every queued message is still stranded. You can still continue to your results.",
  },

  unresolvedLogs: [
    "16:41:07.114 INFO POST /api/notifications 202 18ms  request=req_91004",
    "16:41:08.902 ERROR push provider responded 500  provider=apns  notification=n_6120",
    "16:41:08.903 ERROR [UnhandledPromiseRejection] Error: apns delivery failed",
    "16:41:08.911 ERROR process exiting  code=1",
    "16:41:11.240 INFO notification-service starting  version=2.4.1  node=v20.11.1",
    "16:41:11.244 WARN outbox contains 214 messages left pending by the previous process",
  ],

  unresolvedBreakdown: [
    { label: "Validate + Enqueue", durationMs: 14 },
    { label: "HTTP 202 Returned", durationMs: 4 },
    { label: "Detached: Provider Send (rejected)", durationMs: 1784 },
    { label: "Process Exit", durationMs: 9 },
  ],
  unresolvedBreakdownTotalMs: 1811,
};

const JWT_REFRESH_RACE_VERIFICATION: MissionVerificationConfig = {
  missionId: "jwt-session-expiry",

  metrics: [
    {
      id: "refresh-per-expiry",
      label: "Refresh Calls Per Token Expiry",
      before: "4.8",
      after: "1.0",
      status: "pass",
      delta: "One refresh per expiry",
      deltaTone: "good",
      icon: "activity",
      accent: "violet",
    },
    {
      id: "reuse-rejections",
      label: "Refresh 401 token_reused (1h)",
      before: "1,842",
      after: "0",
      status: "pass",
      delta: "↓ 100%",
      deltaTone: "good",
      icon: "shield",
      accent: "emerald",
    },
    {
      id: "forced-logouts",
      label: "Forced Logout Rate",
      before: "6.1%",
      after: "0.02%",
      status: "pass",
      delta: "Only genuine expiries remain",
      deltaTone: "good",
      icon: "trending",
      accent: "amber",
    },
    {
      id: "session-continuity",
      label: "Sessions Surviving a Token Expiry",
      before: "93.9%",
      after: "99.98%",
      status: "pass",
      delta: "Refresh is transparent again",
      deltaTone: "good",
      icon: "gauge",
      accent: "electric",
    },
    {
      id: "dashboard-recovery",
      label: "Dashboard Recovery After Expiry",
      before: "logout",
      after: "412ms",
      status: "pass",
      delta: "Six calls resume on one refresh",
      deltaTone: "good",
      icon: "clock",
      accent: "electric",
    },
  ],

  chart: {
    caption: "Forced logouts per 5 minutes",
    yMax: 40,
    unit: "",
    xLabels: ["09:00", "09:10", "09:20", "09:30", "09:40", "09:50", "10:00"],
    fixLabel: "Fix Applied",
    fixFraction: 0.5,
    before: [29, 31, 28, 33, 30, 32, 29, 31],
    after: [30, 6, 1, 0, 0, 1, 0, 0],
  },

  requestBreakdown: [
    { label: "Six Parallel Calls → 401", durationMs: 46 },
    { label: "Single Shared Refresh", durationMs: 63 },
    { label: "Five Callers Await It", durationMs: 4 },
    { label: "All Six Requests Replayed", durationMs: 299 },
  ],
  breakdownTotalMs: 412,

  logs: [
    "10:22:14.118 INFO GET /api/dashboard/summary 401 token_expired  session=sess_8120",
    "10:22:14.119 DEBUG refresh already in flight — awaiting shared promise  waiters=5",
    "10:22:14.181 INFO POST /auth/refresh 200 rotated  family=fam_B04  old=rt_2d8  new=rt_5e1",
    "10:22:14.183 INFO 6 requests resumed with the new access token  session=sess_8120",
    "10:22:14.186 INFO refresh-token reuse detections in window: 0",
    "10:22:14.430 INFO dashboard load complete 412ms  session=sess_8120  logouts=0",
  ],

  checks: [
    {
      id: "single-refresh",
      label: "Concurrent 401s produce exactly one refresh call",
      passed: true,
    },
    {
      id: "no-reuse",
      label: "No superseded refresh token is ever presented",
      passed: true,
    },
    {
      id: "session-survives",
      label: "A valid session survives an access-token expiry",
      passed: true,
    },
    {
      id: "rotation-intact",
      label: "Refresh-token rotation still issues a new token every time",
      passed: true,
      dependsOnFix: false,
    },
    {
      id: "reuse-detection-intact",
      label: "Reuse detection still revokes a genuinely replayed token",
      passed: true,
      dependsOnFix: false,
    },
    {
      id: "token-lifetime-unchanged",
      label: "Access-token lifetime is still 15 minutes",
      passed: true,
      dependsOnFix: false,
    },
  ],

  summary: {
    headline: "Verified — one expiry now costs one refresh.",
    detail:
      "Parallel requests share a single refresh and resume together, with rotation and reuse detection untouched. Continue to your results.",
  },

  unresolvedSummary: {
    headline: "Verification failed — sessions are still being revoked.",
    detail:
      "Concurrent requests still refresh independently, so a superseded token is still presented and the family is still revoked. You can still continue to your results.",
  },

  unresolvedLogs: [
    "10:22:14.118 INFO GET /api/dashboard/summary 401 token_expired  session=sess_8120",
    "10:22:14.134 INFO POST /auth/refresh 200 rotated  family=fam_B04  old=rt_2d8  new=rt_5e1",
    "10:22:14.137 WARN POST /auth/refresh 401 token_reused  presented=rt_2d8",
    "10:22:14.141 WARN POST /auth/refresh 401 token_reused  presented=rt_2d8",
    "10:22:14.142 ERROR refresh-token reuse detected — revoking family fam_B04",
    "10:22:14.148 INFO session invalidated  session=sess_8120  reason=refresh_token_reuse",
  ],

  unresolvedBreakdown: [
    { label: "Six Parallel Calls → 401", durationMs: 46 },
    { label: "Five Independent Refreshes", durationMs: 63 },
    { label: "Four Rejected As Reuse", durationMs: 58 },
    { label: "Family Revoked → Logout", durationMs: 19 },
  ],
  unresolvedBreakdownTotalMs: 186,
};

const HEALTH_CHECK_VERIFICATION: MissionVerificationConfig = {
  missionId: "health-check-flapping",

  metrics: [
    {
      id: "restarts",
      label: "Container Restarts (30m)",
      before: "37",
      after: "0",
      status: "pass",
      delta: "↓ 100%",
      deltaTone: "good",
      icon: "shield",
      accent: "emerald",
    },
    {
      id: "healthy-instances",
      label: "Healthy Instances",
      before: "3 / 8",
      after: "8 / 8",
      status: "pass",
      delta: "Capacity restored",
      deltaTone: "good",
      icon: "trending",
      accent: "violet",
    },
    {
      id: "api-5xx",
      label: "Orders API 5xx Rate",
      before: "11.4%",
      after: "0.2%",
      status: "pass",
      delta: "Back to baseline",
      deltaTone: "good",
      icon: "gauge",
      accent: "amber",
    },
    {
      id: "liveness-latency",
      label: "Liveness Probe p95",
      before: "5.1s",
      after: "3ms",
      status: "pass",
      delta: "No external I/O on the liveness path",
      deltaTone: "good",
      icon: "clock",
      accent: "electric",
    },
    {
      id: "readiness-latency",
      label: "Readiness Probe p95",
      before: "5.1s",
      after: "504ms",
      status: "pass",
      delta: "Bounded per-dependency timeouts",
      deltaTone: "good",
      icon: "activity",
      accent: "electric",
    },
  ],

  chart: {
    caption: "Healthy instances out of 8",
    yMax: 10,
    unit: "",
    xLabels: ["11:00", "11:10", "11:20", "11:30", "11:40", "11:50", "12:00"],
    fixLabel: "Fix Applied",
    fixFraction: 0.5,
    before: [4, 3, 3, 4, 3, 3, 4, 3],
    after: [3, 6, 8, 8, 8, 8, 8, 8],
  },

  requestBreakdown: [
    { label: "GET /live — process only", durationMs: 3 },
    { label: "GET /ready — db select 1", durationMs: 4 },
    { label: "GET /ready — payments (bounded 500ms)", durationMs: 61 },
    { label: "GET /ready — messaging (bounded 500ms)", durationMs: 88 },
  ],
  breakdownTotalMs: 156,

  logs: [
    "12:14:02.006 INFO GET /live 200 3ms  instance=i-4f21  probe=liveness",
    "12:14:02.008 WARN analytics provider still degraded  elapsed_ms=5001  on_request_path=false",
    "12:14:02.010 INFO GET /ready 200 153ms  instance=i-4f21  db=ok payments=ok messaging=ok",
    "12:14:02.012 INFO GET /api/orders 200 39ms  instance=i-4f21",
    "12:14:02.180 INFO capacity  healthy_instances=8/8  api_5xx_rate=0.2%",
    "12:14:02.181 INFO restarts in the last 30 minutes: 0",
  ],

  checks: [
    {
      id: "no-restarts",
      label: "A slow third party no longer restarts the container",
      passed: true,
    },
    {
      id: "liveness-local",
      label: "Liveness answers without calling any external dependency",
      passed: true,
    },
    {
      id: "readiness-bounded",
      label: "Readiness checks are bounded and cannot outlive their timeout",
      passed: true,
    },
    {
      id: "capacity-holds",
      label: "Capacity holds while a dependency is degraded",
      passed: true,
    },
    {
      id: "orders-path-unaffected",
      label: "The order path never touched analytics and still does not",
      passed: true,
      dependsOnFix: false,
    },
    {
      id: "database-still-healthy",
      label: "Database and connection pool remain healthy",
      passed: true,
      dependsOnFix: false,
    },
  ],

  summary: {
    headline: "Verified — a degraded dependency no longer restarts the fleet.",
    detail:
      "Liveness reports on the process, readiness reports on the ability to serve, and the analytics provider is still slow without costing anything. Continue to your results.",
  },

  unresolvedSummary: {
    headline: "Verification failed — instances are still cycling.",
    detail:
      "The liveness probe still waits on an external dependency, so the platform still reads a slow third party as a dead process. You can still continue to your results.",
  },

  unresolvedLogs: [
    "12:14:02.006 INFO GET /health start  instance=i-4f21  probe=liveness",
    "12:14:07.008 ERROR analytics dependency timed out  elapsed_ms=5002",
    "12:14:07.161 ERROR GET /health 503  elapsed_ms=5155  probe_timeout_ms=3000",
    "12:14:07.163 INFO GET /api/orders 200 41ms  instance=i-4f21",
    "12:14:07.240 WARN liveness probe failed 3/3  instance=i-4f21  action=restart",
    "12:14:07.420 WARN capacity  healthy_instances=3/8  api_5xx_rate=11.4%",
  ],

  unresolvedBreakdown: [
    { label: "db select 1", durationMs: 4 },
    { label: "payments.ping", durationMs: 61 },
    { label: "messaging.ping", durationMs: 88 },
    { label: "analytics.getAccountSummary (timeout)", durationMs: 5002 },
  ],
  unresolvedBreakdownTotalMs: 5155,
};

const GRACEFUL_SHUTDOWN_VERIFICATION: MissionVerificationConfig = {
  missionId: "graceful-shutdown-bug",

  metrics: [
    {
      id: "deploy-5xx",
      label: "5xx Rate During Deploys",
      before: "8.7%",
      after: "0.04%",
      status: "pass",
      delta: "Matches steady-state traffic",
      deltaTone: "good",
      icon: "gauge",
      accent: "emerald",
    },
    {
      id: "dropped-requests",
      label: "Requests Dropped Per Deploy",
      before: "23",
      after: "0",
      status: "pass",
      delta: "↓ 100%",
      deltaTone: "good",
      icon: "shield",
      accent: "violet",
    },
    {
      id: "rolled-back",
      label: "Transactions Rolled Back By Disconnect",
      before: "23",
      after: "0",
      status: "pass",
      delta: "Every checkout reaches COMMIT",
      deltaTone: "good",
      icon: "trending",
      accent: "amber",
    },
    {
      id: "job-redeliveries",
      label: "Queue Redeliveries Per Deploy",
      before: "31",
      after: "0",
      status: "pass",
      delta: "Nothing is acked before it finishes",
      deltaTone: "good",
      icon: "activity",
      accent: "electric",
    },
    {
      id: "drain-time",
      label: "SIGTERM → Exit",
      before: "4ms",
      after: "6.2s",
      status: "pass",
      delta: "Bounded at 25s, inside the 30s window",
      deltaTone: "good",
      icon: "clock",
      accent: "electric",
    },
  ],

  chart: {
    caption: "5xx rate per minute across a deploy (%)",
    yMax: 10,
    unit: "%",
    xLabels: ["-3m", "-2m", "-1m", "deploy", "+1m", "+2m", "+3m"],
    fixLabel: "Fix Applied",
    fixFraction: 0.5,
    before: [0, 0.1, 0, 8.7, 6.2, 0.1, 0, 0],
    after: [0, 0, 0.1, 0.04, 0.04, 0, 0, 0],
  },

  requestBreakdown: [
    { label: "Validate Cart", durationMs: 11 },
    { label: "Reserve Inventory", durationMs: 38 },
    { label: "Authorize Payment", durationMs: 121 },
    { label: "Insert Order Row", durationMs: 27 },
    { label: "COMMIT (completed during drain)", durationMs: 17 },
  ],
  breakdownTotalMs: 214,

  logs: [
    "04:08:41.002 INFO SIGTERM received  instance=i-2b90  rollout=5.3.1 → 5.3.2",
    "04:08:41.003 INFO readiness set to false — load balancer draining",
    "04:08:41.004 INFO queue consumers stopped  prefetch=0  in_flight_jobs=6",
    "04:08:41.006 INFO server closed to new connections  active_requests=23",
    "04:08:47.180 INFO drain complete  requests_finished=23  jobs_finished=6  timed_out=0",
    "04:08:47.201 INFO database pool closed — process.exit(0)  drain_ms=6199",
  ],

  checks: [
    {
      id: "no-dropped-requests",
      label: "In-flight requests finish before the process exits",
      passed: true,
    },
    {
      id: "readiness-first",
      label: "New traffic stops before the server closes",
      passed: true,
    },
    {
      id: "transactions-commit",
      label: "Open transactions reach COMMIT instead of rolling back",
      passed: true,
    },
    {
      id: "jobs-complete",
      label: "No job is acknowledged before its work completes",
      passed: true,
    },
    {
      id: "bounded-exit",
      label: "Shutdown is bounded and exits inside the platform's window",
      passed: true,
    },
    {
      id: "steady-traffic-unchanged",
      label: "Error rate outside deploy windows is unchanged",
      passed: true,
      dependsOnFix: false,
    },
    {
      id: "database-unchanged",
      label: "Database latency and failover count are unchanged",
      passed: true,
      dependsOnFix: false,
    },
  ],

  summary: {
    headline: "Verified — the rollout no longer costs a single request.",
    detail:
      "Traffic stops first, in-flight work finishes, resources close last, and the process exits well inside its grace period. Continue to your results.",
  },

  unresolvedSummary: {
    headline: "Verification failed — deploys are still dropping requests.",
    detail:
      "The process still ends before its work does, so in-flight requests are still cut and jobs are still acknowledged without finishing. You can still continue to your results.",
  },

  unresolvedLogs: [
    "04:08:41.002 INFO SIGTERM received  instance=i-2b90  rollout=5.3.1 → 5.3.2",
    "04:08:41.003 INFO closing database pool",
    "04:08:41.006 INFO process.exit(0)  uptime_s=86214",
    "04:08:41.006 WARN 23 requests were in flight when the process exited",
    "04:08:41.009 ERROR transaction rolled back by client disconnect  order=o_9931",
    "04:08:45.140 WARN job redelivered  job=j_4410  attempt=2  reason=ack_without_completion",
  ],

  unresolvedBreakdown: [
    { label: "Validate Cart", durationMs: 11 },
    { label: "Reserve Inventory", durationMs: 38 },
    { label: "Authorize Payment", durationMs: 121 },
    { label: "Insert Order Row", durationMs: 27 },
    { label: "COMMIT — interrupted, rolled back", durationMs: 17 },
  ],
  unresolvedBreakdownTotalMs: 214,
};

const RATE_LIMITER_RACE_VERIFICATION: MissionVerificationConfig = {
  missionId: "rate-limiter-race",

  metrics: [
    {
      id: "allowed-per-window",
      label: "Requests Allowed Per Window",
      before: "147",
      after: "100",
      status: "pass",
      delta: "Exactly the configured limit",
      deltaTone: "good",
      icon: "shield",
      accent: "emerald",
    },
    {
      id: "overshoot",
      label: "Overshoot Above Limit",
      before: "+47%",
      after: "0%",
      status: "pass",
      delta: "↓ 100%",
      deltaTone: "good",
      icon: "trending",
      accent: "violet",
    },
    {
      id: "lost-increments",
      label: "Lost Increments Per Minute",
      before: "35",
      after: "0",
      status: "pass",
      delta: "Every request counts once",
      deltaTone: "good",
      icon: "activity",
      accent: "amber",
    },
    {
      id: "instance-independence",
      label: "Overshoot At 8 Instances",
      before: "47%",
      after: "0%",
      status: "pass",
      delta: "Independent of replica count",
      deltaTone: "good",
      icon: "gauge",
      accent: "electric",
    },
    {
      id: "limiter-latency",
      label: "Limiter Overhead Per Request",
      before: "5ms (2 round trips)",
      after: "2ms (1 round trip)",
      status: "pass",
      delta: "One atomic call replaces get + set",
      deltaTone: "good",
      icon: "clock",
      accent: "electric",
    },
  ],

  chart: {
    caption: "Requests allowed per 1-minute window against a limit of 100",
    yMax: 160,
    unit: "",
    xLabels: ["15:04", "15:05", "15:06", "15:07", "15:08", "15:09", "15:10"],
    fixLabel: "Fix Applied",
    fixFraction: 0.5,
    before: [131, 142, 147, 139, 144, 147, 141, 146],
    after: [143, 108, 100, 100, 100, 100, 100, 100],
  },

  requestBreakdown: [
    { label: "i-01 incrementAndExpire → 98", durationMs: 2 },
    { label: "i-04 incrementAndExpire → 99", durationMs: 2 },
    { label: "i-07 incrementAndExpire → 100", durationMs: 2 },
    { label: "i-02 incrementAndExpire → 101 → 429", durationMs: 2 },
  ],
  breakdownTotalMs: 8,

  logs: [
    "16:31:33.201 DEBUG rate-limit incr  key=rl:client_88:1min  count=98   instance=i-01",
    "16:31:33.202 DEBUG rate-limit incr  key=rl:client_88:1min  count=99   instance=i-04",
    "16:31:33.202 DEBUG rate-limit incr  key=rl:client_88:1min  count=100  instance=i-07",
    "16:31:33.203 INFO  request rejected 429  key=rl:client_88:1min  count=101  instance=i-02",
    "16:31:34.000 INFO  window closed  key=rl:client_88:1min  stored=100  allowed=100  limit=100",
    "16:31:34.002 INFO  lost increments in window: 0  instances=8",
  ],

  checks: [
    {
      id: "limit-enforced",
      label: "No client is allowed more than the configured limit",
      passed: true,
    },
    {
      id: "no-lost-increments",
      label: "Every allowed request increments the counter exactly once",
      passed: true,
    },
    {
      id: "atomic-operation",
      label: "The counter is never read and written as separate steps",
      passed: true,
    },
    {
      id: "scale-independent",
      label: "The result is identical at 1, 3 and 8 instances",
      passed: true,
    },
    {
      id: "store-health-unchanged",
      label: "Shared store latency and error rate are unchanged",
      passed: true,
      dependsOnFix: false,
    },
    {
      id: "api-latency-unchanged",
      label: "API latency is unchanged for allowed requests",
      passed: true,
      dependsOnFix: false,
    },
  ],

  summary: {
    headline: "Verified — the limit means the same thing at any scale.",
    detail:
      "The store performs the increment atomically, so eight instances enforce the limit exactly as one did. Continue to your results.",
  },

  unresolvedSummary: {
    headline: "Verification failed — clients still exceed the limit.",
    detail:
      "The counter is still read, incremented and written as separate steps, so concurrent instances still overwrite each other's increments. You can still continue to your results.",
  },

  unresolvedLogs: [
    "16:31:33.201 DEBUG rate-limit read  key=rl:client_88:1min  value=97  instance=i-01",
    "16:31:33.202 DEBUG rate-limit read  key=rl:client_88:1min  value=97  instance=i-04",
    "16:31:33.205 INFO  request allowed  key=rl:client_88:1min  wrote=98  instance=i-01",
    "16:31:33.206 INFO  request allowed  key=rl:client_88:1min  wrote=98  instance=i-04",
    "16:31:34.000 WARN  window closed  stored=112  allowed=147  limit=100",
    "16:31:34.002 WARN  lost increments in window: 35  instances=8",
  ],

  unresolvedBreakdown: [
    { label: "i-01 get → 97", durationMs: 3 },
    { label: "i-04 get → 97", durationMs: 3 },
    { label: "i-01 set 98", durationMs: 4 },
    { label: "i-04 set 98 (overwrites)", durationMs: 4 },
  ],
  unresolvedBreakdownTotalMs: 14,
};

/* ------------------------------- Registry ------------------------------- */

/**
 * Verification content is authored per mission — the before/after numbers and
 * checks only mean something against that mission's fix. The route looks a
 * mission up by slug; missions without an entry fall back to the reserved-route
 * state, exactly like the earlier stages.
 */
const MEMORY_LEAK_VERIFICATION: MissionVerificationConfig = {
  missionId: "memory-leak-worker",

  metrics: [
    {
      id: "heap-after-4h",
      label: "Worker Heap After 4h",
      before: "1.42 GB",
      after: "214 MB",
      status: "pass",
      delta: "Returns to baseline between batches",
      deltaTone: "good",
      icon: "gauge",
      accent: "emerald",
    },
    {
      id: "listener-count",
      label: "Registered Listeners",
      before: "8,412",
      after: "3",
      status: "pass",
      delta: "Flat regardless of jobs processed",
      deltaTone: "good",
      icon: "activity",
      accent: "violet",
    },
    {
      id: "gc-reclaim",
      label: "Reclaimed Per Major GC",
      before: "24 MB",
      after: "196 MB",
      status: "pass",
      delta: "The collector can free what jobs allocate again",
      deltaTone: "good",
      icon: "trending",
      accent: "amber",
    },
    {
      id: "worker-restarts",
      label: "Memory Restarts / 24h",
      before: "7",
      after: "0",
      status: "pass",
      delta: "↓ 100%",
      deltaTone: "good",
      icon: "shield",
      accent: "electric",
    },
    {
      id: "job-duration",
      label: "Mean Job Duration",
      before: "3,712ms",
      after: "3,668ms",
      status: "pass",
      delta: "Unchanged — image work was never the problem",
      deltaTone: "neutral",
      icon: "clock",
      accent: "electric",
    },
  ],

  chart: {
    caption: "Worker old-space heap, MB — four hours of continuous image jobs",
    yMax: 1500,
    unit: "MB",
    xLabels: ["0h", "1h", "2h", "3h", "4h"],
    fixLabel: "Fix Applied",
    fixFraction: 0.5,
    before: [182, 371, 592, 848, 1104, 1382, 1421],
    after: [182, 208, 197, 214, 203, 211, 206],
  },

  requestBreakdown: [
    { label: "decode source image", durationMs: 398 },
    { label: "resize + encode variants", durationMs: 2790 },
    { label: "upload variants to storage", durationMs: 452 },
    { label: "finally → worker.off('progress')", durationMs: 1 },
    { label: "retained after completion: 0 bytes", durationMs: 0 },
  ],
  breakdownTotalMs: 3668,

  logs: [
    "07:12:03.114 INFO  job start  id=img_52001  bytes=2118400  concurrency=4/4",
    "07:12:06.782 INFO  job done   id=img_52001  ms=3668  status=ok",
    "07:12:06.783 DEBUG worker listeners after job: progress=1  error=1  exit=1",
    "08:44:19.006 INFO  queue drained  active_jobs=0  pending=0",
    "08:44:59.512 INFO  idle 40s  active_jobs=0  heapUsed=206MB  rss=291MB  (baseline 180MB)",
    "11:12:00.000 INFO  4h uptime  heapUsed=214MB  jobs_processed=8,400  restarts=0",
  ],

  checks: [
    {
      id: "listeners-removed",
      label: "Every job removes the listener it registered",
      passed: true,
    },
    {
      id: "heap-returns-to-baseline",
      label: "Heap returns to its baseline once the queue drains",
      passed: true,
    },
    {
      id: "no-full-payload-retained",
      label: "No completed job's payload or image buffer is still reachable",
      passed: true,
    },
    {
      id: "diagnostic-history-bounded",
      label: "Recent-job history is bounded and holds metadata only",
      passed: true,
    },
    {
      id: "no-memory-restarts",
      label: "No worker is recycled for memory pressure over 24 hours",
      passed: true,
    },
    {
      id: "job-output-unchanged",
      label: "Image output and job success rate are unchanged",
      passed: true,
      dependsOnFix: false,
    },
    {
      id: "downstream-unchanged",
      label: "Storage and database latency are unchanged",
      passed: true,
      dependsOnFix: false,
    },
  ],

  summary: {
    headline: "Verified — the heap is flat across four hours of jobs.",
    detail:
      "Listener count stays at one per event and heap returns to baseline whenever the queue drains. The worker ran a full day without a single memory restart.",
  },

  unresolvedSummary: {
    headline: "Verification failed — the worker is still growing.",
    detail:
      "Listeners are still accumulating one per job, and the heap has not returned to baseline during any idle window. You can still continue to your results.",
  },

  unresolvedLogs: [
    "07:12:03.114 INFO  job start  id=img_52001  bytes=2118400  concurrency=4/4",
    "07:12:06.826 INFO  job done   id=img_52001  ms=3712  status=ok",
    "07:12:06.827 DEBUG worker listeners after job: progress=4114  error=1  exit=1",
    "07:41:55.010 WARN  MaxListenersExceededWarning: 11 progress listeners added to [Worker]",
    "08:44:59.512 WARN  idle 40s  active_jobs=0  heapUsed=1381MB  rss=1600MB  (baseline 180MB)",
    "10:47:19.221 ERROR worker exceeded memory threshold (1.42GB / 1.5GB) — recycling",
  ],

  unresolvedBreakdown: [
    { label: "decode source image", durationMs: 402 },
    { label: "resize + encode variants", durationMs: 2810 },
    { label: "upload variants to storage", durationMs: 461 },
    { label: "major GC — 24MB reclaimed", durationMs: 33 },
    { label: "retained after completion: 1 listener + 2.1MB buffer", durationMs: 0 },
  ],
  unresolvedBreakdownTotalMs: 3712,
};

const QUEUE_BACKLOG_VERIFICATION: MissionVerificationConfig = {
  missionId: "worker-queue-backlog",

  metrics: [
    {
      id: "queue-depth",
      label: "Queue Depth",
      before: "184,012",
      after: "1,240",
      status: "pass",
      delta: "↓ 99%",
      deltaTone: "good",
      icon: "trending",
      accent: "emerald",
    },
    {
      id: "oldest-job-age",
      label: "Oldest Job Age",
      before: "42m",
      after: "38s",
      status: "pass",
      delta: "The queue drains as fast as it fills",
      deltaTone: "good",
      icon: "clock",
      accent: "violet",
    },
    {
      id: "provider-429-rate",
      label: "Provider 429 Rate",
      before: "61%",
      after: "0.7%",
      status: "pass",
      delta: "Requests are offered at the rate the provider accepts",
      deltaTone: "good",
      icon: "shield",
      accent: "amber",
    },
    {
      id: "delivered-per-minute",
      label: "Delivered / Min",
      before: "90",
      after: "1,090",
      status: "pass",
      delta: "Throughput now matches the arrival rate",
      deltaTone: "good",
      icon: "gauge",
      accent: "electric",
    },
    {
      id: "dead-lettered",
      label: "Dead-Lettered Jobs",
      before: "0",
      after: "3",
      status: "pass",
      delta: "Permanently invalid jobs are visible instead of cycling",
      deltaTone: "good",
      icon: "activity",
      accent: "violet",
    },
    {
      id: "redeliveries",
      label: "Redeliveries / Min",
      before: "71,400",
      after: "410",
      status: "pass",
      delta: "Retries are capped and spread out",
      deltaTone: "good",
      icon: "trending",
      accent: "amber",
    },
  ],

  chart: {
    caption: "Queue depth, thousands of messages — 30 minutes either side of the fix",
    yMax: 200,
    unit: "k",
    xLabels: ["-30m", "-20m", "-10m", "0", "+10m", "+20m", "+30m"],
    fixLabel: "Fix Applied",
    fixFraction: 0.5,
    before: [96, 118, 141, 162, 178, 184, 191],
    after: [96, 71, 42, 18, 5, 2, 1],
  },

  requestBreakdown: [
    { label: "claim job from queue", durationMs: 3 },
    { label: "limiter.schedule — admission control", durationMs: 11 },
    { label: "provider.send → 202 Accepted", durationMs: 186 },
    { label: "ack job", durationMs: 4 },
  ],
  breakdownTotalMs: 204,

  logs: [
    "11:41:02.118 ERROR job failed  id=notif_88213  attempt=5  reason=InvalidRecipient: missing channel address",
    "11:41:02.121 WARN  job dead-lettered  id=notif_88213  attempts=5  queue=notifications.dlq",
    "11:41:02.244 WARN  provider response 429  id=notif_91004  attempt=2  backoff=2114ms",
    "11:41:04.361 INFO  job delivered  id=notif_91004  attempt=3  ms=186",
    "11:41:06.900 INFO  queue depth 1,240  oldest job age 38s  dead-letter 3",
    "11:41:07.001 INFO  worker utilisation 46%  delivered/min 1,090  workers=8",
  ],

  checks: [
    {
      id: "retries-bounded",
      label: "No job exceeds the configured attempt cap",
      passed: true,
    },
    {
      id: "backoff-applied",
      label: "Retries are delayed with exponential backoff and jitter",
      passed: true,
    },
    {
      id: "permanent-failures-dead-lettered",
      label: "Permanently invalid jobs are dead-lettered, not recycled",
      passed: true,
    },
    {
      id: "provider-rate-respected",
      label: "Outbound calls stay within the provider's accepted rate",
      passed: true,
    },
    {
      id: "backlog-drains",
      label: "Queue depth and oldest-job age fall and stay down",
      passed: true,
    },
    {
      id: "no-notifications-lost",
      label: "Transient failures are still delivered, not discarded",
      passed: true,
    },
    {
      id: "broker-health-unchanged",
      label: "Broker CPU, publish latency and failover count are unchanged",
      passed: true,
      dependsOnFix: false,
    },
    {
      id: "database-unchanged",
      label: "Recipient-lookup latency is unchanged",
      passed: true,
      dependsOnFix: false,
    },
  ],

  summary: {
    headline: "Verified — the backlog drained with a third of the workers.",
    detail:
      "Bounded retries and dead-lettering freed the slots the poison job was consuming, and provider-aware admission control cut 429s to noise. Throughput now matches the arrival rate at 8 workers.",
  },

  unresolvedSummary: {
    headline: "Verification failed — the queue is still growing.",
    detail:
      "The same job is still being retried without limit, the provider is still rejecting most calls, and nothing has been dead-lettered. You can still continue to your results.",
  },

  unresolvedLogs: [
    "11:41:02.118 ERROR job failed  id=notif_88213  attempt=6217  reason=InvalidRecipient: missing channel address",
    "11:41:02.157 INFO  job requeued  id=notif_88213  attempt=6218  delay=0ms",
    "11:41:02.244 WARN  provider response 429 Too Many Requests  retry-after=30  id=notif_91004",
    "11:41:02.245 INFO  job requeued  id=notif_91004  attempt=44  delay=0ms",
    "11:41:06.900 WARN  queue depth 191,880  oldest job age 51m  dead-letter 0",
    "11:41:07.001 WARN  worker utilisation 99%  delivered/min 84  workers=24",
  ],

  unresolvedBreakdown: [
    { label: "claim job from queue", durationMs: 3 },
    { label: "resolveRecipient", durationMs: 8 },
    { label: "provider.send → 429 Too Many Requests", durationMs: 24 },
    { label: "queue.add — immediate requeue, delay 0ms", durationMs: 5 },
  ],
  unresolvedBreakdownTotalMs: 40,
};

const CONNECTION_POOL_VERIFICATION: MissionVerificationConfig = {
  missionId: "connection-pool-exhaustion",

  metrics: [
    {
      id: "acquire-wait",
      label: "Pool Acquire Wait (p95)",
      before: "4.8s",
      after: "2ms",
      status: "pass",
      delta: "↓ 99.9%",
      deltaTone: "good",
      icon: "clock",
      accent: "emerald",
    },
    {
      id: "request-latency",
      label: "Request Latency (p95)",
      before: "4,902ms",
      after: "88ms",
      status: "pass",
      delta: "The wait is gone; the work is unchanged",
      deltaTone: "good",
      icon: "trending",
      accent: "violet",
    },
    {
      id: "pool-idle",
      label: "Idle Connections",
      before: "0 of 20",
      after: "16 of 20",
      status: "pass",
      delta: "Headroom restored without changing the pool size",
      deltaTone: "good",
      icon: "gauge",
      accent: "amber",
    },
    {
      id: "leaked-connections",
      label: "Leaked Connections / Hour",
      before: "20",
      after: "0",
      status: "pass",
      delta: "Every checkout is matched by a release",
      deltaTone: "good",
      icon: "shield",
      accent: "electric",
    },
    {
      id: "acquire-timeouts",
      label: "Acquire Timeouts / Min",
      before: "63",
      after: "0",
      status: "pass",
      delta: "↓ 100%",
      deltaTone: "good",
      icon: "activity",
      accent: "violet",
    },
    {
      id: "query-duration",
      label: "Query Execution (p95)",
      before: "18ms",
      after: "17ms",
      status: "pass",
      delta: "Unchanged — the queries were never slow",
      deltaTone: "neutral",
      icon: "clock",
      accent: "electric",
    },
  ],

  chart: {
    caption: "GET /api/orders/:id p95 latency, ms — 20 minutes either side of the fix",
    yMax: 5200,
    unit: "ms",
    xLabels: ["-15m", "-10m", "-5m", "0", "+5m", "+10m", "+15m"],
    fixLabel: "Fix Applied",
    fixFraction: 0.5,
    before: [1180, 2410, 3620, 4480, 4902, 4870, 4915],
    after: [1180, 412, 96, 88, 84, 91, 87],
  },

  requestBreakdown: [
    { label: "pool.getConnection", durationMs: 2 },
    { label: "SELECT order WHERE id = $1", durationMs: 11 },
    { label: "SELECT order_items WHERE order_id = $1", durationMs: 14 },
    { label: "connection.release (finally)", durationMs: 1 },
    { label: "billingApi.fetchInvoice — no connection held", durationMs: 52 },
    { label: "JSON serialization", durationMs: 8 },
  ],
  breakdownTotalMs: 88,

  logs: [
    "10:22:02.004 DEBUG pool checkout  conn=conn_07  handler=getOrderDetail  active=4/20",
    "10:22:02.019 WARN  NotFoundError: order 55120 not found  handler=getOrderDetail  conn=conn_07",
    "10:22:02.020 DEBUG pool release   conn=conn_07  held_ms=16  path=finally",
    "10:22:04.400 DEBUG pool state  active=4/20  idle=16  queued=0",
    "10:22:15.222 INFO  GET /api/orders/91002 200 88ms  (acquire 2ms, query 14ms)",
    "10:22:18.771 INFO  leaked connections since deploy: 0  checkouts=41,208  releases=41,208",
  ],

  checks: [
    {
      id: "release-on-every-path",
      label: "Every checked-out connection is released on every exit path",
      passed: true,
    },
    {
      id: "error-path-covered",
      label: "The missing-order error path releases its connection",
      passed: true,
    },
    {
      id: "pool-has-headroom",
      label: "Idle connections stay available under sustained load",
      passed: true,
    },
    {
      id: "acquire-bounded",
      label: "Connection acquisition is bounded and fails fast when starved",
      passed: true,
    },
    {
      id: "no-connection-during-external-call",
      label: "No connection is held during the external billing call",
      passed: true,
    },
    {
      id: "query-performance-unchanged",
      label: "Query execution time is unchanged",
      passed: true,
      dependsOnFix: false,
    },
    {
      id: "database-health-unchanged",
      label: "Database CPU, locks and replica lag are unchanged",
      passed: true,
      dependsOnFix: false,
    },
  ],

  summary: {
    headline: "Verified — the pool holds headroom under the same load.",
    detail:
      "Checkouts and releases now match exactly, including on the missing-order path, and acquisition dropped from 4.8 seconds to 2ms with the pool size untouched.",
  },

  unresolvedSummary: {
    headline: "Verification failed — connections are still being lost.",
    detail:
      "The pool is still pinned at its maximum with zero idle connections, and requests are still spending seconds waiting to start work that takes milliseconds. You can still continue to your results.",
  },

  unresolvedLogs: [
    "10:22:02.004 DEBUG pool checkout  conn=conn_07  handler=getOrderDetail  active=17/20",
    "10:22:02.019 WARN  NotFoundError: order 55120 not found  handler=getOrderDetail  conn=conn_07",
    "10:22:04.400 WARN  pool state  active=20/20  idle=0  queued=34  (no release for conn_07 in 2.4s)",
    "10:22:12.118 ERROR TimeoutError: pool acquire timed out after 10000ms  handler=listOrders",
    "10:22:15.222 INFO  GET /api/orders/91002 200 4902ms  (acquire 4820ms, query 14ms)",
    "10:22:18.771 WARN  leaked connections since boot: 20  reclaimed: 0",
  ],

  unresolvedBreakdown: [
    { label: "pool.getConnection — waiting for a free connection", durationMs: 4820 },
    { label: "SELECT order_items WHERE order_id = $1", durationMs: 14 },
    { label: "billingApi.fetchInvoice — connection still held", durationMs: 52 },
    { label: "JSON serialization", durationMs: 9 },
  ],
  unresolvedBreakdownTotalMs: 4902,
};

const SLOW_API_VERIFICATION: MissionVerificationConfig = {
  missionId: "slow-api-incident",

  metrics: [
    {
      id: "response-time",
      label: "Orders API Avg Response",
      before: "2.4s",
      after: "192ms",
      status: "pass",
      delta: "↓ 92%",
      deltaTone: "good",
      icon: "trending",
      accent: "emerald",
    },
    {
      id: "query-count",
      label: "DB Queries Per Request",
      before: "49",
      after: "2",
      status: "pass",
      delta: "Constant regardless of page size",
      deltaTone: "good",
      icon: "gauge",
      accent: "violet",
    },
    {
      id: "scaling",
      label: "Latency At 48 Orders vs 8",
      before: "2.4s vs 420ms",
      after: "192ms vs 178ms",
      status: "pass",
      delta: "Response time no longer tracks result size",
      deltaTone: "good",
      icon: "activity",
      accent: "amber",
    },
    {
      id: "throughput",
      label: "Endpoint Throughput",
      before: "24 req/s",
      after: "310 req/s",
      status: "pass",
      delta: "The same instances serve far more traffic",
      deltaTone: "good",
      icon: "trending",
      accent: "electric",
    },
    {
      id: "db-cpu",
      label: "Database CPU",
      before: "22%",
      after: "19%",
      status: "pass",
      delta: "Healthy, and doing less parsing work",
      deltaTone: "neutral",
      icon: "shield",
      accent: "electric",
    },
    {
      id: "pool-wait",
      label: "Connection Pool Wait",
      before: "3ms",
      after: "2ms",
      status: "pass",
      delta: "No new pool pressure introduced",
      deltaTone: "neutral",
      icon: "clock",
      accent: "violet",
    },
  ],

  chart: {
    caption: "GET /api/orders average response time, ms",
    yMax: 2600,
    unit: "ms",
    xLabels: ["14:28", "14:30", "14:32", "14:34", "14:36", "14:38", "14:40"],
    fixLabel: "Fix Applied",
    fixFraction: 0.5,
    before: [2280, 2384, 2298, 2411, 2352, 2390, 2364],
    after: [2280, 640, 214, 192, 188, 196, 190],
  },

  requestBreakdown: [
    { label: "SELECT orders WHERE user_id", durationMs: 51 },
    { label: "SELECT order_items WHERE order_id IN (…48 ids)", durationMs: 108 },
    { label: "group items by order id in memory", durationMs: 4 },
    { label: "JSON serialization", durationMs: 18 },
  ],
  breakdownTotalMs: 192,

  logs: [
    "14:36:07.001 INFO  GET /api/orders?page=1&limit=20  userId=123  start",
    "14:36:07.004 SQL   SELECT * FROM orders WHERE user_id = $1  [123]",
    "14:36:07.055 SQL   SELECT * FROM order_items WHERE order_id = ANY($1)  [48 ids]",
    "14:36:07.163 DEBUG grouped 214 items across 48 orders in 4ms",
    "14:36:07.193 INFO  GET /api/orders 200 192ms  queries=2",
    "14:36:09.400 INFO  p95 192ms  throughput 310 req/s  db cpu 19%",
  ],

  checks: [
    {
      id: "query-count-constant",
      label: "Query count no longer grows with the number of orders",
      passed: true,
    },
    {
      id: "no-query-in-loop",
      label: "No database call is issued from inside the result loop",
      passed: true,
    },
    {
      id: "latency-independent-of-page-size",
      label: "Latency is flat between an 8-order and a 48-order page",
      passed: true,
    },
    {
      id: "no-repeated-spans",
      label: "The request trace contains no repeated per-order spans",
      passed: true,
    },
    {
      id: "response-shape-unchanged",
      label: "Every order still carries exactly the items it did before",
      passed: true,
    },
    {
      id: "pool-not-pressured",
      label: "Connection-pool wait did not rise",
      passed: true,
      dependsOnFix: false,
    },
    {
      id: "database-cpu-healthy",
      label: "Database CPU stayed healthy throughout",
      passed: true,
      dependsOnFix: false,
    },
  ],

  summary: {
    headline: "Verified — two queries per request at any page size.",
    detail:
      "The related items are loaded in one statement and grouped in memory, so response time is 192ms whether the page holds 8 orders or 48. Database CPU and pool wait both fell.",
  },

  unresolvedSummary: {
    headline: "Verification failed — the endpoint is still slow.",
    detail:
      "One query per order is still being issued inside the loop, so the request still executes 49 statements and latency still grows with the number of orders returned. You can still continue to your results.",
  },

  unresolvedLogs: [
    "14:36:07.001 INFO  GET /api/orders?page=1&limit=20  userId=123  start",
    "14:36:07.004 SQL   SELECT * FROM orders WHERE user_id = $1  [123]",
    "14:36:07.061 SQL   SELECT * FROM order_items WHERE order_id = $1  [87341]",
    "14:36:07.104 SQL   SELECT * FROM order_items WHERE order_id = $1  [87342]",
    "14:36:07.193 DEBUG … 46 more order_items lookups in this request",
    "14:36:09.385 WARN  GET /api/orders 200 2384ms  queries=49  (threshold 1000ms)",
  ],

  unresolvedBreakdown: [
    { label: "SELECT orders WHERE user_id", durationMs: 51 },
    { label: "48 × SELECT order_items WHERE order_id = $1", durationMs: 2015 },
    { label: "await between each per-order query", durationMs: 300 },
    { label: "JSON serialization", durationMs: 18 },
  ],
  unresolvedBreakdownTotalMs: 2384,
};

export const verificationConfigs: Record<string, MissionVerificationConfig> = {
  "user-signup-latency-spike": SIGNUP_LATENCY_VERIFICATION,
  "event-loop-overload": EVENT_LOOP_VERIFICATION,
  "promise-all-cascade": PROMISE_CASCADE_VERIFICATION,
  "async-map-trap": ASYNC_MAP_VERIFICATION,
  "overlapping-scheduler-runs": SCHEDULER_OVERLAP_VERIFICATION,
  "unhandled-rejection-storm": REJECTION_STORM_VERIFICATION,
  "jwt-session-expiry": JWT_REFRESH_RACE_VERIFICATION,
  "health-check-flapping": HEALTH_CHECK_VERIFICATION,
  "graceful-shutdown-bug": GRACEFUL_SHUTDOWN_VERIFICATION,
  "rate-limiter-race": RATE_LIMITER_RACE_VERIFICATION,
  "memory-leak-worker": MEMORY_LEAK_VERIFICATION,
  "worker-queue-backlog": QUEUE_BACKLOG_VERIFICATION,
  "connection-pool-exhaustion": CONNECTION_POOL_VERIFICATION,
  "slow-api-incident": SLOW_API_VERIFICATION,
};

export function getVerification(
  missionId: string,
): MissionVerificationConfig | undefined {
  return verificationConfigs[missionId];
}

export const VERIFIABLE_MISSION_IDS = Object.keys(verificationConfigs);

export function allChecksPassed(config: MissionVerificationConfig): boolean {
  return config.checks.every((c) => c.passed);
}

/* ------------------------- Persistence (localStorage) ------------------- */

export function verificationStorageKey(missionId: string): string {
  return `coderaid:${missionId}:verification`;
}

export function loadVerificationState(
  missionId: string,
): VerificationState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(verificationStorageKey(missionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<VerificationState>;
    const completed = parsed.completed === true;
    return {
      // Completing implies it was run — keep the two flags consistent.
      run: parsed.run === true || completed,
      completed,
    };
  } catch {
    return null;
  }
}

export function saveVerificationState(
  missionId: string,
  state: VerificationState,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      verificationStorageKey(missionId),
      JSON.stringify(state),
    );
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

/* ------------------------------- Styling -------------------------------- */

export const METRIC_STATUS_VALUE: Record<
  VerificationMetric["status"],
  string
> = {
  pass: "text-emerald-300",
  warning: "text-amber-300",
  fail: "text-rose-300",
};
