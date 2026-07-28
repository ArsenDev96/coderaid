import {
  Activity,
  Braces,
  Cpu,
  Database,
  Hash,
  Mail,
  MemoryStick,
  Network,
  type LucideIcon,
} from "lucide-react";
import { diagnosisStorageKey } from "./mission-storage";
import type { InvestigationToolId } from "./investigation";

/* -------------------------------- Types --------------------------------- */

export type RootCauseIconId =
  | "database"
  | "hash"
  | "mail"
  | "activity"
  | "network"
  | "cpu"
  | "memory"
  | "payload";

/**
 * Icons are referenced by key, not by component: the config crosses the
 * server→client boundary as props, and a function can't be serialized.
 */
export const ROOT_CAUSE_ICONS: Record<RootCauseIconId, LucideIcon> = {
  database: Database,
  hash: Hash,
  mail: Mail,
  activity: Activity,
  network: Network,
  cpu: Cpu,
  memory: MemoryStick,
  payload: Braces,
};

export type RootCauseOption = {
  id: string;
  title: string;
  description: string;
  icon: RootCauseIconId;
};

/**
 * A finding carried over from the investigation. `id` matches the investigation
 * evidence id where the two describe the same thing, so the stages line up.
 */
export type DiagnosisEvidenceOption = {
  id: string;
  source: InvestigationToolId;
  title: string;
  description: string;
};

export type MissionDiagnosisConfig = {
  missionId: string;
  /** The question posed above the two columns. */
  prompt: string;
  rootCauses: RootCauseOption[];
  evidence: DiagnosisEvidenceOption[];
  minimumEvidenceRequired: number;
  /** Nudges toward the reasoning, never names the cause. */
  hint: string;
};

export type DiagnosisState = {
  rootCauseId: string | null;
  evidenceIds: string[];
  confirmed: boolean;
};

/* ------------------------------- Content -------------------------------- */

const SIGNUP_LATENCY_DIAGNOSIS: MissionDiagnosisConfig = {
  missionId: "user-signup-latency-spike",
  prompt: "What is the root cause?",
  minimumEvidenceRequired: 2,

  rootCauses: [
    {
      id: "slow-database-insert",
      title: "Slow database insert",
      description: "The user insert query is taking too long to complete.",
      icon: "database",
    },
    {
      id: "expensive-password-hashing",
      title: "Expensive password hashing",
      description: "Password hashing is CPU intensive and causes delays.",
      icon: "hash",
    },
    {
      id: "synchronous-welcome-email",
      title: "Synchronous welcome email",
      description:
        "The request waits for the welcome email to be sent before responding.",
      icon: "mail",
    },
    {
      id: "high-cpu-usage",
      title: "High CPU usage",
      description: "The server CPU is maxed out during signup requests.",
      icon: "activity",
    },
    {
      id: "connection-pool-exhaustion",
      title: "Database connection pool exhaustion",
      description: "No available connections cause requests to wait.",
      icon: "network",
    },
  ],

  evidence: [
    {
      id: "email-provider-latency",
      source: "trace",
      title: "Welcome email takes ~2.7s",
      description:
        "The trace shows the welcome-email step took ~2671ms, which dominates the request.",
    },
    {
      id: "awaited-email-operation",
      source: "code",
      title: "Email is awaited in request",
      description:
        "The code awaits sendWelcomeEmail() before returning the response to the client.",
    },
    {
      id: "database-is-healthy",
      source: "database",
      title: "Database insert is fast",
      description:
        "User insert takes only ~31ms. The database is not the bottleneck.",
    },
    {
      id: "cpu-is-normal",
      source: "metrics",
      title: "CPU usage is normal",
      description: "CPU remains stable during the latency spike.",
    },
    {
      id: "no-errors-in-logs",
      source: "logs",
      title: "No errors in logs",
      description: "No errors or retries are found during signup requests.",
    },
  ],

  hint: "Compare which operation takes most of the request time and whether the HTTP response waits for it.",

};

const EVENT_LOOP_DIAGNOSIS: MissionDiagnosisConfig = {
  missionId: "event-loop-overload",
  prompt: "What is the root cause?",
  minimumEvidenceRequired: 3,

  rootCauses: [
    {
      id: "synchronous-cpu-work-blocking-event-loop",
      title: "Synchronous CPU work blocks the event loop",
      description:
        "The weekly report is aggregated on the main thread, so nothing else can run until it finishes.",
      icon: "cpu",
    },
    {
      id: "connection-pool-exhaustion",
      title: "Database connection pool exhaustion",
      description:
        "The reporting query holds connections open, so other requests queue waiting for one.",
      icon: "database",
    },
    {
      id: "memory-leak-gc-pauses",
      title: "Memory leak causing GC pauses",
      description:
        "Heap growth forces long stop-the-world collections that freeze the process periodically.",
      icon: "memory",
    },
    {
      id: "external-analytics-api-latency",
      title: "Slow external analytics API",
      description:
        "The reporting endpoint waits on a third-party analytics provider that has become slow.",
      icon: "network",
    },
    {
      id: "oversized-json-response",
      title: "Excessive JSON response size",
      description:
        "The report serialises a very large payload, saturating the response path and the network.",
      icon: "payload",
    },
  ],

  evidence: [
    {
      id: "event-loop-lag-spike",
      source: "metrics",
      title: "Event-loop lag spiked to 6.8s",
      description:
        "Lag went from ~4ms to 6.8s the moment api-service 3.8.0 shipped — the loop is not getting a turn.",
    },
    {
      id: "cpu-saturated",
      source: "metrics",
      title: "CPU jumped from 31% to 96%",
      description:
        "The process is computing rather than waiting on I/O, which points at work, not a dependency.",
    },
    {
      id: "report-generation-dominates",
      source: "trace",
      title: "Report aggregation takes ~7.2s of 7.4s",
      description:
        "The trace shows aggregation, not the fetch or the serialisation, consuming the request.",
    },
    {
      id: "unrelated-endpoints-delayed",
      source: "logs",
      title: "Unrelated endpoints respond seconds late",
      description:
        "/api/health and /api/users/me queue for ~5s while a report is being built.",
    },
    {
      id: "database-not-saturated",
      source: "database",
      title: "The database stays healthy",
      description:
        "128ms query, 6 of 20 connections in use, zero lock waits and no slow-query increase.",
    },
    {
      id: "memory-is-stable",
      source: "metrics",
      title: "Heap usage is flat",
      description:
        "Heap used holds steady with no growth trend and no out-of-memory events.",
    },
    {
      id: "report-record-volume",
      source: "logs",
      title: "The report covers 480,000 records",
      description:
        "Each run reads roughly 480,000 analytics events from the last seven days.",
    },
  ],

  hint: "Look for a resource or runtime signal that explains why unrelated requests slow down at the same time.",

};

const PROMISE_CASCADE_DIAGNOSIS: MissionDiagnosisConfig = {
  missionId: "promise-all-cascade",
  prompt: "What is the root cause?",
  minimumEvidenceRequired: 3,

  rootCauses: [
    {
      id: "promise-all-discards-batch-on-first-rejection",
      title: "Promise.all discards the whole batch on one rejection",
      description:
        "The batch is awaited as a single unit, so one rejected call throws away 47 successful results.",
      icon: "activity",
    },
    {
      id: "vendor-api-outage",
      title: "The northwind vendor API is down",
      description:
        "A vendor endpoint is returning 503, so the enrichment data cannot be fetched.",
      icon: "network",
    },
    {
      id: "missing-request-timeout",
      title: "The HTTP client has no request timeout",
      description:
        "Vendor calls can hang indefinitely and take the run down with them.",
      icon: "mail",
    },
    {
      id: "batch-concurrency-too-high",
      title: "Too many vendor calls run at once",
      description:
        "48 simultaneous requests overwhelm the vendor gateway and cause it to shed load.",
      icon: "cpu",
    },
    {
      id: "no-retry-on-transient-failure",
      title: "There is no retry on transient failures",
      description:
        "A single transient 5xx is treated as permanent because nothing retries it.",
      icon: "payload",
    },
  ],

  evidence: [
    {
      id: "run-aborts-on-first-failure",
      source: "logs",
      title: "The run fails 2ms after one vendor does",
      description:
        "47 vendors had already returned 200 when a single 503 ended the run.",
    },
    {
      id: "successes-discarded",
      source: "metrics",
      title: "47 successful calls, 0 rows written",
      description:
        "The data was fetched and then thrown away rather than never retrieved.",
    },
    {
      id: "promise-all-over-mapped-calls",
      source: "code",
      title: "The batch is awaited with Promise.all",
      description:
        "All 48 calls share one outcome, so any rejection is the outcome of all of them.",
    },
    {
      id: "calls-continue-after-abort",
      source: "trace",
      title: "In-flight calls keep running after the failure",
      description:
        "Nothing was cancelled — the work completed, and its results had nowhere to go.",
    },
    {
      id: "one-vendor-503",
      source: "logs",
      title: "northwind is returning 503",
      description:
        "One vendor endpoint has been intermittently unavailable since 01:40.",
    },
    {
      id: "no-timeouts-or-throttling",
      source: "logs",
      title: "No timeouts and no 429s",
      description: "Nothing hung and nothing was rate limited during the run.",
    },
    {
      id: "vendor-fleet-otherwise-healthy",
      source: "metrics",
      title: "47 of 48 vendor endpoints are healthy",
      description: "The fleet-wide error rate is 2.1%.",
    },
  ],

  hint: "One vendor failing is normal and will keep happening. Ask what the run does with the other 47 results when it does.",

};

const ASYNC_MAP_DIAGNOSIS: MissionDiagnosisConfig = {
  missionId: "async-map-trap",
  prompt: "What is the root cause?",
  minimumEvidenceRequired: 3,

  rootCauses: [
    {
      id: "mapped-promises-never-awaited",
      title: "The mapped promises are never awaited",
      description:
        "files.map(async …) returns an array of promises that is discarded, so the job finishes before any work does.",
      icon: "activity",
    },
    {
      id: "worker-recycled-too-early",
      title: "The worker is recycled before work finishes",
      description:
        "An idle timeout tears the worker down while thumbnails are still being written.",
      icon: "cpu",
    },
    {
      id: "image-service-failing-silently",
      title: "The image service fails silently",
      description:
        "Thumbnail generation is rejecting without surfacing an error to the caller.",
      icon: "network",
    },
    {
      id: "storage-permissions-blocking-writes",
      title: "Storage permissions block the writes",
      description:
        "The bucket rejects the thumbnail uploads, so nothing is persisted.",
      icon: "database",
    },
    {
      id: "queue-marks-job-complete-on-timeout",
      title: "The queue marks the job complete on its own",
      description:
        "The job runner reports success from its own bookkeeping rather than from the work.",
      icon: "payload",
    },
  ],

  evidence: [
    {
      id: "impossible-fast-completion",
      source: "logs",
      title: "500 files 'processed' in 14ms",
      description: "One thumbnail alone takes about 380ms.",
    },
    {
      id: "unawaited-promise-array",
      source: "code",
      title: "The result of files.map(async …) is discarded",
      description:
        "Nothing awaits the array of promises, so the function returns immediately.",
    },
    {
      id: "work-continues-after-completion",
      source: "trace",
      title: "Thumbnail work outlives the job span",
      description:
        "Operations started inside the job finish seconds after it reported success.",
    },
    {
      id: "failures-invisible-to-job",
      source: "logs",
      title: "A thumbnail error belongs to no job",
      description:
        "The failure arrives after the batch was already green, so nothing can retry it.",
    },
    {
      id: "worker-not-overloaded",
      source: "metrics",
      title: "The worker is idle, not overloaded",
      description: "CPU 9% and flat heap — it finishes and then waits.",
    },
    {
      id: "storage-writes-succeeding",
      source: "database",
      title: "Every attempted write succeeds",
      description: "Zero storage errors and zero permission denials.",
    },
    {
      id: "thumbnails-missing-in-storage",
      source: "database",
      title: "187 of 500 uploads have no thumbnail",
      description: "The batch is recorded as completed regardless.",
    },
  ],

  hint: "The job is not slow and nothing is erroring on the way in. Ask what the job was actually waiting for before it declared success.",

};

const SCHEDULER_OVERLAP_DIAGNOSIS: MissionDiagnosisConfig = {
  missionId: "overlapping-scheduler-runs",
  prompt: "What is the root cause?",
  minimumEvidenceRequired: 3,

  rootCauses: [
    {
      id: "interval-fires-before-previous-run-finishes",
      title: "The interval fires before the previous run finishes",
      description:
        "setInterval schedules on the clock, not on completion, so a 95-second run overlaps the next 60-second tick and re-reads the same pending invoices.",
      icon: "activity",
    },
    {
      id: "multiple-instances-running-the-scheduler",
      title: "Several instances run the same scheduler",
      description:
        "More than one replica has the cron enabled, so two processes charge the same invoice.",
      icon: "network",
    },
    {
      id: "missing-idempotency-key",
      title: "The charge call has no idempotency key",
      description:
        "The payment gateway cannot recognise a repeated charge as the same one.",
      icon: "payload",
    },
    {
      id: "replica-lag-returns-stale-rows",
      title: "Replica lag returns already-charged invoices",
      description:
        "The pending list is read from a lagging replica that has not seen the last update.",
      icon: "database",
    },
    {
      id: "provider-delivers-duplicate-webhooks",
      title: "The provider delivers duplicate webhooks",
      description:
        "The same charge event arrives twice and is recorded twice.",
      icon: "mail",
    },
  ],

  evidence: [
    {
      id: "runs-overlap",
      source: "logs",
      title: "A run starts while the previous is still going",
      description: "s_882 begins while s_881 is still charging invoices.",
    },
    {
      id: "run-exceeds-interval",
      source: "metrics",
      title: "Runs take 95s on a 60s schedule",
      description:
        "The run has been getting slower since the pricing migration and crossed the interval.",
    },
    {
      id: "interval-does-not-await",
      source: "code",
      title: "setInterval does not wait for the async run",
      description:
        "Each tick calls syncInvoices again and re-reads the pending list from scratch.",
    },
    {
      id: "same-invoice-two-runs",
      source: "database",
      title: "One invoice charged by two run ids",
      description: "INV-20418 has charge records from both s_881 and s_882.",
    },
    {
      id: "single-instance",
      source: "logs",
      title: "Both runs share one instance id",
      description: "The overlap is inside a single process, not across replicas.",
    },
    {
      id: "no-replica-lag",
      source: "database",
      title: "Replica lag is 40ms",
      description: "Reads are current; the pending list is not stale.",
    },
    {
      id: "provider-delivers-once",
      source: "metrics",
      title: "Zero duplicate webhooks from the provider",
      description: "Each charge event is delivered exactly once.",
    },
  ],

  hint: "Two runs are charging the same invoice. Before blaming the payment provider or a second replica, work out where the second run came from.",

};

const REJECTION_STORM_DIAGNOSIS: MissionDiagnosisConfig = {
  missionId: "unhandled-rejection-storm",
  prompt: "What is the root cause?",
  minimumEvidenceRequired: 3,

  rootCauses: [
    {
      id: "unhandled-rejection-in-detached-async-work",
      title: "A detached async callback rejects with nobody to catch it",
      description:
        "The delivery listener is an async function nothing awaits, so a provider failure becomes an unhandled rejection — which terminates the process on Node 20.",
      icon: "activity",
    },
    {
      id: "missing-try-catch-in-route",
      title: "The notification route has no error handling",
      description:
        "An error thrown while handling the request escapes and crashes the process.",
      icon: "payload",
    },
    {
      id: "oom-kill",
      title: "The container is being killed for memory",
      description:
        "Heap growth pushes the process past its limit and it is killed and restarted.",
      icon: "memory",
    },
    {
      id: "liveness-probe-restarts",
      title: "The liveness probe is restarting the pod",
      description:
        "The platform decides the service is unhealthy and cycles it.",
      icon: "network",
    },
    {
      id: "apns-provider-outage",
      title: "The push provider is failing",
      description:
        "APNs error rate is elevated, so deliveries cannot complete.",
      icon: "mail",
    },
  ],

  evidence: [
    {
      id: "unhandled-rejection-crash",
      source: "logs",
      title: "Node logs an unhandled rejection, then exits",
      description:
        "The rejection message is the last thing before exit code 1.",
    },
    {
      id: "restart-loop",
      source: "metrics",
      title: "41 restarts and 41 unhandled rejections in an hour",
      description: "The two counts track each other exactly, one for one.",
    },
    {
      id: "async-listener-unawaited",
      source: "code",
      title: "An async listener passed to emitter.on",
      description:
        "The promise it returns has no caller, so a rejection has nowhere to go.",
    },
    {
      id: "failure-is-off-request-path",
      source: "trace",
      title: "The failure happens after the 202 response",
      description:
        "The route's try/catch has already finished by the time the provider call rejects.",
    },
    {
      id: "route-already-guarded",
      source: "code",
      title: "The route is already wrapped in try/catch",
      description: "Adding error handling there cannot change the outcome.",
    },
    {
      id: "memory-is-flat",
      source: "metrics",
      title: "Heap is flat at 142 MB of 512 MB",
      description: "No growth trend and no OOM kill recorded.",
    },
    {
      id: "not-killed-by-platform",
      source: "logs",
      title: "Exit code 1, signal none",
      description:
        "Not SIGTERM and not SIGKILL — nothing external ended the process.",
    },
  ],

  hint: "The process is ending itself, not being ended. Find the promise whose rejection has no caller waiting on it.",

};

const JWT_REFRESH_RACE_DIAGNOSIS: MissionDiagnosisConfig = {
  missionId: "jwt-session-expiry",
  prompt: "What is the root cause?",
  minimumEvidenceRequired: 3,

  rootCauses: [
    {
      id: "concurrent-refresh-token-rotation-race",
      title: "Concurrent refresh attempts race against token rotation",
      description:
        "Several requests expire at once and each refreshes independently. The first rotates the refresh token; the rest present the old one, trip reuse detection, and the family is revoked.",
      icon: "network",
    },
    {
      id: "clock-skew-between-services",
      title: "Clock skew between the API and the auth service",
      description:
        "Disagreeing clocks make tokens look expired earlier than they should on some hosts.",
      icon: "activity",
    },
    {
      id: "access-token-signing-key-mismatch",
      title: "The access-token signing key no longer matches",
      description:
        "A rotated or mismatched signing key makes valid tokens fail verification.",
      icon: "hash",
    },
    {
      id: "refresh-token-store-corruption",
      title: "The refresh-token store is corrupted",
      description:
        "Missing or orphaned token rows make legitimate refresh attempts unverifiable.",
      icon: "database",
    },
    {
      id: "user-account-revoked",
      title: "The account was revoked or disabled",
      description:
        "An administrative action invalidates the user's sessions mid-flight.",
      icon: "mail",
    },
    {
      id: "cookies-not-sent-with-request",
      title: "The browser is not sending the session cookie",
      description:
        "A SameSite or domain change stops credentials reaching the refresh endpoint at all.",
      icon: "payload",
    },
  ],

  evidence: [
    {
      id: "refresh-burst-same-token-family",
      source: "logs",
      title: "Five refresh calls in 24ms, one device",
      description:
        "Same token family, same fingerprint — one browser refreshing five times, not five clients.",
    },
    {
      id: "one-refresh-succeeds-rest-reuse",
      source: "logs",
      title: "One rotation, then reuse rejections",
      description:
        "rt_9f3 becomes rt_c17; the later calls still present rt_9f3 and the family is revoked.",
    },
    {
      id: "every-401-calls-refresh",
      source: "code",
      title: "The interceptor refreshes per failed request",
      description: "Nothing coordinates concurrent callers of refreshSession().",
    },
    {
      id: "parallel-api-calls-one-expiry",
      source: "trace",
      title: "Parallel calls expire together, refresh together",
      description:
        "Six requests share one access token, so their refresh spans overlap.",
    },
    {
      id: "logout-tracks-page-fanout",
      source: "metrics",
      title: "Logouts follow request fan-out",
      description:
        "The six-call dashboard produces the logouts; single-call pages do not.",
    },
    {
      id: "signing-key-unchanged",
      source: "metrics",
      title: "Signing key unchanged for 41 days",
      description: "Access-token validation succeeds 99.98% of the time.",
    },
    {
      id: "clock-skew-within-tolerance",
      source: "metrics",
      title: "12ms offset against a 15-minute lifetime",
      description: "Far too small to move an expiry boundary.",
    },
    {
      id: "account-and-store-healthy",
      source: "database",
      title: "Account active, token rows intact",
      description: "No revocation, no corruption, 3ms reads.",
    },
  ],

  hint: "Nothing rejected the first refresh. Ask why there was a second one — and what the second one was still holding.",

};

const HEALTH_CHECK_DIAGNOSIS: MissionDiagnosisConfig = {
  missionId: "health-check-flapping",
  prompt: "What is the root cause?",
  minimumEvidenceRequired: 3,

  rootCauses: [
    {
      id: "liveness-probe-coupled-to-transient-dependencies",
      title: "The liveness probe depends on transient external dependencies",
      description:
        "One endpoint answers both probes and awaits every dependency unbounded, so a third-party slowdown makes a healthy process look dead and it is restarted.",
      icon: "network",
    },
    {
      id: "memory-leak-forcing-restarts",
      title: "A memory leak is pushing instances past their limit",
      description:
        "Heap growth ends in an OOM kill, which the platform reports as a restart.",
      icon: "memory",
    },
    {
      id: "event-loop-blocked",
      title: "The event loop is blocked",
      description:
        "Synchronous work starves the loop, so the process cannot answer the probe in time.",
      icon: "cpu",
    },
    {
      id: "db-connection-pool-exhausted",
      title: "The database connection pool is exhausted",
      description:
        "Health checks queue behind saturated connections and time out waiting for one.",
      icon: "database",
    },
    {
      id: "application-crash-loop",
      title: "The application is crashing on startup",
      description:
        "An unhandled error kills the process shortly after boot and the supervisor restarts it.",
      icon: "activity",
    },
    {
      id: "insufficient-cpu-allocation",
      title: "The container has too little CPU",
      description:
        "Throttling slows every request, including the probe, past its deadline.",
      icon: "cpu",
    },
  ],

  evidence: [
    {
      id: "analytics-timeout-precedes-restart",
      source: "logs",
      title: "A third-party timeout precedes every restart",
      description: "Analytics takes over five seconds inside the health request.",
    },
    {
      id: "health-endpoint-exceeds-probe-timeout",
      source: "metrics",
      title: "GET /health takes 5.1s against a 3s probe timeout",
      description: "Three consecutive failures, then a restart.",
    },
    {
      id: "liveness-probe-runs-deep-dependency-check",
      source: "code",
      title: "One handler serves liveness and readiness",
      description:
        "It awaits four dependencies in sequence with no bounded timeout.",
    },
    {
      id: "health-span-dominated-by-analytics",
      source: "trace",
      title: "One optional dependency owns 97% of the check",
      description: "5,002ms of a 5,155ms health request.",
    },
    {
      id: "restarts-cascade-into-api-errors",
      source: "metrics",
      title: "Order errors follow the loss of capacity",
      description: "5xx climbs from 0.2% to 11.4% as healthy instances fall 8 → 3.",
    },
    {
      id: "local-requests-still-served",
      source: "logs",
      title: "The 'unhealthy' instance serves orders in 41ms",
      description: "The process is not stuck; it is waiting on someone else.",
    },
    {
      id: "heap-and-cpu-flat",
      source: "metrics",
      title: "Heap 214 MB of 1 GB, CPU 34%",
      description: "No growth trend, no OOM kill, no throttling.",
    },
    {
      id: "event-loop-lag-normal",
      source: "metrics",
      title: "Event-loop lag p99 is 3ms",
      description: "The loop is idle-waiting on I/O, not blocked.",
    },
    {
      id: "database-healthy",
      source: "database",
      title: "Database healthy, 12 of 50 connections in use",
      description: "select 1 in 4ms with no failovers.",
    },
  ],

  hint: "The instance being restarted is answering business traffic in 41ms. Ask what the probe is actually measuring.",

};

const GRACEFUL_SHUTDOWN_DIAGNOSIS: MissionDiagnosisConfig = {
  missionId: "graceful-shutdown-bug",
  prompt: "What is the root cause?",
  minimumEvidenceRequired: 3,

  rootCauses: [
    {
      id: "immediate-process-exit-without-draining-work",
      title: "The process exits without stopping traffic or draining work",
      description:
        "The SIGTERM handler closes the pool and calls process.exit() straight away, so in-flight requests, open transactions and unfinished jobs are all cut mid-operation.",
      icon: "activity",
    },
    {
      id: "load-balancer-misrouting",
      title: "The load balancer keeps routing to a stopped instance",
      description:
        "Traffic is sent to an instance that is no longer there, producing 502s at the edge.",
      icon: "network",
    },
    {
      id: "database-failover-during-deploy",
      title: "The database fails over during the rollout",
      description:
        "A primary switch drops connections and rolls back the transactions using them.",
      icon: "database",
    },
    {
      id: "client-timeout-too-short",
      title: "Client timeouts are too aggressive",
      description:
        "Callers give up on slow checkout requests and the retries surface as errors.",
      icon: "cpu",
    },
    {
      id: "queue-provider-duplicate-delivery",
      title: "The queue provider is delivering duplicates",
      description:
        "At-least-once delivery redelivers jobs that were already acknowledged.",
      icon: "mail",
    },
    {
      id: "memory-leak-during-deploy",
      title: "A memory leak kills the old process",
      description:
        "The outgoing process is OOM-killed before it can finish its work.",
      icon: "memory",
    },
  ],

  evidence: [
    {
      id: "sigterm-to-exit-in-milliseconds",
      source: "logs",
      title: "SIGTERM to exit in 4ms",
      description: "No drain window, though the platform allows 30 seconds.",
    },
    {
      id: "in-flight-requests-at-exit",
      source: "metrics",
      title: "23 requests were still running at exit",
      description: "Counted and logged, but never waited on.",
    },
    {
      id: "exit-called-in-signal-handler",
      source: "code",
      title: "process.exit() inside the signal handler",
      description:
        "server.close() is never called and consumers keep prefetching until the process disappears.",
    },
    {
      id: "request-cut-mid-transaction",
      source: "trace",
      title: "A checkout is cut between the write and the commit",
      description: "Payment authorised, order row inserted, COMMIT never reached.",
    },
    {
      id: "jobs-acked-before-completion",
      source: "logs",
      title: "Jobs acknowledged, then abandoned",
      description: "Acked, unfinished, redelivered as attempt 2.",
    },
    {
      id: "errors-only-during-deploys",
      source: "metrics",
      title: "8.7% during deploys, 0.04% otherwise",
      description: "The errors exist only inside rollout windows.",
    },
    {
      id: "resources-are-fine",
      source: "metrics",
      title: "CPU 29%, heap 240 MB at shutdown",
      description: "The process was healthy when it was told to stop.",
    },
    {
      id: "database-steady",
      source: "database",
      title: "Query p99 8ms, zero failovers",
      description: "The disconnects were initiated by the client side.",
    },
    {
      id: "connections-closed-by-the-app",
      source: "logs",
      title: "The app closed the sockets itself",
      description: "No instance was drained from rotation before the signal.",
    },
  ],

  hint: "The platform gave the process 30 seconds and it used 4 milliseconds. Ask what was still running in the other 29.996.",

};

const RATE_LIMITER_RACE_DIAGNOSIS: MissionDiagnosisConfig = {
  missionId: "rate-limiter-race",
  prompt: "What is the root cause?",
  minimumEvidenceRequired: 3,

  rootCauses: [
    {
      id: "non-atomic-distributed-rate-limit-counter",
      title: "The shared counter is updated with a non-atomic read-modify-write",
      description:
        "Concurrent requests on different instances read the same value, each adds one in application code, and the last write wins — so most increments are silently lost.",
      icon: "network",
    },
    {
      id: "incorrect-client-identifier",
      title: "The limiter keys on the wrong client identifier",
      description:
        "One client is being spread across several buckets, so no single bucket reaches the limit.",
      icon: "hash",
    },
    {
      id: "expiration-window-too-short",
      title: "The counter's expiry window is too short",
      description:
        "The key expires before the window closes, resetting the count mid-window.",
      icon: "activity",
    },
    {
      id: "store-replication-lag",
      title: "Replication lag serves stale counts",
      description:
        "Reads land on a replica that has not caught up with the latest writes.",
      icon: "database",
    },
    {
      id: "reverse-proxy-bypass",
      title: "Traffic bypasses the limiter at the proxy",
      description:
        "Some requests reach the API on a path where the middleware never runs.",
      icon: "payload",
    },
    {
      id: "clock-differences-between-instances",
      title: "Instances disagree about where the window starts",
      description:
        "Different clocks put requests in different windows, so each window undercounts.",
      icon: "cpu",
    },
  ],

  evidence: [
    {
      id: "same-count-read-by-several-instances",
      source: "trace",
      title: "Three instances read 97 within 1ms",
      description: "None of them has written yet when the others read.",
    },
    {
      id: "writes-overwrite-each-other",
      source: "logs",
      title: "Three writes of 98",
      description: "Two increments are lost; three requests cost the counter one.",
    },
    {
      id: "read-modify-write-in-application-code",
      source: "code",
      title: "get(), +1 in Node, set()",
      description: "Three steps with no atomicity between them.",
    },
    {
      id: "overshoot-scales-with-replicas",
      source: "metrics",
      title: "0% on one instance, 47% on eight",
      description: "The error tracks concurrency, not traffic.",
    },
    {
      id: "stored-count-below-actual-volume",
      source: "database",
      title: "Stored 112 after allowing 147",
      description: "35 increments never landed in the store.",
    },
    {
      id: "store-is-healthy",
      source: "metrics",
      title: "Store p99 2ms, single primary",
      description: "No errors, and no replica for a read to lag behind.",
    },
    {
      id: "clock-skew-is-negligible",
      source: "metrics",
      title: "9ms offset against a 60-second window",
      description: "Three orders of magnitude too small to matter.",
    },
    {
      id: "single-client-single-key",
      source: "logs",
      title: "One API key, one limiter key, 147 requests",
      description: "The identifier is not fragmenting the count.",
    },
    {
      id: "limiter-config-is-correct",
      source: "logs",
      title: "limit=100, window=60s, template as documented",
      description: "The configuration matches the intended contract.",
    },
  ],

  hint: "The same code was correct on one instance. Ask what changed about the sequence of operations when a second instance appeared.",

};

const MEMORY_LEAK_DIAGNOSIS: MissionDiagnosisConfig = {
  missionId: "memory-leak-worker",
  prompt: "What is retaining the memory?",
  minimumEvidenceRequired: 3,

  rootCauses: [
    {
      id: "long-lived-references-retain-completed-jobs",
      title: "Long-lived references retain completed jobs",
      description:
        "Structures that outlive a job still point at its data, so the garbage collector cannot reclaim anything the job allocated.",
      icon: "memory",
    },
    {
      id: "concurrent-jobs-inflate-heap-temporarily",
      title: "Concurrent jobs inflate the heap",
      description:
        "Four image jobs running at once legitimately need a large heap; the usage is real work, not a leak.",
      icon: "cpu",
    },
    {
      id: "v8-heap-limit-too-low",
      title: "The V8 heap limit is too low",
      description:
        "The worker is started with a max-old-space-size below what image processing genuinely needs.",
      icon: "memory",
    },
    {
      id: "image-payloads-grew-larger",
      title: "Image payloads got larger",
      description:
        "Users started uploading much bigger source images, so each job simply costs more memory than it used to.",
      icon: "payload",
    },
    {
      id: "garbage-collector-misconfigured",
      title: "Garbage collection is misconfigured",
      description:
        "GC flags or a non-default collector are stopping V8 from returning freed memory to the operating system.",
      icon: "activity",
    },
    {
      id: "queue-backlog-pressure",
      title: "A queue backlog is overloading the worker",
      description:
        "Jobs are arriving faster than they drain, so unstarted work accumulates in the worker's memory.",
      icon: "network",
    },
  ],

  evidence: [
    {
      id: "heap-never-returns-to-baseline",
      source: "metrics",
      title: "Heap never returns to baseline",
      description:
        "Old space climbs from 180MB to 1.42GB; the floor after each collection is higher than the last.",
    },
    {
      id: "listener-count-climbs-with-jobs",
      source: "metrics",
      title: "Listener count tracks jobs processed",
      description: "8,412 registered listeners after 8,400 jobs — one per job, never removed.",
    },
    {
      id: "max-listeners-warning",
      source: "logs",
      title: "MaxListenersExceededWarning on 'progress'",
      description:
        "Node itself reports that progress listeners keep accumulating on the worker.",
    },
    {
      id: "listener-added-per-job-never-removed",
      source: "code",
      title: "A progress listener is added per job and never removed",
      description:
        "The handler closes over the whole job, including its source buffer, and nothing removes it afterwards.",
    },
    {
      id: "gc-runs-more-but-frees-less",
      source: "trace",
      title: "GC runs more often and reclaims less",
      description:
        "Major collections went from every 90s to every 11s while reclaiming 210MB → 24MB each.",
    },
    {
      id: "memory-retained-with-zero-active-jobs",
      source: "logs",
      title: "Memory stays high with zero active jobs",
      description:
        "With an empty queue and active_jobs=0, heap held at 1.38GB against a 180MB boot baseline.",
    },
    {
      id: "payload-size-unchanged",
      source: "metrics",
      title: "Job payload size is unchanged",
      description: "Average source image is 2.1MB, the same as last week.",
    },
    {
      id: "queue-depth-and-concurrency-normal",
      source: "logs",
      title: "Queue depth and concurrency are normal",
      description: "Depth stays under 40 and concurrency is pinned at 4.",
    },
    {
      id: "downstream-services-healthy",
      source: "metrics",
      title: "Storage and database are healthy",
      description: "No downstream pressure, and CPU is flat outside GC pauses.",
    },
  ],

  hint: "Memory that survives an idle queue is not being used — it is being held. Ask what the process still has a reference to once a job is finished with.",

};

const QUEUE_BACKLOG_DIAGNOSIS: MissionDiagnosisConfig = {
  missionId: "worker-queue-backlog",
  prompt: "Why is the queue growing?",
  minimumEvidenceRequired: 3,

  rootCauses: [
    {
      id: "unbounded-retries-and-missing-backpressure",
      title: "Unbounded retries with no backpressure",
      description:
        "Failing jobs are retried immediately and forever, with no dead-letter path and nothing slowing the service down when the provider throttles it.",
      icon: "activity",
    },
    {
      id: "not-enough-workers",
      title: "Not enough workers",
      description:
        "The pool is undersized for the arrival rate, so the queue grows simply because there is not enough capacity to drain it.",
      icon: "cpu",
    },
    {
      id: "slow-database-queries",
      title: "Slow database queries",
      description:
        "Recipient lookups have become slow, so each job holds a worker far longer than it should.",
      icon: "database",
    },
    {
      id: "message-broker-degraded",
      title: "The message broker is degraded",
      description:
        "The broker is dropping connections or redelivering messages, so work is going round in circles below the application.",
      icon: "network",
    },
    {
      id: "worker-memory-leak",
      title: "A memory leak is slowing the workers",
      description:
        "Heap pressure and garbage-collection pauses are eating the worker's throughput as the process ages.",
      icon: "memory",
    },
    {
      id: "oversized-job-payloads",
      title: "Job payloads became too large",
      description:
        "Notification payloads grew, so serialisation and transfer now dominate every job.",
      icon: "payload",
    },
  ],

  evidence: [
    {
      id: "same-job-retried-endlessly",
      source: "logs",
      title: "One job retried thousands of times",
      description: "notif_88213 reaches attempt 4,812 with the same validation error.",
    },
    {
      id: "provider-429-rate",
      source: "metrics",
      title: "Most provider responses are 429",
      description: "61% of delivery calls are throttled, and each one is retried at once.",
    },
    {
      id: "immediate-requeue-in-catch",
      source: "code",
      title: "Failures are re-enqueued immediately",
      description:
        "The catch block re-adds the job with no cap, no delay and no permanent/transient split.",
    },
    {
      id: "poison-job-cycle-in-trace",
      source: "trace",
      title: "A job cycles through the worker in 40ms",
      description:
        "process → 429 → requeue completes in 40ms, so one job can burn a worker slot dozens of times a second.",
    },
    {
      id: "throughput-falls-as-workers-rise",
      source: "metrics",
      title: "More workers, fewer deliveries",
      description: "8 → 24 workers took successful deliveries from 240/min to 90/min.",
    },
    {
      id: "backlog-grows-with-empty-dead-letter",
      source: "database",
      title: "Backlog grows while the dead-letter queue stays empty",
      description:
        "184,000 ready messages, oldest 42 minutes old, and zero messages ever dead-lettered.",
    },
    {
      id: "broker-healthy",
      source: "database",
      title: "The queue broker is healthy",
      description: "18% CPU, 3ms publish latency, no failovers, no dropped connections.",
    },
    {
      id: "infrastructure-not-saturated",
      source: "metrics",
      title: "CPU, memory and database are fine",
      description: "Worker CPU 34%, heap flat, database p95 unchanged at 12ms.",
    },
    {
      id: "arrival-rate-unchanged",
      source: "metrics",
      title: "New-job arrival rate is unchanged",
      description: "1,104 notifications/min against a 7-day average of 1,097.",
    },
  ],

  hint: "Capacity was added and throughput fell. Ask what the workers are actually spending their slots on, and what happens to a job that can never succeed.",

};

const CONNECTION_POOL_DIAGNOSIS: MissionDiagnosisConfig = {
  missionId: "connection-pool-exhaustion",
  prompt: "Why are requests waiting for a connection?",
  minimumEvidenceRequired: 3,

  rootCauses: [
    {
      id: "connection-leak-on-error-path",
      title: "Connections are leaked on an error path",
      description:
        "A checked-out connection is never released when the handler returns early, so the pool loses one connection per occurrence and never gets it back.",
      icon: "network",
    },
    {
      id: "slow-database-query",
      title: "A slow query is holding connections",
      description:
        "One query has become slow enough that connections stay checked out for seconds at a time.",
      icon: "database",
    },
    {
      id: "pool-size-too-small",
      title: "The pool is too small for the traffic",
      description:
        "Twenty connections are simply not enough for the current request rate, so requests queue for a turn.",
      icon: "activity",
    },
    {
      id: "database-cpu-saturation",
      title: "The database is CPU saturated",
      description:
        "The database cannot keep up, so every connection is busy waiting on the server to respond.",
      icon: "cpu",
    },
    {
      id: "lock-contention",
      title: "Lock contention on the orders table",
      description:
        "Transactions are blocking each other, so connections sit waiting on locks rather than doing work.",
      icon: "hash",
    },
    {
      id: "network-latency-to-database",
      title: "Network latency to the database",
      description:
        "Round-trip time between the API and the database has risen, stretching every query out.",
      icon: "network",
    },
  ],

  evidence: [
    {
      id: "acquire-timeouts",
      source: "logs",
      title: "Requests time out acquiring a connection",
      description: "pool acquire timed out after 10000ms, raised before any SQL is sent.",
    },
    {
      id: "checkout-without-matching-release",
      source: "logs",
      title: "Checkouts with no matching release",
      description:
        "conn_41 is checked out, the handler errors, and no release for conn_41 ever follows. Twenty ids show the same pattern.",
    },
    {
      id: "pool-saturated-idle-zero",
      source: "metrics",
      title: "Pool pinned at maximum with zero idle",
      description: "Active holds at 20/20, idle at 0, with 34 requests queued.",
    },
    {
      id: "early-return-skips-release",
      source: "code",
      title: "An error path returns before release()",
      description:
        "NotFoundError is thrown after the connection is acquired; release() sits below it on the success path only.",
    },
    {
      id: "wait-dominates-request",
      source: "trace",
      title: "Waiting for a connection dominates the request",
      description: "4,820ms acquiring a connection against 14ms executing the query.",
    },
    {
      id: "query-execution-healthy",
      source: "database",
      title: "Query execution is still fast",
      description: "Mean duration 12ms, unchanged, and the slow-query log is empty.",
    },
    {
      id: "no-lock-contention",
      source: "database",
      title: "No lock waits or long transactions",
      description: "Zero lock-wait events and no transaction older than 40ms.",
    },
    {
      id: "database-cpu-and-replication-healthy",
      source: "metrics",
      title: "Database CPU and replication are healthy",
      description: "28% CPU, 40ms replica lag, 0.8ms round-trip time.",
    },
    {
      id: "notfound-rate-is-ordinary",
      source: "logs",
      title: "404s are ordinary traffic",
      description: "Missing-order lookups are 2.1% of requests, the same as last week.",
    },
  ],

  hint: "The database is doing less work than usual, not more. Count the connections the pool hands out against the ones it gets back, and look at what runs between those two events.",

};

const SLOW_API_DIAGNOSIS: MissionDiagnosisConfig = {
  missionId: "slow-api-incident",
  prompt: "What is making the orders endpoint slow?",
  minimumEvidenceRequired: 3,

  rootCauses: [
    {
      id: "n-plus-one-query-loop",
      title: "N+1 query loop in the service",
      description:
        "The handler fetches the list, then issues one more query per row to load related data, so the query count grows with the size of the result set.",
      icon: "database",
    },
    {
      id: "missing-database-index",
      title: "Missing database index",
      description:
        "The order_items lookup has no supporting index, so each query does more work than it should.",
      icon: "hash",
    },
    {
      id: "connection-pool-exhaustion",
      title: "Connection pool exhaustion",
      description:
        "Requests are queuing for a database connection, so latency is spent waiting rather than working.",
      icon: "activity",
    },
    {
      id: "slow-external-api",
      title: "A slow external API",
      description:
        "An upstream service called during order enrichment has become slow and is stretching the request out.",
      icon: "network",
    },
    {
      id: "event-loop-blocking",
      title: "Event-loop blocking in the handler",
      description:
        "Synchronous CPU work in the request path is holding the loop and delaying everything behind it.",
      icon: "cpu",
    },
    {
      id: "large-response-serialization",
      title: "Large response serialization",
      description:
        "The payload has grown and JSON serialisation now dominates the response time.",
      icon: "payload",
    },
  ],

  evidence: [
    {
      id: "latency-spike",
      source: "metrics",
      title: "Orders API latency increased",
      description: "Average response time went from 180ms to ~2.4s after the deploy.",
    },
    {
      id: "repeated-item-queries",
      source: "logs",
      title: "Repeated order item queries",
      description:
        "The same order_items query pattern runs once for every returned order.",
    },
    {
      id: "query-inside-loop",
      source: "code",
      title: "Database request inside loop",
      description: "The service loads order items separately for each order.",
    },
    {
      id: "query-count-scales",
      source: "database",
      title: "Query count tracks the number of orders",
      description: "One request returning 48 orders executed 49 SQL queries.",
    },
    {
      id: "per-query-time-fast",
      source: "database",
      title: "Each query on its own is fast",
      description:
        "The repeated lookup averages 42ms and nothing reaches the slow-query log.",
    },
    {
      id: "repeated-spans-in-trace",
      source: "trace",
      title: "The trace is mostly repeated spans",
      description:
        "48 near-identical order_items spans run back to back inside one request.",
    },
    {
      id: "latency-scales-with-order-count",
      source: "metrics",
      title: "Latency tracks the number of orders returned",
      description:
        "8 orders complete in ~420ms; 48 orders take ~2.4s on the same endpoint.",
    },
    {
      id: "normal-cpu",
      source: "metrics",
      title: "Application CPU remains normal",
      description: "CPU did not increase significantly during the slowdown.",
    },
    {
      id: "database-healthy",
      source: "metrics",
      title: "The database itself is healthy",
      description: "22% CPU, 3ms pool wait and an empty slow-query log.",
    },
  ],

  hint: "No single query is slow. Ask what changes between a fast request and a slow one — and count the queries in each.",

};

/* ------------------------------- Registry ------------------------------- */

/**
 * Diagnosis content is hand-authored per mission — the plausible-but-wrong root
 * causes only make sense against that mission's scenario. The route looks a
 * mission up by slug; missions without an entry fall back to the reserved-route
 * state, exactly like the investigation stage.
 */
export const diagnosisConfigs: Record<string, MissionDiagnosisConfig> = {
  "user-signup-latency-spike": SIGNUP_LATENCY_DIAGNOSIS,
  "event-loop-overload": EVENT_LOOP_DIAGNOSIS,
  "promise-all-cascade": PROMISE_CASCADE_DIAGNOSIS,
  "async-map-trap": ASYNC_MAP_DIAGNOSIS,
  "overlapping-scheduler-runs": SCHEDULER_OVERLAP_DIAGNOSIS,
  "unhandled-rejection-storm": REJECTION_STORM_DIAGNOSIS,
  "jwt-session-expiry": JWT_REFRESH_RACE_DIAGNOSIS,
  "health-check-flapping": HEALTH_CHECK_DIAGNOSIS,
  "graceful-shutdown-bug": GRACEFUL_SHUTDOWN_DIAGNOSIS,
  "rate-limiter-race": RATE_LIMITER_RACE_DIAGNOSIS,
  "memory-leak-worker": MEMORY_LEAK_DIAGNOSIS,
  "worker-queue-backlog": QUEUE_BACKLOG_DIAGNOSIS,
  "connection-pool-exhaustion": CONNECTION_POOL_DIAGNOSIS,
  "slow-api-incident": SLOW_API_DIAGNOSIS,
};

export function getDiagnosis(
  missionId: string,
): MissionDiagnosisConfig | undefined {
  return diagnosisConfigs[missionId];
}

export const DIAGNOSABLE_MISSION_IDS = Object.keys(diagnosisConfigs);

/** Confirmation gate: one root cause plus enough supporting evidence. */
export function canConfirm(
  config: MissionDiagnosisConfig,
  state: Pick<DiagnosisState, "rootCauseId" | "evidenceIds">,
): boolean {
  return (
    Boolean(state.rootCauseId) &&
    state.evidenceIds.length >= config.minimumEvidenceRequired
  );
}

/* ------------------------- Persistence (localStorage) ------------------- */

export { diagnosisStorageKey };

/**
 * Restores a mission's diagnosis. Selections are validated against the mission's
 * own config, so ids left over from edited content can never resurrect.
 */
export function loadDiagnosisState(
  config: MissionDiagnosisConfig,
): DiagnosisState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(
      diagnosisStorageKey(config.missionId),
    );
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DiagnosisState>;

    const rootCauseId = config.rootCauses.some((c) => c.id === parsed.rootCauseId)
      ? (parsed.rootCauseId as string)
      : null;
    const evidenceIds = Array.isArray(parsed.evidenceIds)
      ? parsed.evidenceIds.filter((id) =>
          config.evidence.some((e) => e.id === id),
        )
      : [];

    return {
      rootCauseId,
      evidenceIds,
      // A confirmed flag can't outlive the selections that earned it.
      confirmed:
        parsed.confirmed === true && canConfirm(config, { rootCauseId, evidenceIds }),
    };
  } catch {
    return null;
  }
}

export function saveDiagnosisState(
  missionId: string,
  state: DiagnosisState,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      diagnosisStorageKey(missionId),
      JSON.stringify(state),
    );
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}
