/* -------------------------------- Types --------------------------------- */

export type MissionResultMetric = {
  id: string;
  label: string;
  before: string;
  after: string;
  /** Featured metrics render a small before/after sparkline. */
  spark?: { before: number[]; after: number[]; yMax: number };
};

/**
 * Authored results *narrative* for a mission.
 *
 * Deliberately carries no score, time, step count or status: those describe a
 * run, not a mission, and are produced by the grading engine from what the
 * player actually did. What is authored here is the story — what the incident
 * was, what the correct fix changed, and what there was to learn.
 */
export type MissionResultConfig = {
  missionId: string;
  /** Copy for a run that resolved the incident. */
  resolved: ResultNarrative;
  /** Copy for a run that did not. Reuses the resolved metrics as a target. */
  unresolved: ResultNarrative;
  fix: {
    problem: string;
    solution: string;
    code: string;
    note: string;
  };
  /** Before/after impact of the *correct* fix. Only shown once resolved. */
  metrics: MissionResultMetric[];
  lessons: string[];
  skillImprovement: {
    /** Stable skill id from `lib/skills.ts` — not a display name. */
    skillId: string;
    description: string;
  };
  /** Overrides the derived "next available mission". */
  nextMissionId?: string;
};

export type ResultNarrative = {
  /** One-line completion headline. */
  summary: string;
  /** Short recap shown beside the mission title. */
  missionBlurb: string;
  encouragement: string;
};

/* ------------------------------- Content -------------------------------- */

const SIGNUP_LATENCY_RESULT: MissionResultConfig = {
  missionId: "user-signup-latency-spike",

  resolved: {
    summary:
      "You resolved the incident and restored signup performance.",
    missionBlurb:
      "New user registrations were taking several seconds to complete. You identified the root cause, implemented the correct fix, and restored normal response times.",
    encouragement: "Keep going! You're building real incident response skills.",
  },

  unresolved: {
    summary: "The incident is still open — signup latency has not recovered.",
    missionBlurb:
      "New user registrations were taking several seconds to complete. The change you applied didn't remove the slow operation from the request path, so the latency is unchanged.",
    encouragement:
      "Re-read the trace: the step that dominates the request is the one to move off it. You can run this incident again.",
  },

  fix: {
    problem:
      "The signup request was waiting for the welcome email to be sent before returning the response.",
    solution:
      "You moved email delivery to a background queue so the request can return immediately after the user is created.",
    code: `const user = await userRepository.create(input);

await emailQueue.add("welcome-email", {
  userId: user.id,
  email: user.email,
});`,
    note: "Welcome emails are now delivered asynchronously.",
  },

  metrics: [
    {
      id: "p95",
      label: "Signup API P95",
      before: "3.2s",
      after: "412ms",
      spark: {
        before: [3.0, 3.15, 3.05, 3.2, 3.1, 3.18, 3.08, 3.2],
        after: [1.0, 0.6, 0.5, 0.46, 0.44, 0.43, 0.42, 0.41],
        yMax: 4,
      },
    },
    {
      id: "avg",
      label: "Signup API Avg",
      before: "2.0s",
      after: "298ms",
    },
    {
      id: "error-rate",
      label: "Error Rate",
      before: "0.03%",
      after: "0.02%",
    },
    {
      id: "throughput",
      label: "Throughput",
      before: "110 req/min",
      after: "152 req/min",
    },
  ],

  lessons: [
    "Identify performance bottlenecks using logs, metrics, and traces",
    "Understand the impact of synchronous work inside HTTP request paths",
    "Move slow external operations to background jobs",
    "Verify fixes with before-and-after measurements",
  ],

  skillImprovement: {
    skillId: "request-performance",
    description:
      "You improved your ability to find and fix performance issues in backend systems.",
  },
};

const EVENT_LOOP_RESULT: MissionResultConfig = {
  missionId: "event-loop-overload",

  resolved: {
    summary: "You took the CPU work off the event loop and the API recovered.",
    missionBlurb:
      "A new reporting endpoint was aggregating 480,000 records synchronously inside the request handler, freezing the whole service. You moved that work off the main JavaScript thread, and responsiveness returned across every endpoint — not just the report.",
    encouragement:
      "Nice read. Blocking the loop is the most common way a healthy Node.js service falls over.",
  },

  unresolved: {
    summary: "The incident is still open — the event loop is still blocked.",
    missionBlurb:
      "A new reporting endpoint was aggregating 480,000 records synchronously inside the request handler. The change you applied didn't take that CPU work off the main JavaScript thread, so the service is still one report request away from freezing.",
    encouragement:
      "Ask what actually runs where: a promise, a bigger pool and a longer timeout all leave the work on the same thread. You can run this incident again.",
  },

  fix: {
    problem:
      "buildWeeklyReport() aggregated every analytics event synchronously inside the request handler, so the event loop could not serve anything else for ~7 seconds at a time.",
    solution:
      "You moved report generation into a worker thread and had the handler return a job response immediately, keeping the main thread free.",
    code: `const worker = new Worker(new URL("./report.worker.js", import.meta.url), {
  workerData: { jobId: job.id, since: startOfWeek() },
});

worker.once("message", (report) => reportJobs.complete(job.id, report));
worker.once("error", (err) => reportJobs.fail(job.id, err));

return res.status(202).json({ jobId: job.id, status: "processing" });`,
    note: "Reports are now built off the main thread and collected by job id.",
  },

  metrics: [
    {
      id: "event-loop-lag",
      label: "Event Loop Lag (P95)",
      before: "6.8s",
      after: "35ms",
      spark: {
        before: [6.6, 6.9, 6.75, 6.84, 6.8, 6.88, 6.7, 6.8],
        after: [1.8, 0.6, 0.18, 0.09, 0.05, 0.04, 0.035, 0.035],
        yMax: 7,
      },
    },
    {
      id: "api-p95",
      label: "API P95 (all routes)",
      before: "5.2s",
      after: "240ms",
    },
    {
      id: "throughput",
      label: "Throughput",
      before: "85 req/min",
      after: "210 req/min",
    },
    {
      id: "timeout-rate",
      label: "Timeout Rate",
      before: "8.4%",
      after: "0.3%",
    },
  ],

  lessons: [
    "An async function does not make CPU work non-blocking — a promise changes when work starts, not which thread runs it",
    "The Node.js event loop is built for short, non-blocking operations; anything longer starves every other request",
    "Worker threads are the right tool for CPU-intensive JavaScript that has to stay in-process",
    "Healthy database and memory metrics are evidence too — they eliminate false leads early in an incident",
  ],

  skillImprovement: {
    skillId: "event-loop",
    description:
      "You can now recognise event-loop starvation from lag, CPU and unrelated-endpoint latency together.",
  },
};

const PROMISE_CASCADE_RESULT: MissionResultConfig = {
  missionId: "promise-all-cascade",

  resolved: {
    summary: "You made the batch survive a failing member of it.",
    missionBlurb:
      "A nightly enrichment run was throwing away 47 successful vendor results because a 48th returned 503. You changed the batch from one shared outcome into 48 individual ones, so the run now keeps what it fetched and names what it couldn't.",
    encouragement:
      "Good instinct. The failing vendor was never the bug — what the code did about it was.",
  },

  unresolved: {
    summary: "The incident is still open — the run still keeps nothing.",
    missionBlurb:
      "A nightly enrichment run was throwing away 47 successful vendor results because a 48th returned 503. The change you applied left the batch sharing a single outcome, so the next flaky vendor will discard the whole run again.",
    encouragement:
      "Look again at what happens to the fulfilled values when one promise in the group rejects. You can run this incident again.",
  },

  fix: {
    problem:
      "Promise.all rejects as soon as any input promise rejects, and the values of the promises that fulfilled are unreachable — so one 503 discarded 47 vendor profiles that had already been fetched and paid for.",
    solution:
      "You settled every vendor call, persisted the fulfilled results, and recorded the rejected one with its vendor and reason so the run could report a partial success.",
    code: `const settled = await Promise.allSettled(
  vendors.map((vendor) => fetchVendorProfile(vendor)),
);

const profiles = settled.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
const failures = settled.flatMap((r, i) =>
  r.status === "rejected" ? [{ vendor: vendors[i].slug, error: r.reason }] : [],
);

await profileRepository.saveAll(profiles);`,
    note: "The run now reports 47 of 48, with northwind named.",
  },

  metrics: [
    {
      id: "vendors-persisted",
      label: "Vendors Enriched",
      before: "0 / 48",
      after: "47 / 48",
      spark: {
        before: [0, 0, 48, 0, 0, 0, 0, 0],
        after: [47, 47, 48, 47, 47, 48, 47, 47],
        yMax: 50,
      },
    },
    {
      id: "run-success-rate",
      label: "Run Success Rate",
      before: "18%",
      after: "100%",
    },
    { id: "wasted-calls", label: "Wasted Vendor Calls", before: "47 / run", after: "0 / run" },
    { id: "failure-attribution", label: "Named Failures", before: "0 of 1", after: "1 of 1" },
  ],

  lessons: [
    "Promise.all rejects on the first rejection, and the values of the promises that already fulfilled are lost with it",
    "A rejection does not cancel the other promises — they keep running, keep costing, and simply have nowhere to return to",
    "Promise.allSettled models a batch whose members can fail independently, which is what a fan-out over external services actually is",
    "Resilience without attribution is its own bug: a batch that swallows failures silently is harder to debug than one that fails loudly",
  ],

  skillImprovement: {
    skillId: "promises",
    description:
      "You can now reason about what a promise combinator does to the results of the promises that succeeded.",
  },
};

const ASYNC_MAP_RESULT: MissionResultConfig = {
  missionId: "async-map-trap",

  resolved: {
    summary: "You made the job wait for the work it started.",
    missionBlurb:
      "A worker was reporting 500 uploads processed in 14 milliseconds because nothing awaited the promises its map produced. You gave those promises an owner, so the job's success now means the thumbnails exist.",
    encouragement:
      "A job that finishes suspiciously fast is telling you something. You read it correctly.",
  },

  unresolved: {
    summary: "The incident is still open — the job still finishes early.",
    missionBlurb:
      "A worker was reporting 500 uploads processed in 14 milliseconds because nothing awaited the promises its map produced. The change you applied didn't make the job wait, so batches still report success while uploads are silently dropped.",
    encouragement:
      "Ask what an async callback hands back to map, and who is holding it. You can run this incident again.",
  },

  fix: {
    problem:
      "files.map(async …) builds an array of promises and the array was discarded, so processUploads returned — and marked the batch complete — before a single thumbnail had been generated.",
    solution:
      "You awaited the mapped promises with a concurrency limit, so the job's duration reflects the work it did and a failed file fails the batch instead of vanishing.",
    code: `const limit = pLimit(8);

await Promise.all(
  files.map((file) =>
    limit(async () => {
      const thumbnail = await imageService.createThumbnail(file);
      await uploadRepository.attachThumbnail(file.id, thumbnail);
    }),
  ),
);`,
    note: "The batch is completed only after all 500 files are attached.",
  },

  metrics: [
    {
      id: "thumbnails-produced",
      label: "Thumbnails per Batch",
      before: "313 / 500",
      after: "500 / 500",
      spark: {
        before: [318, 305, 313, 297, 311, 308, 316, 302],
        after: [500, 500, 499, 500, 500, 500, 500, 500],
        yMax: 520,
      },
    },
    { id: "job-duration", label: "Job Duration", before: "14ms", after: "4.2s" },
    {
      id: "failures-attributed",
      label: "Failures Attributed to a Job",
      before: "0%",
      after: "100%",
    },
    { id: "orphaned-operations", label: "Operations Outliving the Job", before: "187", after: "0" },
  ],

  lessons: [
    "An async callback passed to .map() returns a promise, so .map() returns an array of promises — not an array of results",
    "forEach is worse than map here, not better: it discards the promise entirely, leaving nothing to await",
    "A function that returns before its async work finishes reports success it has not earned, and its failures land outside any job",
    "Awaiting a fan-out unbounded starts every operation at once; a concurrency limit is usually part of the same fix",
  ],

  skillImprovement: {
    skillId: "async-javascript",
    description:
      "You can now spot the async control-flow mistakes that silently skip work instead of failing.",
  },
};

const SCHEDULER_OVERLAP_RESULT: MissionResultConfig = {
  missionId: "overlapping-scheduler-runs",

  resolved: {
    summary: "You stopped the second run from existing.",
    missionBlurb:
      "A billing sync scheduled every 60 seconds had grown to take 95, so each run overlapped the next and charged the same invoices twice. You paced the schedule by completion instead of by the clock, and the duplicates stopped.",
    encouragement:
      "You resisted two very plausible wrong answers — the payment provider and a second replica. The evidence ruled both out.",
  },

  unresolved: {
    summary: "The incident is still open — runs still overlap.",
    missionBlurb:
      "A billing sync scheduled every 60 seconds had grown to take 95, so each run overlapped the next and charged the same invoices twice. The change you applied left the schedule tied to the clock, so a slow run still collides with the following tick.",
    encouragement:
      "Mitigating a duplicate charge is not the same as preventing a duplicate run. You can run this incident again.",
  },

  fix: {
    problem:
      "setInterval fires on a fixed clock and does not wait for an async callback to settle. Once a run took longer than its 60-second interval, a second run started and re-read a pending-invoice list the first run had not finished marking.",
    solution:
      "You replaced the interval with a self-scheduling timer set in a finally block, plus an in-flight guard, so the next run can only begin after the previous one has settled.",
    code: `let running = false;

async function tick() {
  if (running) return;
  running = true;
  try {
    await syncInvoices();
  } finally {
    running = false;
    setTimeout(tick, 60_000);
  }
}`,
    note: "Runs are now serialised; the cadence follows completion.",
  },

  metrics: [
    {
      id: "duplicate-charges",
      label: "Duplicate Charges (24h)",
      before: "38",
      after: "0",
      spark: {
        before: [4, 5, 4, 5, 4, 5, 4, 5],
        after: [1, 0, 0, 0, 0, 0, 0, 0],
        yMax: 6,
      },
    },
    { id: "concurrent-runs", label: "Concurrent Runs (peak)", before: "2", after: "1" },
    { id: "invoices-charged-twice", label: "Invoices Read by Two Runs", before: "412", after: "0" },
    {
      id: "sync-cadence",
      label: "Effective Sync Cadence",
      before: "60s (nominal)",
      after: "155s (paced by run)",
    },
  ],

  lessons: [
    "setInterval schedules on wall-clock time and does not wait for an async callback to finish, so a slow run overlaps the next tick",
    "Scheduling the next run from a finally block makes the cadence a consequence of completion rather than a hope about duration",
    "An idempotency key limits the damage of a duplicate operation; it does not stop the duplicate work, or the side effects that lack a key",
    "When two actors touch the same rows, prove which actors exist first — the instance id in the logs ruled out a second replica",
  ],

  skillImprovement: {
    skillId: "background-jobs",
    description:
      "You can now design a recurring job whose schedule cannot outrun its own execution.",
  },
};

const REJECTION_STORM_RESULT: MissionResultConfig = {
  missionId: "unhandled-rejection-storm",

  resolved: {
    summary: "You gave the failing promise an owner.",
    missionBlurb:
      "A notification service was exiting several times an hour and stranding hundreds of queued messages. The cause was an async event listener whose rejection nobody was waiting on — which Node terminates the process for. You handled the failure where the promise stopped being awaited, so a provider outage now degrades delivery instead of ending the service.",
    encouragement:
      "You kept going past 'stop the crash' to 'and what happens to the message?'. That is the difference between uptime and correctness.",
  },

  unresolved: {
    summary: "The incident is still open — the process is still exiting.",
    missionBlurb:
      "A notification service was exiting several times an hour and stranding hundreds of queued messages, because an async event listener's rejection had no caller to catch it. The change you applied left that rejection unowned, so the crash loop and the message loss both continue.",
    encouragement:
      "Suppressing the rejection and handling it are different things — one keeps the process up, the other keeps the message. You can run this incident again.",
  },

  fix: {
    problem:
      "An async function passed to emitter.on returns a promise that the emitter throws away. When the push provider returned 500, that promise rejected with no caller to catch it, and Node 20 terminates the process on an unhandled rejection by default.",
    solution:
      "You handled the error at the boundary where the promise stops being awaited: the delivery is caught, logged against its message id, and marked failed so the outbox can retry it.",
    code: `events.on("delivery", (notification: Notification) => {
  void deliver(notification).catch((error) => {
    logger.error("delivery failed", { id: notification.id, error });
    return outbox.markFailed(notification.id, error);
  });
});`,
    note: "A failing provider now costs one delivery, not the process.",
  },

  metrics: [
    {
      id: "restarts",
      label: "Process Restarts (1h)",
      before: "41",
      after: "0",
      spark: {
        before: [19, 21, 20, 22, 19, 21, 20, 22],
        after: [3, 0, 0, 0, 0, 0, 0, 0],
        yMax: 25,
      },
    },
    { id: "unhandled-rejections", label: "Unhandled Rejections (1h)", before: "41", after: "0" },
    { id: "stranded-messages", label: "Messages Stranded", before: "214 / crash", after: "0" },
    { id: "delivery-success", label: "Delivery Success Rate", before: "61%", after: "96.6%" },
  ],

  lessons: [
    "Since Node 15, an unhandled promise rejection terminates the process by default — it is a crash, not a warning",
    "An async function passed to emitter.on or called fire-and-forget has no caller, so its rejection has nowhere to go; the boundary needs an explicit .catch()",
    "A process-level unhandledRejection handler keeps the service up but leaves the failed operation unhandled and the process in an unknown state — a safety net, not a fix",
    "Read the exit signal before blaming the platform: code 1 with no signal is the process ending itself, not SIGKILL or a liveness probe",
  ],

  skillImprovement: {
    skillId: "error-handling",
    description:
      "You can now find the boundary where a promise stops being awaited, and make failures observable there.",
  },
};

const JWT_REFRESH_RACE_RESULT: MissionResultConfig = {
  missionId: "jwt-session-expiry",

  resolved: {
    summary: "You made one expiry cost exactly one refresh.",
    missionBlurb:
      "Users were being logged out of perfectly valid sessions. Pages that fire several API calls at once had them all expire in the same millisecond, and each one refreshed independently — the first rotated the refresh token and the rest presented the old one, which reuse detection correctly treated as theft. You coordinated the client so a single refresh serves every waiting request, leaving rotation and reuse detection exactly as they were.",
    encouragement:
      "You fixed the caller instead of weakening the security control it was tripping. That distinction is the whole mission.",
  },

  unresolved: {
    summary: "The incident is still open — sessions are still being revoked.",
    missionBlurb:
      "Users were being logged out of valid sessions because concurrent requests each refreshed on their own, and the later ones presented a refresh token that had already been rotated out. The change you applied left several callers able to start a refresh at the same time, so a superseded token is still presented and the family is still revoked.",
    encouragement:
      "Rotation and reuse detection were both behaving correctly. Ask how many callers should be allowed to start a refresh. You can run this incident again.",
  },

  fix: {
    problem:
      "Every 401 called refreshSession() independently. Six parallel dashboard requests expired together, so six refreshes raced: one rotated rt_9f3 into rt_c17 and the rest presented rt_9f3, which reuse detection read as a replayed token and revoked the whole family.",
    solution:
      "You gave the client a single in-flight refresh. The first 401 starts the refresh and stores its promise; every other 401 awaits the same promise and resumes with the same new token. The promise is cleared in a finally block so a failed refresh doesn't pin later requests.",
    code: `let inFlight: Promise<Session> | null = null;

export function refreshSession(): Promise<Session> {
  inFlight ??= doRefresh().finally(() => {
    inFlight = null;
  });
  return inFlight;
}`,
    note: "Rotation and reuse detection are unchanged — they no longer receive a false positive.",
  },

  metrics: [
    {
      id: "forced-logouts",
      label: "Forced Logout Rate",
      before: "6.1%",
      after: "0.02%",
      spark: {
        before: [29, 31, 28, 33, 30, 32, 29, 31],
        after: [6, 1, 0, 0, 1, 0, 0, 0],
        yMax: 40,
      },
    },
    { id: "refresh-per-expiry", label: "Refresh Calls Per Expiry", before: "4.8", after: "1.0" },
    { id: "reuse-rejections", label: "Refresh 401 token_reused (1h)", before: "1,842", after: "0" },
    {
      id: "session-continuity",
      label: "Sessions Surviving An Expiry",
      before: "93.9%",
      after: "99.98%",
    },
  ],

  lessons: [
    "Rotating refresh tokens makes refresh a single-use operation, so concurrent refreshes are a correctness problem in the client, not a bug in the server",
    "Single-flight is the standard shape: share one in-flight promise across callers and clear it in a finally block so a failure doesn't stick",
    "Reuse detection cannot distinguish a racing tab from a stolen token — disabling it or accepting superseded tokens trades a client bug for a permanent loss of theft detection",
    "Longer access-token lifetimes and refresh retries both reduce how often the race is observed without changing the race at all",
  ],

  skillImprovement: {
    skillId: "authentication",
    description:
      "You can reason about token rotation and reuse detection under concurrency, and fix the client without weakening the session model.",
  },
};

const HEALTH_CHECK_RESULT: MissionResultConfig = {
  missionId: "health-check-flapping",

  resolved: {
    summary: "You stopped the platform from killing healthy processes.",
    missionBlurb:
      "A third-party analytics slowdown was restarting the entire fleet. One endpoint answered both the liveness and readiness probes and awaited every dependency unbounded, so a five-second external call made a process that was serving orders in 41ms look dead. You split the two questions apart and bounded the dependency checks, so a degraded dependency now costs readiness instead of the process.",
    encouragement:
      "The instance being restarted was answering traffic the whole time. Noticing that is what separates this from a memory-leak hunt.",
  },

  unresolved: {
    summary: "The incident is still open — instances are still cycling.",
    missionBlurb:
      "A third-party slowdown was restarting healthy instances because the liveness probe waited on every dependency. The change you applied left liveness coupled to something outside the process, so the platform still reads a slow dependency as a dead process and the restart cascade continues.",
    encouragement:
      "Liveness and readiness answer different questions, and only one of them justifies a restart. You can run this incident again.",
  },

  fix: {
    problem:
      "GET /health served the liveness probe and awaited the database, payments, messaging and a reporting-only analytics API in sequence with no timeout. When analytics took 5s, the 5.1s health request blew past the 3s probe timeout and the platform restarted a process that was healthy — removing capacity and pushing order errors to 11.4%.",
    solution:
      "You separated the probes. Liveness answers from the process alone with no I/O. Readiness checks the dependencies this instance genuinely needs to serve traffic, each behind a short timeout, and the analytics call — which no order request touches — was removed from both.",
    code: `@Get("/live")
live() {
  return { status: "ok" };  // no I/O, no dependencies
}

@Get("/ready")
async ready() {
  const db = await withTimeout(this.db.query("select 1"), 500);
  return db.ok ? { status: "ok" } : this.notReady();
}`,
    note: "A degraded dependency now removes an instance from traffic instead of restarting it.",
  },

  metrics: [
    {
      id: "healthy-instances",
      label: "Healthy Instances",
      before: "3 / 8",
      after: "8 / 8",
      spark: {
        before: [4, 3, 3, 4, 3, 3, 4, 3],
        after: [6, 8, 8, 8, 8, 8, 8, 8],
        yMax: 10,
      },
    },
    { id: "restarts", label: "Container Restarts (30m)", before: "37", after: "0" },
    { id: "api-5xx", label: "Orders API 5xx Rate", before: "11.4%", after: "0.2%" },
    { id: "liveness-latency", label: "Liveness Probe p95", before: "5.1s", after: "3ms" },
  ],

  lessons: [
    "Liveness asks 'is this process irrecoverably stuck?' and readiness asks 'can this instance serve traffic right now?' — only the first should ever cause a restart",
    "A liveness probe that performs external I/O converts any dependency's latency into your own restart rate",
    "Every dependency check needs a bounded timeout, and every dependency needs a decision about whether it belongs in readiness at all — a reporting API on no request path belongs in neither probe",
    "Restarting healthy instances removes capacity, which raises the error rate and produces more probe failures — a fix that appears to make the incident worse is usually a feedback loop",
  ],

  skillImprovement: {
    skillId: "api-design",
    description:
      "You can design health endpoints that report what the platform actually needs to decide, with bounded dependency checks.",
  },
};

const GRACEFUL_SHUTDOWN_RESULT: MissionResultConfig = {
  missionId: "graceful-shutdown-bug",

  resolved: {
    summary: "You made the process finish its work before it ends.",
    missionBlurb:
      "Deploys were dropping around 23 requests per instance, rolling back checkout transactions mid-flight and redelivering jobs that had already been acknowledged. The SIGTERM handler closed the database pool and called process.exit() within four milliseconds, inside a 30-second grace period. You replaced it with a bounded drain that stops new traffic first, waits for what is running, and closes resources last.",
    encouragement:
      "You got the ordering right — readiness, then the server, then the work, then the resources. That sequence is what makes a rollout invisible.",
  },

  unresolved: {
    summary: "The incident is still open — deploys are still dropping requests.",
    missionBlurb:
      "Deploys were dropping in-flight requests because the process exited within milliseconds of SIGTERM, without stopping new traffic or waiting for work in progress. The change you applied still lets the process end before its work does, so requests are still cut mid-transaction and jobs are still acknowledged without completing.",
    encouragement:
      "The platform allowed 30 seconds and the process used four milliseconds. Ask what has to stop first so that what is already running can finish. You can run this incident again.",
  },

  fix: {
    problem:
      "The SIGTERM handler closed the database pool and called process.exit(0) immediately. The HTTP server was never closed, so new requests kept arriving; nothing waited on the 23 requests already running; and queue consumers kept prefetching and acknowledging jobs the process would never finish.",
    solution:
      "You implemented a bounded drain in the right order: fail readiness so the load balancer stops sending traffic, stop the queue consumers, close the server to new connections while active requests finish, wait for in-flight work against a deadline, close the database last, and exit.",
    code: `process.on("SIGTERM", async () => {
  health.setReady(false);              // stop receiving new traffic
  await consumers.stop();              // stop taking new jobs
  await closeServer(server);           // finish in-flight requests
  await Promise.race([
    activeWork.drained(),
    delay(SHUTDOWN_TIMEOUT_MS),        // bounded, never unbounded
  ]);
  await db.pool.end();                 // resources close last
  process.exit(0);
});`,
    note: "The drain is bounded, so a stuck request delays the exit but cannot prevent it.",
  },

  metrics: [
    {
      id: "deploy-5xx",
      label: "5xx Rate During Deploys",
      before: "8.7%",
      after: "0.04%",
      spark: {
        before: [8.7, 6.2, 0.1, 0, 8.7, 6.2, 0.1, 0],
        after: [0.04, 0.04, 0, 0, 0.04, 0, 0, 0],
        yMax: 10,
      },
    },
    { id: "dropped-requests", label: "Requests Dropped Per Deploy", before: "23", after: "0" },
    { id: "rolled-back", label: "Transactions Rolled Back", before: "23", after: "0" },
    { id: "job-redeliveries", label: "Queue Redeliveries Per Deploy", before: "31", after: "0" },
  ],

  lessons: [
    "Graceful shutdown is an ordering problem before it is a timing problem: stop new work, finish current work, then release resources",
    "Failing readiness before closing the server is what removes the errors — otherwise the balancer is still routing to a socket you have just closed",
    "A fixed sleep before process.exit() waits on nothing in particular; it reduces the error rate enough to hide the problem and not enough to solve it",
    "Every drain needs a deadline, because an unbounded wait turns a deploy into a hang and the platform will send SIGKILL regardless",
  ],

  skillImprovement: {
    skillId: "process-lifecycle",
    description:
      "You can design a shutdown sequence that finishes in-flight work, keeps jobs consistent, and still exits inside the platform's grace period.",
  },
};

const RATE_LIMITER_RACE_RESULT: MissionResultConfig = {
  missionId: "rate-limiter-race",

  resolved: {
    summary: "You moved the increment to where it can actually be atomic.",
    missionBlurb:
      "Clients were being allowed 147 requests in a window configured for 100, and the overshoot grew with every replica added. The limiter read the counter, added one in application code and wrote it back — so concurrent requests on different instances all read the same value and overwrote each other's increments. You replaced the sequence with a single atomic operation in the shared store.",
    encouragement:
      "You spotted that the overshoot scaled with instances rather than traffic. That one correlation rules out almost every other explanation.",
  },

  unresolved: {
    summary: "The incident is still open — clients still exceed the limit.",
    missionBlurb:
      "A distributed rate limiter was allowing far more requests than configured because it read, incremented and wrote the counter as three separate steps. The change you applied left that window open, so concurrent instances still read the same value and increments are still lost.",
    encouragement:
      "The counter was correct on a single instance. Ask which component is in a position to serialise the operation for all eight at once. You can run this incident again.",
  },

  fix: {
    problem:
      "The middleware ran store.get(), added one in Node, then store.set(). With eight instances, three concurrent requests all read 97 and all wrote 98 — two increments vanished. Across a window that lost 35 increments, so 147 requests were allowed against a limit of 100.",
    solution:
      "You replaced the read-modify-write with one atomic increment-and-expire performed by the shared store. Each caller receives its own distinct count, the TTL is set in the same operation, and correctness no longer depends on how many instances are running.",
    code: `const count = await store.incrementAndExpire(key, 60);
if (count > LIMIT) return res.status(429).end();
return next();`,
    note: "One round trip replaces two, and the store is the single point of serialisation.",
  },

  metrics: [
    {
      id: "allowed-per-window",
      label: "Requests Allowed Per Window",
      before: "147",
      after: "100",
      spark: {
        before: [131, 142, 147, 139, 144, 147, 141, 146],
        after: [108, 100, 100, 100, 100, 100, 100, 100],
        yMax: 160,
      },
    },
    { id: "overshoot", label: "Overshoot Above Limit", before: "+47%", after: "0%" },
    { id: "lost-increments", label: "Lost Increments Per Minute", before: "35", after: "0" },
    {
      id: "limiter-latency",
      label: "Limiter Overhead Per Request",
      before: "5ms",
      after: "2ms",
    },
  ],

  lessons: [
    "Read-modify-write across a network is a lost-update race whenever more than one process participates; the operation has to be atomic where the state lives",
    "An in-process mutex serialises one instance and is invisible to the other seven — it makes a distributed race pass a single-instance load test",
    "Set the counter's expiry in the same atomic operation as the increment, or a race between incrementing and expiring leaves a key with no TTL",
    "When an error scales with replica count rather than traffic volume, the cause is concurrency between processes — not configuration, latency, or clock skew",
  ],

  skillImprovement: {
    skillId: "api-design",
    description:
      "You can identify lost-update races in shared state and place the atomic operation where every instance is bound by it.",
  },
};

/* ------------------------------- Registry ------------------------------- */

/**
 * Results content is authored per mission — the score, lessons and skill reward
 * belong to that mission's scenario. The route looks a mission up by slug;
 * missions without an entry fall back to the reserved-route state.
 */
const MEMORY_LEAK_RESULT: MissionResultConfig = {
  missionId: "memory-leak-worker",

  resolved: {
    summary: "You found what the worker was holding on to after every job.",
    missionBlurb:
      "Image workers grew from 180MB to 1.42GB across four hours and were recycled seven times a day. Every job registered a progress listener that was never removed, and each of those handlers closed over the whole job — including its 2.1MB source buffer. The jobs finished; their memory did not. You removed the listener on every exit path and bounded what the worker keeps about completed work.",
    encouragement:
      "The detail that decided it was heap staying at 1.38GB with zero active jobs. Memory that survives an idle queue is retained, not in use.",
  },

  unresolved: {
    summary: "The incident is still open — the workers are still growing.",
    missionBlurb:
      "Image workers were leaking roughly 1.2GB every four hours because a per-job listener held each completed job and its image buffer alive. The change you applied did not make those references unreachable, so the heap still climbs until the memory threshold recycles the process.",
    encouragement:
      "Garbage collection was already running four times more often and freeing a tenth as much. That rules out the collector and points at what is still reachable. You can run this incident again.",
  },

  fix: {
    problem:
      "processJob called worker.on(\"progress\", onProgress) on every job and never removed it. The handler captured the whole ImageJob, so 8,412 closures kept 1.19GB of finished jobs and source buffers permanently reachable. Garbage collection could not reclaim any of it, because none of it was garbage.",
    solution:
      "You removed the listener in a finally block so it goes away on every exit path, replaced the unbounded recent-job array with a bounded list of small summaries, and exposed the listener count and heap as metrics so the same failure surfaces as an alert instead of a restart.",
    code: `worker.on("progress", onProgress);
try {
  return await worker.run(job);
} finally {
  worker.off("progress", onProgress);
}`,
    note: "Heap now returns to its 180MB baseline whenever the queue drains.",
  },

  metrics: [
    {
      id: "heap-after-4h",
      label: "Worker Heap After 4h",
      before: "1.42 GB",
      after: "214 MB",
      spark: {
        before: [182, 371, 592, 848, 1104, 1382, 1421],
        after: [182, 208, 197, 214, 203, 211, 206],
        yMax: 1500,
      },
    },
    { id: "listener-count", label: "Registered Listeners", before: "8,412", after: "3" },
    { id: "worker-restarts", label: "Memory Restarts / 24h", before: "7", after: "0" },
    { id: "gc-reclaim", label: "Reclaimed Per Major GC", before: "24 MB", after: "196 MB" },
  ],

  lessons: [
    "A leak is memory that is still reachable, not memory the collector forgot — if forcing a collection would not help, the objects are being held by something that is still alive",
    "Every listener registered per unit of work needs a removal on every exit path; `once()` or a `finally` block makes that structural instead of a thing you remember",
    "A closure retains everything in its scope, so logging `job.sourceBuffer` inside a handler keeps a 2.1MB buffer alive for as long as the handler exists",
    "Debug history — recent jobs, last payloads, error samples — must be bounded and hold metadata, never the payloads themselves",
    "Heap that stays high while the active-job count is zero separates a leak from legitimate concurrent load, and rules out payload size and queue depth in one measurement",
  ],

  skillImprovement: {
    skillId: "closures-memory",
    description:
      "You can read heap growth against work completed, identify what is retaining finished objects, and make the release structural rather than incidental.",
  },
};

const QUEUE_BACKLOG_RESULT: MissionResultConfig = {
  missionId: "worker-queue-backlog",

  resolved: {
    summary: "You gave failures somewhere to go other than back on the queue.",
    missionBlurb:
      "The notification queue reached 184,000 messages while workers ran at 98% utilisation. One malformed job was on attempt 4,812, and 61% of provider calls were being throttled — every one of them re-enqueued instantly. Scaling from 8 to 24 workers took throughput from 240/min down to 90/min. You capped attempts, added exponential backoff with jitter, dead-lettered what could never succeed, and limited outbound calls to what the provider actually accepts.",
    encouragement:
      "The signal that mattered was throughput falling as capacity rose. When more workers make it worse, the workers are not the constraint.",
  },

  unresolved: {
    summary: "The incident is still open — the backlog is still growing.",
    missionBlurb:
      "A poison job and a rate-limiting provider were consuming nearly all worker capacity through unbounded immediate retries. The change you applied left the retry path unchanged, so the same job keeps cycling every 40ms, the provider keeps returning 429, and the dead-letter queue is still empty.",
    encouragement:
      "Two failures are sharing one code path: one that will never succeed and many that would succeed later. They need different answers. You can run this incident again.",
  },

  fix: {
    problem:
      "The catch block called queue.add() with no attempt cap, no delay and no classification. A permanently invalid job re-entered a worker slot roughly 25 times a second, and every throttled delivery was retried immediately — which generated more throttling. Adding workers multiplied both effects, so throughput fell as capacity rose.",
    solution:
      "You split permanent failures from transient ones, capped attempts at five, backed off exponentially with jitter, dead-lettered anything that exhausted its attempts, and scheduled outbound calls through a provider-aware limiter so the service offers only as much load as the provider will take.",
    code: `if (isPermanent(error) || job.attemptsMade >= MAX_ATTEMPTS) {
  await deadLetter.add(job.name, job.data, { reason: String(error) });
  return;
}
const backoff = Math.min(2 ** job.attemptsMade * 1000, 60_000);
await queue.add(job.name, job.data, { delay: backoff + Math.random() * 1000 });`,
    note: "The backlog drained to 1,240 messages with 8 workers — a third of the fleet.",
  },

  metrics: [
    {
      id: "queue-depth",
      label: "Queue Depth",
      before: "184,012",
      after: "1,240",
      spark: {
        before: [96, 118, 141, 162, 178, 184, 191],
        after: [96, 71, 42, 18, 5, 2, 1],
        yMax: 200,
      },
    },
    { id: "delivered-per-minute", label: "Delivered / Min", before: "90", after: "1,090" },
    { id: "provider-429-rate", label: "Provider 429 Rate", before: "61%", after: "0.7%" },
    { id: "oldest-job-age", label: "Oldest Job Age", before: "42m", after: "38s" },
  ],

  lessons: [
    "Retrying an operation that can never succeed is an infinite loop with extra steps — classify failures as permanent or transient before deciding whether to try again",
    "A dead-letter queue that is always empty is not a sign of health; it means nothing is ever allowed to fail, so poison jobs stay in the working set forever",
    "Retrying a 429 immediately is a request to be throttled harder — exponential backoff with jitter is what turns a rate limit into a queue instead of a storm",
    "When throughput falls as workers are added, capacity is not the constraint: the pool is being spent on work that produces nothing, and more of it spends faster",
    "Backpressure belongs on the outbound side too — admission control that matches the provider's accepted rate keeps a downstream limit from becoming an internal outage",
  ],

  skillImprovement: {
    skillId: "background-jobs",
    description:
      "You can read a queue's depth, age and retry counters together, and design retry, dead-letter and backpressure policy that degrades instead of collapsing.",
  },
};

const CONNECTION_POOL_RESULT: MissionResultConfig = {
  missionId: "connection-pool-exhaustion",

  resolved: {
    summary: "You found the path that took a connection and never gave it back.",
    missionBlurb:
      "Requests to the orders API were taking 4.9 seconds while the queries inside them took 14ms. The pool sat at 20 of 20 with zero idle connections and 34 requests queued, yet the database was at 28% CPU with an empty slow-query log. One handler acquired a connection and then threw NotFoundError before reaching release(), so every missing-order lookup cost the pool a connection permanently. You made release structural and bounded the wait.",
    encouragement:
      "Separating acquire time from query time is what made this solvable. A request that waits 4,820ms to run 14ms of work is not a database problem.",
  },

  unresolved: {
    summary: "The incident is still open — connections are still being lost.",
    missionBlurb:
      "An error path in the order-detail handler returned before releasing its pooled connection, so the pool leaked one connection per missing-order lookup until nothing was left. The change you applied did not guarantee the release, so the pool is still pinned at its maximum and requests still queue for seconds.",
    encouragement:
      "Count the checkout events against the release events for the same connection id, then read what runs between them. You can run this incident again.",
  },

  fix: {
    problem:
      "pool.getConnection() was called at the top of the handler, and connection.release() sat near the bottom on the success path. A missing order threw NotFoundError in between, so the release never ran. At 2.1% of requests, the pool lost all twenty connections and every later request waited the full ten-second acquisition timeout.",
    solution:
      "You moved connection use inside a scoped helper whose finally block releases on every path, including throws. The unrelated billing API call now happens after the connection is back in the pool, and a short acquisition timeout turns future starvation into a fast, visible failure instead of a hang.",
    code: `const connection = await pool.getConnection({ acquireTimeoutMs: 2000 });
try {
  return await fn(connection);
} finally {
  connection.release();
}`,
    note: "Acquire wait fell from 4.8s to 2ms with the pool size unchanged at 20.",
  },

  metrics: [
    {
      id: "request-latency",
      label: "Request Latency (p95)",
      before: "4,902ms",
      after: "88ms",
      spark: {
        before: [1180, 2410, 3620, 4480, 4902, 4870, 4915],
        after: [1180, 412, 96, 88, 84, 91, 87],
        yMax: 5200,
      },
    },
    { id: "acquire-wait", label: "Pool Acquire Wait (p95)", before: "4.8s", after: "2ms" },
    { id: "pool-idle", label: "Idle Connections", before: "0 of 20", after: "16 of 20" },
    { id: "query-duration", label: "Query Execution (p95)", before: "18ms", after: "17ms" },
  ],

  lessons: [
    "Split request latency into acquiring a resource and using it — high wait with fast execution points at the pool, never at the query",
    "Any resource acquired outside a `try` is released only by luck; `finally` or a scoped helper that owns the lifecycle is what makes it certain",
    "Error paths deserve the same cleanup scrutiny as success paths, because they are the ones that run under exactly the conditions that cause an incident",
    "Never hold a pooled connection across an unrelated external call — the pool's capacity becomes hostage to someone else's latency",
    "A saturated pool in front of an idle database is a leak, not a sizing problem; raising the maximum only changes how long exhaustion takes",
  ],

  skillImprovement: {
    skillId: "performance-debugging",
    description:
      "You can tell resource starvation from slow work by where the time is spent, and prove a leak by matching checkouts against releases.",
  },
};

const SLOW_API_RESULT: MissionResultConfig = {
  missionId: "slow-api-incident",

  resolved: {
    summary: "You cut 49 queries per request down to two.",
    missionBlurb:
      "The orders endpoint went from 180ms to 2.4s after the v2.8.1 deploy. Every query was fast — 42ms on average, nothing in the slow-query log, database CPU at 22% — but the handler fetched order items inside a loop, so a page of 48 orders executed 49 statements. Latency tracked the size of the result set rather than the load. You loaded the related rows in one statement and grouped them in memory.",
    encouragement:
      "You spotted that a page of 8 orders took 420ms and a page of 48 took 2.4s. Latency that scales with the result set is an N+1 pattern, whatever the profiler says about individual queries.",
  },

  unresolved: {
    summary: "The incident is still open — the endpoint is still slow.",
    missionBlurb:
      "The orders handler was issuing one extra query per returned order, so a single request executed 49 statements. The change you applied left that loop in place, so the query count still grows with the page size and the response time grows with it.",
    encouragement:
      "No individual query is slow, so nothing that makes a query faster will help. Ask how many statements the request should need. You can run this incident again.",
  },

  fix: {
    problem:
      "getOrdersForUser fetched the orders, then awaited orderItemRepository.find() once per order inside a for loop. Forty-eight round trips of about 42ms each, taken one after another, are what turned a 180ms endpoint into a 2.4s one — and the cost grew with every extra order returned.",
    solution:
      "You collected the order ids and fetched every matching item in a single query, then grouped the results into a map and attached them in memory. The request now costs two statements whether it returns 8 orders or 48.",
    code: `const orderIds = orders.map((o) => o.id);
const items = await orderItemRepository.find({
  where: { orderId: In(orderIds) },
});

const byOrderId = new Map<string, OrderItem[]>();
for (const item of items) {
  byOrderId.set(item.orderId, [...(byOrderId.get(item.orderId) ?? []), item]);
}
for (const order of orders) order.items = byOrderId.get(order.id) ?? [];`,
    note: "Two queries per request, at any page size, with the response body unchanged.",
  },

  metrics: [
    {
      id: "response-time",
      label: "Orders API Avg Response",
      before: "2.4s",
      after: "192ms",
      spark: {
        before: [2280, 2384, 2298, 2411, 2352, 2390, 2364],
        after: [2280, 640, 214, 192, 188, 196, 190],
        yMax: 2600,
      },
    },
    { id: "query-count", label: "DB Queries Per Request", before: "49", after: "2" },
    { id: "throughput", label: "Endpoint Throughput", before: "24 req/s", after: "310 req/s" },
    { id: "db-cpu", label: "Database CPU", before: "22%", after: "19%" },
  ],

  lessons: [
    "When latency grows with the number of rows returned rather than with traffic, the request is issuing work per row — count the statements before optimising any of them",
    "An N+1 pattern is invisible in per-query metrics: every statement looks healthy, and only the count and the trace's repeated spans give it away",
    "Fetching related rows in one statement and grouping them in memory trades milliseconds of CPU for seconds of network round trips",
    "Running the same N queries concurrently with an unrestricted Promise.all() is not a fix — the query count is unchanged, and the concurrency moves the cost onto the connection pool and the database under real load",
    "A healthy database underneath a slow endpoint means the service is at fault: the same rows can be had for a fraction of the statements",
  ],

  skillImprovement: {
    skillId: "request-performance",
    description:
      "You can spot per-row work inside a request handler, prove it from query counts and repeated trace spans, and replace it with a bulk fetch that keeps the response identical.",
  },
};

export const resultsConfigs: Record<string, MissionResultConfig> = {
  "user-signup-latency-spike": SIGNUP_LATENCY_RESULT,
  "event-loop-overload": EVENT_LOOP_RESULT,
  "promise-all-cascade": PROMISE_CASCADE_RESULT,
  "async-map-trap": ASYNC_MAP_RESULT,
  "overlapping-scheduler-runs": SCHEDULER_OVERLAP_RESULT,
  "unhandled-rejection-storm": REJECTION_STORM_RESULT,
  "jwt-session-expiry": JWT_REFRESH_RACE_RESULT,
  "health-check-flapping": HEALTH_CHECK_RESULT,
  "graceful-shutdown-bug": GRACEFUL_SHUTDOWN_RESULT,
  "rate-limiter-race": RATE_LIMITER_RACE_RESULT,
  "memory-leak-worker": MEMORY_LEAK_RESULT,
  "worker-queue-backlog": QUEUE_BACKLOG_RESULT,
  "connection-pool-exhaustion": CONNECTION_POOL_RESULT,
  "slow-api-incident": SLOW_API_RESULT,
};

export function getResult(missionId: string): MissionResultConfig | undefined {
  return resultsConfigs[missionId];
}

export const RESULT_MISSION_IDS = Object.keys(resultsConfigs);

/* ------------------------------ Claiming -------------------------------- */

/**
 * Per-mission claim marker. The ledger itself is idempotent, but this keeps the
 * results screen from re-running the credit path on every refresh.
 */
export type ResultsState = {
  claimed: boolean;
  /** The graded score that was credited, for a stable display across refresh. */
  score: number;
};

export function resultsStorageKey(missionId: string): string {
  return `coderaid:${missionId}:results`;
}

export function loadResultsState(missionId: string): ResultsState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(resultsStorageKey(missionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ResultsState>;
    if (parsed.claimed !== true) return null;
    return {
      claimed: true,
      score: typeof parsed.score === "number" ? parsed.score : 0,
    };
  } catch {
    return null;
  }
}

export function saveResultsState(missionId: string, state: ResultsState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      resultsStorageKey(missionId),
      JSON.stringify(state),
    );
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

/** The narrative half of the results screen, chosen by the run's verdict. */
export function narrativeFor(
  config: MissionResultConfig,
  resolved: boolean,
): ResultNarrative {
  return resolved ? config.resolved : config.unresolved;
}

