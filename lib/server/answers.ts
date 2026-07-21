import "server-only";

import type { MissionAnswers } from "@/lib/grading";

/**
 * Every mission's answers — the only copy.
 *
 * These used to live in the stage configs as `correctRootCauseId`,
 * `correctEvidenceIds`, `correctFixId` and a `resolvesRootCause` flag on each
 * fix option, which meant they shipped inside the JavaScript bundle: a player
 * could read the correct answer out of devtools before choosing one. They now
 * live here, behind `import "server-only"`, so importing this module from a
 * client component is a build error.
 *
 * `resolvesRootCause` is gone rather than moved: exactly one fix option
 * resolves the incident and it is always the one `fixId` names, so the flag was
 * a second copy of this fact. `validate:missions` enforces that every id here
 * exists in the mission's public options.
 *
 * Generated once from the authored configs by `scripts/extract-answers.ts`;
 * maintained by hand from here on.
 */
export const MISSION_ANSWERS: Record<string, MissionAnswers> = {
  "user-signup-latency-spike": {
    rootCauseId: "synchronous-welcome-email",
    evidenceIds: ["email-provider-latency", "awaited-email-operation", "database-is-healthy"],
    fixId: "async-welcome-email",
  },
  "event-loop-overload": {
    rootCauseId: "synchronous-cpu-work-blocking-event-loop",
    evidenceIds: ["event-loop-lag-spike", "cpu-saturated", "report-generation-dominates", "unrelated-endpoints-delayed", "database-not-saturated"],
    fixId: "move-report-generation-to-worker-thread",
  },
  "promise-all-cascade": {
    rootCauseId: "promise-all-discards-batch-on-first-rejection",
    evidenceIds: ["run-aborts-on-first-failure", "successes-discarded", "promise-all-over-mapped-calls", "calls-continue-after-abort"],
    fixId: "settle-each-vendor-and-record-outcomes",
  },
  "async-map-trap": {
    rootCauseId: "mapped-promises-never-awaited",
    evidenceIds: ["impossible-fast-completion", "unawaited-promise-array", "work-continues-after-completion", "failures-invisible-to-job"],
    fixId: "await-the-mapped-promises",
  },
  "overlapping-scheduler-runs": {
    rootCauseId: "interval-fires-before-previous-run-finishes",
    evidenceIds: ["runs-overlap", "run-exceeds-interval", "interval-does-not-await", "same-invoice-two-runs", "single-instance"],
    fixId: "self-scheduling-loop-with-run-guard",
  },
  "unhandled-rejection-storm": {
    rootCauseId: "unhandled-rejection-in-detached-async-work",
    evidenceIds: ["unhandled-rejection-crash", "restart-loop", "async-listener-unawaited", "failure-is-off-request-path", "not-killed-by-platform"],
    fixId: "own-the-error-at-the-async-boundary",
  },
  "jwt-session-expiry": {
    rootCauseId: "concurrent-refresh-token-rotation-race",
    evidenceIds: ["refresh-burst-same-token-family", "one-refresh-succeeds-rest-reuse", "every-401-calls-refresh", "parallel-api-calls-one-expiry", "logout-tracks-page-fanout"],
    fixId: "single-flight-refresh-with-safe-token-rotation",
  },
  "health-check-flapping": {
    rootCauseId: "liveness-probe-coupled-to-transient-dependencies",
    evidenceIds: ["analytics-timeout-precedes-restart", "health-endpoint-exceeds-probe-timeout", "liveness-probe-runs-deep-dependency-check", "health-span-dominated-by-analytics", "local-requests-still-served"],
    fixId: "separate-liveness-readiness-and-bounded-dependency-checks",
  },
  "graceful-shutdown-bug": {
    rootCauseId: "immediate-process-exit-without-draining-work",
    evidenceIds: ["sigterm-to-exit-in-milliseconds", "in-flight-requests-at-exit", "exit-called-in-signal-handler", "request-cut-mid-transaction", "jobs-acked-before-completion"],
    fixId: "bounded-graceful-shutdown-with-draining",
  },
  "rate-limiter-race": {
    rootCauseId: "non-atomic-distributed-rate-limit-counter",
    evidenceIds: ["same-count-read-by-several-instances", "writes-overwrite-each-other", "read-modify-write-in-application-code", "overshoot-scales-with-replicas", "stored-count-below-actual-volume"],
    fixId: "atomic-shared-rate-limit-operation",
  },
  "memory-leak-worker": {
    rootCauseId: "long-lived-references-retain-completed-jobs",
    evidenceIds: ["heap-never-returns-to-baseline", "listener-count-climbs-with-jobs", "max-listeners-warning", "listener-added-per-job-never-removed", "gc-runs-more-but-frees-less", "memory-retained-with-zero-active-jobs"],
    fixId: "cleanup-listeners-and-bound-retained-state",
  },
  "worker-queue-backlog": {
    rootCauseId: "unbounded-retries-and-missing-backpressure",
    evidenceIds: ["same-job-retried-endlessly", "provider-429-rate", "immediate-requeue-in-catch", "poison-job-cycle-in-trace", "throughput-falls-as-workers-rise", "backlog-grows-with-empty-dead-letter"],
    fixId: "bounded-retries-dead-letter-and-backpressure",
  },
  "connection-pool-exhaustion": {
    rootCauseId: "connection-leak-on-error-path",
    evidenceIds: ["acquire-timeouts", "checkout-without-matching-release", "pool-saturated-idle-zero", "early-return-skips-release", "wait-dominates-request", "query-execution-healthy"],
    fixId: "release-connections-in-finally-and-bound-pool-waits",
  },
  "slow-api-incident": {
    rootCauseId: "n-plus-one-query-loop",
    evidenceIds: ["latency-spike", "repeated-item-queries", "query-inside-loop", "query-count-scales", "per-query-time-fast", "repeated-spans-in-trace", "latency-scales-with-order-count"],
    fixId: "bulk-fetch-related-data",
  },
};

/** The answers for a mission, or `undefined` for unwritten content. */
export function answersFor(missionId: string): MissionAnswers | undefined {
  return MISSION_ANSWERS[missionId];
}
