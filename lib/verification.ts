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
};

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
    { id: "database", label: "Database performance is healthy", passed: true },
    {
      id: "email",
      label: "Email delivery is processed in the background",
      passed: true,
    },
    { id: "errors", label: "Error rate remains low", passed: true },
    { id: "resolved", label: "The fix successfully resolved the issue", passed: true },
  ],

  summary: {
    headline: "Great work! Your fix has been verified successfully.",
    detail: "You can continue to the final results and earn your XP.",
  },
};

/* ------------------------------- Registry ------------------------------- */

/**
 * Verification content is authored per mission — the before/after numbers and
 * checks only mean something against that mission's fix. The route looks a
 * mission up by slug; missions without an entry fall back to the reserved-route
 * state, exactly like the earlier stages.
 */
export const verificationConfigs: Record<string, MissionVerificationConfig> = {
  "user-signup-latency-spike": SIGNUP_LATENCY_VERIFICATION,
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
