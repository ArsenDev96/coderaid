import {
  Cpu,
  Database,
  Hash,
  Layers,
  Network,
  Timer,
  Zap,
  type LucideIcon,
} from "lucide-react";

/* -------------------------------- Types --------------------------------- */

export type FixIconId =
  | "async"
  | "database"
  | "hash"
  | "server"
  | "pool"
  | "worker"
  | "timer";

/**
 * Icons are referenced by key, not by component: the config crosses the
 * server→client boundary as props, and a function can't be serialized.
 */
export const FIX_ICONS: Record<FixIconId, LucideIcon> = {
  async: Zap,
  database: Database,
  hash: Hash,
  server: Layers,
  pool: Network,
  worker: Cpu,
  timer: Timer,
};

export type FixOption = {
  id: string;
  title: string;
  description: string;
  icon: FixIconId;
  /** Why it does — or doesn't — resolve the root cause. Shown once selected. */
  explanation: string[];
  codeExample?: string;
};

export type MissionFixConfig = {
  missionId: string;
  /** One-line restatement of the diagnosis this fix stage builds on. */
  confirmedRootCause: string;
  /** The question posed above the options. */
  prompt: string;
  options: FixOption[];
  /** Nudges toward the reasoning, never names the fix. */
  hint: string;
};

export type FixState = {
  fixId: string | null;
  applied: boolean;
};

/* ------------------------------- Content -------------------------------- */

const SIGNUP_LATENCY_FIX: MissionFixConfig = {
  missionId: "user-signup-latency-spike",
  confirmedRootCause:
    "The signup request waits for welcome-email delivery before returning the HTTP response.",
  prompt: "Choose the best fix",

  options: [
    {
      id: "async-welcome-email",
      title: "Send welcome email asynchronously",
      description:
        "Move email sending to a background job/queue so the signup request can return immediately.",
      icon: "async",
      explanation: [
        "Eliminates the ~2.7s email provider latency from the critical signup path.",
        "Returns the HTTP response immediately after the user is created.",
        "Email delivery will be handled reliably in the background.",
        "Improves user experience and reduces server request time.",
      ],
      codeExample: `const user = await userRepository.create(input);

// Enqueue the welcome email instead of awaiting it
await emailQueue.add("welcome-email", {
  userId: user.id,
  email: user.email,
});

return user;`,
    },
    {
      id: "optimize-database-insert",
      title: "Optimize database insert",
      description:
        "Add indexes and optimize the user insert query to reduce database write latency.",
      icon: "database",
      explanation: [
        "The insert already completes in ~31ms — it is not what makes signup slow.",
        "Extra indexes add write overhead and would not help here.",
        "The ~2.7s spent awaiting the welcome email would still remain.",
      ],
      codeExample: `await db.query(
  "CREATE INDEX idx_users_email ON users(email)"
);
// Insert is already ~31ms; this mainly speeds up reads
await userRepository.create(input);`,
    },
    {
      id: "faster-password-hashing",
      title: "Use a faster password-hashing algorithm",
      description:
        "Switch to a lighter hashing algorithm to reduce CPU time during signup.",
      icon: "hash",
      explanation: [
        "Password hashing is only ~154ms — a small part of the request.",
        "Weakening the hash trades away security for little latency benefit.",
        "The email operation would still block the response for ~2.7s.",
      ],
      codeExample: `// Lower the bcrypt cost factor
const hash = await bcrypt.hash(password, 8);
// Saves ~100ms, but the email still blocks the request`,
    },
    {
      id: "increase-server-resources",
      title: "Increase server resources",
      description:
        "Scale up CPU and memory to handle more signup requests concurrently.",
      icon: "server",
      explanation: [
        "CPU usage is normal — the request is waiting, not computing.",
        "More hardware raises throughput but not this request's duration.",
        "Each signup would still wait ~2.7s on the email provider.",
      ],
      codeExample: `# Scale the service vertically
resources:
  cpu: "2000m"
  memory: "2Gi"
# The request still waits ~2.7s on the email provider`,
    },
    {
      id: "increase-connection-pool",
      title: "Increase database connection pool size",
      description:
        "Expand the connection pool to avoid waiting for available connections.",
      icon: "pool",
      explanation: [
        "The pool is healthy with zero lock waits — connections are not the bottleneck.",
        "A larger pool adds database load without addressing the delay.",
        "The awaited welcome email would still dominate the request.",
      ],
      codeExample: `pool: { max: 50 }
// Pool is healthy with 0 waits; connections aren't the issue`,
    },
  ],

  hint: "Choose the fix that removes the slow operation from the critical HTTP request path.",

};

const EVENT_LOOP_FIX: MissionFixConfig = {
  missionId: "event-loop-overload",
  confirmedRootCause:
    "The weekly report is aggregated synchronously on the main thread, so the event loop is blocked for seconds at a time.",
  prompt: "Choose the best fix",

  options: [
    {
      id: "move-report-generation-to-worker-thread",
      title: "Generate the report in a worker thread",
      description:
        "Hand the CPU-heavy aggregation to a worker thread and return a job response immediately.",
      icon: "worker",
      explanation: [
        "The aggregation runs on a separate thread, so the main thread keeps accepting and serving requests.",
        "The handler stays lightweight: create the job, start the worker, respond.",
        "Worker success and failure are both handled, so a crashed report can't take the request down with it.",
        "Trade-off: the report is no longer returned inline — the client polls the job or waits for a callback, and you now own a worker lifecycle.",
      ],
      codeExample: `import { Worker } from "node:worker_threads";

async getWeeklyReport(req: Request, res: Response) {
  const job = await this.reportJobs.create(req.user.id);

  const worker = new Worker(new URL("./report.worker.js", import.meta.url), {
    workerData: { jobId: job.id, since: startOfWeek() },
  });

  worker.once("message", (report) => this.reportJobs.complete(job.id, report));
  worker.once("error", (err) => this.reportJobs.fail(job.id, err));

  // The event loop is free the moment this returns.
  return res.status(202).json({ jobId: job.id, status: "processing" });
}`,
    },
    {
      id: "wrap-report-in-promise-resolve",
      title: "Wrap buildWeeklyReport() in Promise.resolve()",
      description:
        "Make the aggregation call look asynchronous so the handler can await it.",
      icon: "async",
      explanation: [
        "A promise does not move work to another thread — the function body still runs to completion on the main thread.",
        "The only thing that changes is when the work starts; the event loop is blocked for the same ~7 seconds.",
        "Trade-off: it looks like a fix in review, which makes the real cause harder to find next time.",
      ],
      codeExample: `const report = await Promise.resolve(buildWeeklyReport(events));
// buildWeeklyReport() still runs synchronously on the main thread.
// event_loop_lag_ms stays at ~6800.`,
    },
    {
      id: "increase-connection-pool",
      title: "Increase the database connection pool",
      description:
        "Raise the pool ceiling so reporting queries stop competing with normal traffic.",
      icon: "pool",
      explanation: [
        "The pool is at 6 of 20 connections with zero lock waits — it is not the constraint.",
        "The query itself takes ~128ms of a 7.4s request, so there is nothing there to win back.",
        "Trade-off: more idle connections cost the database memory for no measurable benefit.",
      ],
      codeExample: `pool: { max: 60 }
// Pool usage was 6/20 with 0 waits; connections were never the bottleneck.`,
    },
    {
      id: "increase-http-timeout",
      title: "Increase the HTTP server timeout",
      description:
        "Raise the request timeout so slow requests stop being cut off.",
      icon: "timer",
      explanation: [
        "Timeouts are the symptom: requests are queueing because the loop is busy, not because the limit is too tight.",
        "A longer timeout keeps more requests waiting in the queue, which makes the pile-up worse under load.",
        "Trade-off: the incident becomes invisible in the error rate while users wait even longer.",
      ],
      codeExample: `server.requestTimeout = 30_000;
// Requests no longer time out — they just queue for 30s instead of 5s.`,
    },
    {
      id: "add-more-node-processes",
      title: "Run more Node.js processes",
      description:
        "Scale out with PM2 or cluster so more workers can absorb the reporting load.",
      icon: "server",
      explanation: [
        "Real mitigation: with more processes, a blocked one takes a smaller share of traffic down with it.",
        "But each process still blocks completely while it builds a report, so the failure mode is unchanged — just rarer.",
        "Trade-off: several times the memory, and a burst of concurrent report requests reproduces the incident on every process at once.",
      ],
      codeExample: `# ecosystem.config.js
instances: 4,
exec_mode: "cluster",
# Each of the 4 processes still freezes for ~7s while it builds a report.`,
    },
  ],

  hint: "Only one of these stops JavaScript from occupying the main thread while the report is built.",

};

const PROMISE_CASCADE_FIX: MissionFixConfig = {
  missionId: "promise-all-cascade",
  confirmedRootCause:
    "The batch is awaited with Promise.all, so the first rejection discards 47 successful vendor results.",
  prompt: "Choose the best fix",

  options: [
    {
      id: "settle-each-vendor-and-record-outcomes",
      title: "Settle every vendor and record each outcome",
      description:
        "Await all 48 calls to completion, persist the ones that worked, and report the ones that didn't by name.",
      icon: "async",
      explanation: [
        "Promise.allSettled waits for every call and never rejects, so one bad vendor cannot end the run.",
        "Successful profiles are persisted; failures are collected with the vendor and the reason attached.",
        "The run's status becomes partial rather than binary — 47 of 48 is reported as 47 of 48.",
        "Trade-off: the run no longer fails loudly, so the per-vendor failure list has to be alerted on or a broken vendor can go unnoticed for weeks.",
      ],
      codeExample: `const settled = await Promise.allSettled(
  vendors.map((vendor) => fetchVendorProfile(vendor)),
);

const profiles = settled.flatMap((r) =>
  r.status === "fulfilled" ? [r.value] : [],
);
const failures = settled.flatMap((r, i) =>
  r.status === "rejected" ? [{ vendor: vendors[i].slug, error: r.reason }] : [],
);

await profileRepository.saveAll(profiles);
return runRepository.complete(run.id, { ok: profiles.length, failures });`,
    },
    {
      id: "catch-each-promise-returning-null",
      title: "Catch each call and return null",
      description:
        "Attach a .catch() to every vendor promise so Promise.all always fulfils.",
      icon: "hash",
      explanation: [
        "This does stop the cascade — but it throws away which vendor failed and why.",
        "The run reports success with a silently short result set, so a permanently broken vendor looks identical to a healthy one.",
        "Trade-off: you trade a loud, wrong failure for a quiet, wrong success, which is harder to notice.",
      ],
      codeExample: `const results = await Promise.all(
  vendors.map((v) => fetchVendorProfile(v).catch(() => null)),
);
// The run "succeeds" with 47 profiles and no record of the 48th.`,
    },
    {
      id: "retry-failed-vendor-with-backoff",
      title: "Retry failed vendor calls with backoff",
      description:
        "Wrap each vendor call in a retry so transient 5xx responses do not end the run.",
      icon: "database",
      explanation: [
        "Worth having: it absorbs a blip, and northwind's 503s are intermittent.",
        "But retries eventually give up, and when they do the batch dies exactly as it does today.",
        "Trade-off: retrying inside Promise.all also stretches the run's tail latency while the doomed vendor exhausts its attempts.",
      ],
      codeExample: `await Promise.all(
  vendors.map((v) => retry(() => fetchVendorProfile(v), { attempts: 3 })),
);
// After the third failure, Promise.all rejects and the run is lost again.`,
    },
    {
      id: "wrap-promise-all-in-try-catch",
      title: "Wrap the Promise.all in try/catch",
      description:
        "Catch the rejection at the batch level and log it before failing the run.",
      icon: "server",
      explanation: [
        "The caller already catches this — that is where the 'enrichment run failed' log comes from.",
        "Catching a rejection does not give you back the results of the calls that succeeded; the whole array is gone.",
        "Trade-off: none, because nothing changes. The run still persists zero rows.",
      ],
      codeExample: `try {
  const results = await Promise.all(vendors.map(fetchVendorProfile));
} catch (error) {
  logger.error("enrichment run failed", { error });
}
// \`results\` never existed — the 47 fulfilled values are unreachable.`,
    },
    {
      id: "process-vendors-sequentially",
      title: "Process vendors one at a time",
      description:
        "Replace the parallel batch with a sequential loop so a failure is isolated.",
      icon: "pool",
      explanation: [
        "A plain sequential loop still aborts on the first thrown error — the failure is isolated in time, not in effect.",
        "Everything after the failing vendor is never even attempted, which is worse than today.",
        "Trade-off: the run goes from 2 seconds to roughly 48× longer for no resilience gain.",
      ],
      codeExample: `for (const vendor of vendors) {
  results.push(await fetchVendorProfile(vendor));
}
// northwind throws on iteration 12; vendors 13-48 are never fetched.`,
    },
  ],

  hint: "The failing vendor is not going away. Pick the change that lets the run keep what it already fetched and still say what went wrong.",

};

const ASYNC_MAP_FIX: MissionFixConfig = {
  missionId: "async-map-trap",
  confirmedRootCause:
    "files.map(async …) produces an array of promises that nothing awaits, so the job reports success before any thumbnail is written.",
  prompt: "Choose the best fix",

  options: [
    {
      id: "await-the-mapped-promises",
      title: "Await the mapped promises before completing",
      description:
        "Await the array the map produces, with bounded concurrency, so the job only finishes when the work does.",
      icon: "async",
      explanation: [
        "Awaiting Promise.all over the mapped promises makes the job's duration reflect the work it actually did.",
        "A rejected thumbnail now propagates to the job, so the queue can record the failure and retry the batch.",
        "A concurrency limit keeps 500 simultaneous image operations from swamping the worker — map alone starts them all at once.",
        "Trade-off: the job is honestly slow again (~4s per batch), and one bad file will fail the batch unless you settle instead.",
      ],
      codeExample: `const limit = pLimit(8);

await Promise.all(
  files.map((file) =>
    limit(async () => {
      const thumbnail = await imageService.createThumbnail(file);
      await uploadRepository.attachThumbnail(file.id, thumbnail);
    }),
  ),
);

await batchRepository.complete(batch.id);`,
    },
    {
      id: "switch-map-to-foreach",
      title: "Use forEach instead of map",
      description:
        "Swap the map for a forEach so the unused array of promises is not created.",
      icon: "hash",
      explanation: [
        "forEach ignores whatever its callback returns, so an async callback behaves exactly like the map does today.",
        "It is strictly worse: with map you could at least await the array — forEach gives you nothing to await.",
        "Trade-off: the lint warning disappears while the bug stays, which is how this pattern survives review.",
      ],
      codeExample: `files.forEach(async (file) => {
  await imageService.createThumbnail(file);
});
// forEach discards the promise. The job still returns in 14ms.`,
    },
    {
      id: "wrap-each-call-in-try-catch",
      title: "Wrap each thumbnail call in try/catch",
      description:
        "Add error handling inside the callback so failures are logged against the file.",
      icon: "server",
      explanation: [
        "This improves the error message, which is real value — the IMG_0184 failure would name its batch.",
        "But the job still does not wait: it reports success at 14ms whether the work succeeds or fails.",
        "Trade-off: better logs make the incident look handled while 187 uploads are still silently dropped.",
      ],
      codeExample: `files.map(async (file) => {
  try {
    await imageService.createThumbnail(file);
  } catch (error) {
    logger.error("thumbnail failed", { file: file.id, error });
  }
});
// Still nothing awaits the array.`,
    },
    {
      id: "increase-worker-job-timeout",
      title: "Increase the worker job timeout",
      description:
        "Give the job longer to run so it is not cut short before finishing.",
      icon: "timer",
      explanation: [
        "Nothing is timing out. The job finishes 14ms in, far under any limit.",
        "The problem is a job that ends too early, not one that is stopped too soon.",
        "Trade-off: no effect at all, and it obscures the real symptom — a suspiciously fast job.",
      ],
      codeExample: `queue.process("process-uploads", { timeout: 600_000 }, processUploads);
// The job voluntarily returns after 14ms; the timeout is never reached.`,
    },
    {
      id: "delay-before-returning",
      title: "Wait a few seconds before returning",
      description:
        "Sleep at the end of the job to give the in-flight thumbnails time to land.",
      icon: "worker",
      explanation: [
        "This is a race, not a fix: the delay is either too short for a big batch or wasted on a small one.",
        "The promises are still unowned, so a rejection is still an unhandled rejection rather than a failed job.",
        "Trade-off: it will appear to work in staging and fail on the first large batch in production.",
      ],
      codeExample: `files.map(async (file) => { /* ... */ });
await sleep(5_000);
await batchRepository.complete(batch.id);
// 500 files take ~4s at concurrency 8 — until the day they take 6s.`,
    },
  ],

  hint: "The job needs to be told to wait for something. Ask what value the mapped callbacks hand back, and who is supposed to hold it.",

};

const SCHEDULER_OVERLAP_FIX: MissionFixConfig = {
  missionId: "overlapping-scheduler-runs",
  confirmedRootCause:
    "setInterval schedules the sync on the clock rather than on completion, so a 95-second run overlaps the next tick and re-reads the same pending invoices.",
  prompt: "Choose the best fix",

  options: [
    {
      id: "self-scheduling-loop-with-run-guard",
      title: "Schedule the next run only after the last one finishes",
      description:
        "Replace the interval with a self-scheduling timer, guarded so a run can never start while one is in progress.",
      icon: "async",
      explanation: [
        "A setTimeout scheduled in a finally block cannot fire until the previous run has settled, so runs can never overlap.",
        "The in-flight guard is the safety net for anything else that could trigger a run — a manual kick, a redeploy.",
        "Because a run always sees the pending list after the previous one finished marking, no invoice is read twice.",
        "Trade-off: the effective cadence now depends on run duration, so a slow run delays the next one and that needs its own alert.",
      ],
      codeExample: `let running = false;

async function tick() {
  if (running) return;
  running = true;
  try {
    await syncInvoices();
  } catch (error) {
    logger.error("billing sync failed", { error });
  } finally {
    running = false;
    setTimeout(tick, 60_000);
  }
}

export function startBillingSync() {
  setTimeout(tick, 60_000);
}`,
    },
    {
      id: "add-idempotency-key-to-charges",
      title: "Add an idempotency key to the charge call",
      description:
        "Send a deterministic key with each charge so the gateway rejects a repeat.",
      icon: "hash",
      explanation: [
        "This is genuinely worth doing, and it would stop customers being charged twice today.",
        "But the second run still happens: it still reads the same invoices, still calls the gateway, still writes duplicate rows and still fires duplicate internal events.",
        "Trade-off: it hides the overlap behind the gateway, so the next side effect you add without an idempotency key duplicates silently.",
      ],
      codeExample: `await paymentGateway.charge(invoice, {
  idempotencyKey: \`invoice-\${invoice.id}-\${invoice.periodEnd}\`,
});
// The gateway de-duplicates. Two runs still race over the same list.`,
    },
    {
      id: "increase-the-interval",
      title: "Increase the interval to five minutes",
      description:
        "Give each run more headroom so it finishes before the next tick.",
      icon: "timer",
      explanation: [
        "It buys room — 95 seconds fits comfortably inside 300 — so the duplicates would stop today.",
        "But the run has been getting slower for weeks. Nothing stops it crossing five minutes as invoice volume keeps growing.",
        "Trade-off: charges are now up to five minutes late, and the bug reappears without warning the next time volume steps up.",
      ],
      codeExample: `setInterval(syncInvoices, 300_000);
// Run duration went 38s → 95s in six weeks. The margin is temporary.`,
    },
    {
      id: "deduplicate-charges-afterwards",
      title: "Clean up duplicate charges afterwards",
      description:
        "Run a reconciliation job that finds double charges and refunds them.",
      icon: "database",
      explanation: [
        "The customer is still charged twice, and only made whole later — the incident is visible to them either way.",
        "Reconciliation also has to reverse everything else the second run did, such as receipts and ledger entries.",
        "Trade-off: you now maintain a second system whose only job is to undo the first one.",
      ],
      codeExample: `const dupes = await chargeRepository.findDuplicatesByInvoice();
for (const charge of dupes) await paymentGateway.refund(charge.id);
// The duplicate charge already reached the customer's statement.`,
    },
    {
      id: "move-sync-to-a-worker-thread",
      title: "Run the sync in a worker thread",
      description:
        "Move the sync off the main thread so it stops competing for the event loop.",
      icon: "worker",
      explanation: [
        "The sync is I/O bound — it waits on the payment gateway and the database, not on CPU.",
        "A worker thread would still be started again by the next tick, so it would overlap with itself exactly as it does now.",
        "Trade-off: added complexity and a second place for the same race to happen.",
      ],
      codeExample: `setInterval(() => new Worker("./sync.worker.js"), 60_000);
// Now two worker threads charge the same invoice instead of one process.`,
    },
  ],

  hint: "One of these stops the second run from existing. The others make the second run less damaging.",

};

const REJECTION_STORM_FIX: MissionFixConfig = {
  missionId: "unhandled-rejection-storm",
  confirmedRootCause:
    "The delivery listener is an async function nothing awaits, so a provider failure becomes an unhandled rejection and Node 20 terminates the process.",
  prompt: "Choose the best fix",

  options: [
    {
      id: "own-the-error-at-the-async-boundary",
      title: "Handle the error where the promise stops being awaited",
      description:
        "Give the detached delivery work an owner: catch its failure, record it against the message, and leave it retryable.",
      icon: "async",
      explanation: [
        "The listener body is wrapped so no promise leaves the boundary unhandled — the rejection becomes a handled failure with a message id attached.",
        "The message is marked failed rather than lost, so the outbox can retry it instead of stranding it.",
        "The process stays up, and a provider outage degrades delivery instead of taking the service down.",
        "Trade-off: every future fire-and-forget call site needs the same discipline, which is worth enforcing with a lint rule rather than review.",
      ],
      codeExample: `events.on("delivery", (notification: Notification) => {
  void deliver(notification).catch((error) => {
    logger.error("delivery failed", { id: notification.id, error });
    return outbox.markFailed(notification.id, error);
  });
});

async function deliver(notification: Notification) {
  const provider = providerFor(notification.channel);
  await provider.send(notification);
  await outbox.markDelivered(notification.id);
}`,
    },
    {
      id: "swallow-rejections-with-process-handler",
      title: "Add a process-level unhandledRejection handler",
      description:
        "Listen for unhandledRejection, log it, and let the process carry on.",
      icon: "server",
      explanation: [
        "It stops the crash loop, which is why it is such a common first move — and it is a reasonable last-resort safety net.",
        "But it does not handle the failure: the message is neither delivered nor marked failed, so it is stranded exactly as before, just without a restart.",
        "The process also continues from an unknown state, because whatever the rejected promise was in the middle of never completed.",
        "Trade-off: the alarm is silenced while the data loss continues, which is harder to diagnose than the crash was.",
      ],
      codeExample: `process.on("unhandledRejection", (reason) => {
  logger.error("unhandled rejection", { reason });
});
// Uptime looks fixed. The 214 stranded messages are still stranded.`,
    },
    {
      id: "set-unhandled-rejections-to-warn",
      title: "Start Node with --unhandled-rejections=warn",
      description:
        "Restore the old behaviour where an unhandled rejection only prints a warning.",
      icon: "timer",
      explanation: [
        "This deliberately reverts the Node 15 default that made unhandled rejections fatal — that default exists because silent rejections hide real bugs.",
        "Like the process handler, it keeps the service up while every failed delivery is still dropped.",
        "Trade-off: it applies to the whole process, so every future unhandled rejection anywhere in the service also becomes invisible.",
      ],
      codeExample: `node --unhandled-rejections=warn dist/main.js
# The crash stops. So does any signal that deliveries are failing.`,
    },
    {
      id: "wrap-the-route-in-try-catch",
      title: "Add try/catch to the notification route",
      description:
        "Guard the HTTP handler so an error during a request cannot escape.",
      icon: "hash",
      explanation: [
        "The route is already wrapped — that try/catch is visible in the handler today.",
        "The rejection happens after res.status(202) has been sent, in work the request no longer owns, so no amount of handling inside the route reaches it.",
        "Trade-off: none, because nothing changes; but it costs an incident's worth of time to discover that.",
      ],
      codeExample: `router.post("/api/notifications", async (req, res, next) => {
  try { /* ... */ } catch (error) { return next(error); }
});
// The listener rejects 1.7s later, long after this scope has exited.`,
    },
    {
      id: "restart-faster-with-process-manager",
      title: "Let the process manager restart it faster",
      description:
        "Tune the supervisor so the service comes back quickly after each exit.",
      icon: "pool",
      explanation: [
        "The service is already restarting in about 2.3 seconds; making that faster does not reduce the number of crashes.",
        "Every restart still strands the 214 messages the previous process was holding.",
        "Trade-off: an aggressive restart policy can mask a crash loop entirely, so the next one is only noticed through lost data.",
      ],
      codeExample: `restart_policy:
  condition: any
  delay: 0s
# 41 restarts an hour becomes 41 faster restarts an hour.`,
    },
  ],

  hint: "Keeping the process alive is not the same as handling the failure. Ask what should happen to the message whose delivery failed.",

};

const JWT_REFRESH_RACE_FIX: MissionFixConfig = {
  missionId: "jwt-session-expiry",
  confirmedRootCause:
    "Requests that expire together each call refreshSession() independently. The first rotates the refresh token; the rest present the old one, trip reuse detection, and the session is revoked.",
  prompt: "Choose the best fix",

  options: [
    {
      id: "single-flight-refresh-with-safe-token-rotation",
      title: "Refresh once and let the other callers await that one refresh",
      description:
        "Share a single in-flight refresh promise across concurrent 401s, so exactly one rotation happens and everyone else waits for its result.",
      icon: "async",
      explanation: [
        "The first 401 starts the refresh and stores its promise; every later 401 awaits the same promise instead of starting its own, so only one request ever presents the old token.",
        "Rotation and reuse detection are untouched — they were behaving correctly. The client stops giving them a false positive to detect.",
        "The promise is cleared in a finally block, so a genuinely failed refresh does not pin every future request to a stale rejection.",
        "Trade-off: the shared promise is per token store, so a multi-tab app still needs coordination between tabs (a lock or a broadcast channel) to get the same guarantee.",
      ],
      codeExample: `let inFlight: Promise<Session> | null = null;

export function refreshSession(): Promise<Session> {
  inFlight ??= doRefresh().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

// Six parallel 401s now produce one /auth/refresh call.`,
    },
    {
      id: "increase-access-token-lifetime",
      title: "Give access tokens a much longer lifetime",
      description:
        "Raise the access-token TTL from 15 minutes to 24 hours so expiry is rare.",
      icon: "timer",
      explanation: [
        "Expiries become rare, so the bug fires far less often — which is exactly why this looks like it worked for the first day.",
        "The race is untouched: whenever a token does expire, the same burst of parallel refreshes happens and the same session is revoked.",
        "Trade-off: it is a real security regression. A stolen access token stays usable for a day, and short lifetimes were the reason for having refresh tokens at all.",
      ],
      codeExample: `accessTokenTtl: "24h",  // was "15m"
// The same six-way race still runs — once a day instead of every 15 minutes.`,
    },
    {
      id: "disable-refresh-token-rotation",
      title: "Stop rotating refresh tokens",
      description:
        "Return the same refresh token every time so a second caller can never present a stale one.",
      icon: "server",
      explanation: [
        "The symptom disappears immediately: with nothing to rotate, no request can present a superseded token.",
        "It removes the mechanism instead of fixing the caller. A long-lived, non-rotating refresh token cannot be detected as stolen, because reuse is now indistinguishable from normal use.",
        "The concurrent-refresh storm also continues — the client still fires five refreshes per expiry, they just all succeed now.",
        "Trade-off: you have traded a client-side coordination bug for a permanent loss of theft detection.",
      ],
      codeExample: `// return the same refresh token unchanged
return { accessToken: signAccess(user), refreshToken: presented };
// Reuse detection can never fire again — including for a real attacker.`,
    },
    {
      id: "retry-failed-refresh-requests",
      title: "Retry a failed refresh a few times",
      description:
        "When /auth/refresh returns 401, back off and try again before giving up.",
      icon: "pool",
      explanation: [
        "By the time the retry runs, reuse detection has already revoked the whole family, so the retry presents a token belonging to a dead family and fails too.",
        "Retrying a deliberate security rejection also looks like an attack from the server's side, and can trip lockout or alerting.",
        "Trade-off: the user now waits through several failed attempts before being logged out, so the bug gets slower rather than rarer.",
      ],
      codeExample: `for (let attempt = 0; attempt < 3; attempt++) {
  const res = await post("/auth/refresh", { refreshToken: current });
  if (res.ok) return res.body;
  await sleep(200 * attempt);
}
// The family was revoked on the first reuse. All three attempts fail.`,
    },
    {
      id: "ignore-refresh-token-reuse-detection",
      title: "Accept a superseded refresh token instead of rejecting it",
      description:
        "Treat presentation of a rotated-out token as valid and hand back the current session.",
      icon: "hash",
      explanation: [
        "It does make the logouts stop, and it is tempting because the second caller really is the same legitimate browser.",
        "But the server cannot tell that. Accepting a superseded token is precisely the case reuse detection exists to catch: an attacker replaying a stolen refresh token presents exactly the same thing.",
        "The client is still firing five refreshes per expiry, so the coordination bug is still there — it has simply been made invisible by weakening the check.",
        "Trade-off: a client-side race has been paid for with a server-side security control.",
      ],
      codeExample: `if (token.rotatedAt && withinGracePeriod(token)) {
  return currentSessionFor(token.familyId); // accepts a replayed token too
}`,
    },
    {
      id: "clear-session-on-every-401",
      title: "Log the user out on any 401",
      description:
        "Drop the refresh flow entirely and send the user back to the login page.",
      icon: "database",
      explanation: [
        "It makes the behaviour consistent, which is genuinely better than being logged out at random — but consistent in the wrong direction.",
        "Every routine 15-minute expiry now ends the session, so the refresh mechanism no longer does anything.",
        "Trade-off: the incident's symptom becomes the product's design.",
      ],
      codeExample: `if (error.response?.status === 401) return logout();
// Sessions now last exactly one access-token lifetime.`,
    },
  ],

  hint: "Rotation and reuse detection are both working as designed. The thing to change is how many callers are allowed to start a refresh.",

};

const HEALTH_CHECK_FIX: MissionFixConfig = {
  missionId: "health-check-flapping",
  confirmedRootCause:
    "One endpoint answers both probes and awaits every dependency without a bounded timeout, so a slow third party makes a healthy process fail its liveness probe and get restarted.",
  prompt: "Choose the best fix",

  options: [
    {
      id: "separate-liveness-readiness-and-bounded-dependency-checks",
      title: "Split liveness from readiness and bound the dependency checks",
      description:
        "Liveness answers only whether the process is alive and not irrecoverably stuck. Readiness reports whether this instance can serve traffic right now, using short bounded dependency checks.",
      icon: "server",
      explanation: [
        "Liveness stops depending on anything outside the process, so a third-party slowdown can no longer be mistaken for a dead instance — the restarts stop.",
        "Readiness keeps the dependency checks, with per-dependency timeouts, so an instance that genuinely cannot serve is removed from traffic instead of being killed and rebuilt.",
        "Dependencies are classified: the database is required for readiness, the reporting-only analytics call is not on any request path and does not belong in either probe.",
        "Trade-off: two endpoints and an explicit dependency policy to maintain — which is the point, because it forces you to state what 'ready' actually means.",
      ],
      codeExample: `@Get("/live")   // liveness: is this process alive?
live() {
  return { status: "ok" };  // no I/O, no dependencies
}

@Get("/ready")  // readiness: can this instance serve traffic?
async ready() {
  const db = await withTimeout(this.db.query("select 1"), 500);
  return db.ok ? { status: "ok" } : this.notReady();
}`,
    },
    {
      id: "increase-liveness-timeout",
      title: "Raise the liveness probe timeout to 30 seconds",
      description:
        "Give the health endpoint far longer to answer so a slow dependency no longer trips it.",
      icon: "timer",
      explanation: [
        "It stops today's restarts, because today's dependency took five seconds — which makes it a reasonable emergency mitigation while you fix the real thing.",
        "But liveness still means 'every dependency answered', so the next dependency that takes 31 seconds restarts the fleet again, and you are back here with a bigger number.",
        "It also makes liveness worse at its actual job: a genuinely stuck process now takes 30 seconds longer to be recycled.",
        "Trade-off: a longer timeout is a longer fuse on the same bomb.",
      ],
      codeExample: `livenessProbe:
  timeoutSeconds: 30   # was 3
# Still restarts the moment a dependency is slower than 30s.`,
    },
    {
      id: "increase-restart-limit",
      title: "Raise the restart threshold",
      description:
        "Require more consecutive probe failures before the platform restarts a container.",
      icon: "pool",
      explanation: [
        "It slows the flapping down, and briefly looks like a fix while the provider recovers.",
        "The dependency was slow for twenty minutes; more consecutive failures are exactly what a twenty-minute outage produces, so the restarts arrive anyway, just later.",
        "Trade-off: it delays recovery from real failures too, since a genuinely dead process now has to fail more times before anything happens.",
      ],
      codeExample: `livenessProbe:
  failureThreshold: 10   # was 3
# A 20-minute dependency outage produces far more than 10 failures.`,
    },
    {
      id: "remove-health-checks",
      title: "Remove the health checks",
      description:
        "Drop the probes so nothing can restart or deregister an instance.",
      icon: "hash",
      explanation: [
        "The restarts stop, because nothing is watching any more.",
        "The platform also loses its only way to notice a genuinely dead or deadlocked process, and traffic keeps being routed to instances that cannot serve it.",
        "Trade-off: this converts a fast, visible failure into a slow, silent one.",
      ],
      codeExample: `# livenessProbe:  removed
# readinessProbe: removed
# Nothing restarts. Nothing is checked either.`,
    },
    {
      id: "add-more-instances",
      title: "Scale out to absorb the restarts",
      description:
        "Run more replicas so enough remain healthy while others cycle.",
      icon: "worker",
      explanation: [
        "More capacity does mask the 5xx spike, and scaling out during an incident is a legitimate stabiliser.",
        "Every new instance runs the same health handler and calls the same slow dependency, so the restart rate scales with the fleet rather than being diluted by it.",
        "Trade-off: you pay for more instances to keep the same defect running in more places.",
      ],
      codeExample: `replicas: 24   # was 8
# 24 instances now fail the same probe for the same reason.`,
    },
    {
      id: "ignore-all-dependency-failures",
      title: "Always return 200 from the health endpoint",
      description:
        "Catch every dependency error and report the instance as healthy regardless.",
      icon: "database",
      explanation: [
        "Correct for liveness — and that instinct is half the real fix — but this applies it to readiness as well.",
        "An instance that has genuinely lost its database now reports healthy, so the platform keeps sending it traffic it cannot serve.",
        "Trade-off: it fixes the false positive by making false negatives impossible to detect.",
      ],
      codeExample: `async health() {
  try { await this.checkEverything(); } catch { /* ignored */ }
  return { status: "ok" };  // even with no database
}`,
    },
  ],

  hint: "Two different questions are being answered by one endpoint: 'is this process alive?' and 'can it serve traffic right now?'. Only one of them justifies a restart.",

};

const GRACEFUL_SHUTDOWN_FIX: MissionFixConfig = {
  missionId: "graceful-shutdown-bug",
  confirmedRootCause:
    "The SIGTERM handler closes the pool and exits immediately, so in-flight requests, open transactions and unacknowledged jobs are cut mid-operation.",
  prompt: "Choose the best fix",

  options: [
    {
      id: "bounded-graceful-shutdown-with-draining",
      title: "Drain in-flight work, then exit — with a deadline",
      description:
        "Fail readiness, stop accepting new requests and new jobs, wait for what is already running, close resources, and exit on completion or on a timeout.",
      icon: "server",
      explanation: [
        "Readiness fails first, so the platform stops routing new traffic here before the server stops accepting it — that ordering is what removes the 502s.",
        "server.close() stops new connections while letting active requests finish, and the queue consumer stops prefetching so no job is acknowledged that cannot be completed.",
        "Resources close only after the work that uses them is done, which is why transactions now reach COMMIT instead of being rolled back by a disconnect.",
        "The deadline is essential: a drain without a timeout is a hang, so the process exits at the limit regardless and stays inside the platform's SIGKILL window.",
      ],
      codeExample: `process.on("SIGTERM", async () => {
  health.setReady(false);              // 1. stop receiving new traffic
  await consumers.stop();              // 2. stop taking new jobs
  await closeServer(server);           // 3. finish in-flight requests
  await Promise.race([
    activeWork.drained(),
    delay(SHUTDOWN_TIMEOUT_MS),        // 4. bounded, never unbounded
  ]);
  await db.pool.end();                 // 5. close resources last
  process.exit(0);
});`,
    },
    {
      id: "delay-before-process-exit",
      title: "Sleep for a few seconds before exiting",
      description:
        "Add a fixed delay to the signal handler so requests have some time to finish.",
      icon: "timer",
      explanation: [
        "It genuinely helps, and that is what makes it dangerous: most deploys get quieter, so the fix looks proven.",
        "Nothing is actually being waited on. The delay is a guess against an unknown amount of remaining work — a checkout that takes longer than the guess is still cut mid-transaction.",
        "The server also keeps accepting new requests throughout the sleep, so the process spends its grace period taking on more work it will then abandon.",
        "Trade-off: the error rate drops enough to stop the alerts and not enough to stop the data loss.",
      ],
      codeExample: `process.on("SIGTERM", async () => {
  await delay(5000);   // waits on nothing in particular
  await db.pool.end();
  process.exit(0);
});
// Still accepting new requests for those 5 seconds.`,
    },
    {
      id: "increase-client-retry-count",
      title: "Have callers retry the failed requests",
      description: "Push retry configuration to clients so 502s are retried.",
      icon: "pool",
      explanation: [
        "Retries are a reasonable complement to a correct shutdown, but they cannot substitute for one.",
        "The interrupted checkout already authorised a payment before it was cut. Retrying a non-idempotent operation risks charging twice rather than recovering cleanly.",
        "It also only reaches HTTP callers; the acknowledged-but-unfinished queue jobs are untouched.",
        "Trade-off: you distribute the problem to every caller instead of solving it once in the service that causes it.",
      ],
      codeExample: `httpClient.retries = 5;
// The first attempt already authorised the payment.`,
    },
    {
      id: "add-more-replicas-during-deploy",
      title: "Add replicas during the rollout",
      description:
        "Run extra instances so there is more capacity while old ones are replaced.",
      icon: "worker",
      explanation: [
        "The overall error percentage falls, because the same number of dropped requests is measured against more traffic.",
        "Every replaced instance still drops whatever it was holding, so the absolute number of broken checkouts is unchanged.",
        "Trade-off: the dashboard improves while the customer experience does not.",
      ],
      codeExample: `maxSurge: 200%
# Same 23 abandoned requests per instance, spread over more instances.`,
    },
    {
      id: "ignore-sigterm",
      title: "Ignore SIGTERM",
      description:
        "Register a no-op handler so the process is not asked to stop early.",
      icon: "hash",
      explanation: [
        "Nothing changes for the better: the platform sends SIGKILL after its grace period, and SIGKILL cannot be handled at all.",
        "The same requests are dropped, but now with no log line and no opportunity to do anything about it.",
        "Trade-off: it converts a controllable shutdown into an uncontrollable one.",
      ],
      codeExample: `process.on("SIGTERM", () => {});
// SIGKILL arrives 30s later and drops everything anyway.`,
    },
    {
      id: "close-database-first-then-wait",
      title: "Close the database first, then wait for requests",
      description:
        "Keep the current ordering but add a wait after the pool is closed.",
      icon: "database",
      explanation: [
        "This is the current bug with an extra step, and it is worth understanding why the order matters so much.",
        "The in-flight requests you are now waiting for need the pool you just closed, so they fail immediately instead of completing — the wait accomplishes nothing.",
        "Trade-off: it turns a rollback into a wave of connection errors, which is harder to read in the logs.",
      ],
      codeExample: `await db.pool.end();        // the 23 active requests need this
await activeWork.drained(); // they now fail instantly
process.exit(0);`,
    },
  ],

  hint: "Order matters more than duration. Ask what has to stop first so that what is already running can finish.",

};

const RATE_LIMITER_RACE_FIX: MissionFixConfig = {
  missionId: "rate-limiter-race",
  confirmedRootCause:
    "The limiter reads the counter, increments it in application code and writes it back. Concurrent requests on different instances read the same value, so most increments are overwritten.",
  prompt: "Choose the best fix",

  options: [
    {
      id: "atomic-shared-rate-limit-operation",
      title: "Let the shared store do the increment atomically",
      description:
        "Replace read-modify-write with a single atomic increment-and-expire in the store, so concurrent requests serialise on the counter itself.",
      icon: "async",
      explanation: [
        "The increment happens once, inside the store, and every caller gets back its own distinct count — there is no window between reading and writing for another instance to slip into.",
        "The expiry is set in the same atomic step, so a key can never be left without a TTL by a race between the increment and the expire.",
        "Because the store is the single point of serialisation, correctness no longer depends on how many API instances are running.",
        "Trade-off: the limit is now enforced by one shared component, so its availability and latency are on the request path — which is the cost of a distributed limit being actually distributed.",
      ],
      codeExample: `// One round trip, one atomic operation, one authoritative answer.
const count = await store.incrementAndExpire(key, 60);
if (count > LIMIT) return res.status(429).end();
return next();

// A sliding-window or token-bucket script works the same way:
// the whole read-decide-write sequence runs atomically in the store.`,
    },
    {
      id: "in-memory-mutex-around-the-counter",
      title: "Guard the counter with an in-process mutex",
      description:
        "Serialise the read-modify-write inside Node so two requests cannot interleave.",
      icon: "worker",
      explanation: [
        "It removes interleaving within one process, and on a single instance the counter becomes exactly correct — which is why this passes a local load test convincingly.",
        "The race is between instances, not within one. Eight processes each hold their own mutex and know nothing about the other seven, so the same value is still read eight times.",
        "The evidence already shows this: the overshoot is 0% on one instance and grows with every replica added.",
        "Trade-off: a lock that cannot see the other participants provides confidence without providing correctness.",
      ],
      codeExample: `await mutex.runExclusive(async () => {
  const current = Number(await store.get(key)) || 0;
  await store.set(key, current + 1, { ttl: 60 });
});
// Instance i-04 is inside its own mutex, reading the same 97.`,
    },
    {
      id: "increase-the-rate-limit",
      title: "Raise the configured limit to match reality",
      description:
        "Set the limit to what clients are actually achieving so the numbers agree.",
      icon: "timer",
      explanation: [
        "The alert stops firing, because the threshold has been moved to wherever the bug happens to land.",
        "The counter is still wrong, and it is wrong by an amount that changes with the replica count — so the effective limit moves every time the service scales.",
        "Trade-off: the limiter now enforces an unknown number rather than a chosen one.",
      ],
      codeExample: `LIMIT = 150;  // was 100
// At 16 instances the overshoot grows again and 150 stops meaning anything.`,
    },
    {
      id: "retry-failed-counter-writes",
      title: "Retry the counter write",
      description:
        "Detect a failed write to the shared store and try it again.",
      icon: "pool",
      explanation: [
        "This targets a failure mode the evidence rules out: the store reports zero errors and a 2ms p99, so no write is failing.",
        "The writes all succeed. The problem is that they succeed at overwriting each other, which a retry cannot detect — every instance believes its write was correct.",
        "Trade-off: it adds latency and load to the store while leaving the lost increments exactly as they are.",
      ],
      codeExample: `await retry(() => store.set(key, current + 1, { ttl: 60 }));
// Nothing failed. Three successful writes still produce one increment.`,
    },
    {
      id: "read-the-counter-twice",
      title: "Read the counter again before writing",
      description:
        "Re-read the value just before the write to confirm it has not changed.",
      icon: "hash",
      explanation: [
        "It narrows the window, which makes the overshoot smaller and the bug much harder to reproduce.",
        "The window is not closed. Two instances can still pass the second read and write in the same interval, because there is no atomicity between the check and the write.",
        "A check-then-act only becomes safe with a compare-and-set that the store enforces — a plain re-read is still just another read.",
        "Trade-off: an intermittent, load-dependent bug is worse to diagnose than a consistent one.",
      ],
      codeExample: `const first = Number(await store.get(key)) || 0;
const second = Number(await store.get(key)) || 0;
if (first === second) await store.set(key, second + 1, { ttl: 60 });
// Two instances can agree on 'unchanged' at the same moment.`,
    },
    {
      id: "add-more-api-instances",
      title: "Scale out to spread the load",
      description:
        "Add API instances so no single instance handles enough traffic to race.",
      icon: "server",
      explanation: [
        "This moves in exactly the wrong direction, and the metrics say so: overshoot goes 0% → 19% → 47% as instances go 1 → 3 → 8.",
        "More instances means more concurrent readers of the same value, so more increments are lost, not fewer.",
        "Trade-off: the one change guaranteed to make this incident worse.",
      ],
      codeExample: `replicas: 16   # was 8
# Overshoot has grown with every replica so far.`,
    },
  ],

  hint: "The counter is correct whenever only one thing touches it at a time. Ask which component is in a position to guarantee that for every instance at once.",

};

/* ------------------------------- Registry ------------------------------- */

/**
 * Fix content is hand-authored per mission — the options and their reasoning
 * only make sense against that mission's confirmed root cause. The route looks a
 * mission up by slug; missions without an entry fall back to the reserved-route
 * state, exactly like the earlier stages.
 */
const MEMORY_LEAK_FIX: MissionFixConfig = {
  missionId: "memory-leak-worker",
  confirmedRootCause:
    "A progress listener is registered for every job and never removed. Each handler closes over the whole job — including its source image buffer — so every completed job stays reachable and cannot be collected.",
  prompt: "Choose the best fix",

  options: [
    {
      id: "cleanup-listeners-and-bound-retained-state",
      title: "Clean up listeners and bound what is retained",
      description:
        "Remove the per-job listener in a finally block, keep only small metadata about recent jobs, and cap any diagnostic history.",
      icon: "worker",
      explanation: [
        "The listener is removed on every exit path, so the closure — and the job payload it captures — becomes unreachable as soon as the job ends.",
        "Recent-job history keeps ids and timings instead of buffers, and is bounded, so it cannot grow without limit.",
        "Heap returns to its baseline between batches because nothing outlives the work any more.",
        "Exporting the listener count and heap size turns the same failure into an alert rather than a restart.",
      ],
      codeExample: `const recentJobs = new BoundedList<JobSummary>(200);

async function processJob(job: ImageJob) {
  const onProgress = (value: number) =>
    logger.debug({ jobId: job.id, value });

  worker.on("progress", onProgress);
  try {
    const result = await worker.run(job);
    await storage.put(result.key, result.buffer);
    // metadata only — no buffers, no job reference
    recentJobs.push({ id: job.id, bytes: job.sourceBuffer.byteLength });
    return result;
  } finally {
    worker.off("progress", onProgress);
  }
}

metrics.gauge("worker.listeners", () => worker.listenerCount("progress"));`,
    },
    {
      id: "increase-max-old-space-size",
      title: "Increase --max-old-space-size",
      description:
        "Give the worker a larger heap so it can absorb the growth without hitting the memory threshold.",
      icon: "server",
      explanation: [
        "The heap grows by roughly 1.2GB every four hours and never levels off; a bigger ceiling only changes how long it takes to reach.",
        "Larger heaps make major collections longer, so the pauses the workers already suffer get worse.",
        "Nothing about the retained listeners or buffers changes — the same objects stay reachable.",
      ],
      codeExample: `# still leaks, just more slowly
node --max-old-space-size=4096 dist/workers/image-job.worker.js`,
    },
    {
      id: "restart-workers-on-a-schedule",
      title: "Restart workers on a schedule",
      description:
        "Recycle each worker every hour so the process never lives long enough to accumulate dangerous amounts of memory.",
      icon: "timer",
      explanation: [
        "This hides the leak behind a scheduled outage instead of removing it: the memory is still retained, it is just discarded with the process.",
        "Restarts interrupt in-flight image jobs and add cold-start latency to every cycle.",
        "The leak keeps growing with throughput, so the safe restart interval shrinks as traffic rises.",
      ],
      codeExample: `// operational workaround, not a fix
setInterval(() => pool.recycleWorker(), 60 * 60 * 1000);`,
    },
    {
      id: "force-gc-after-every-job",
      title: "Force global.gc() after every job",
      description:
        "Expose the garbage collector and run a collection at the end of each job to reclaim what the job allocated.",
      icon: "async",
      explanation: [
        "Garbage collection only reclaims unreachable objects. The listeners still hold their jobs, so those objects are reachable and a forced collection cannot free them.",
        "The evidence already shows collections running four times more often and reclaiming a tenth as much — the collector is not the thing that is failing.",
        "Forcing a synchronous full collection after every job adds a long stop-the-world pause to each one.",
      ],
      codeExample: `// runs, pauses the worker, frees nothing that matters
await worker.run(job);
global.gc?.();`,
    },
    {
      id: "reduce-worker-concurrency",
      title: "Reduce worker concurrency",
      description:
        "Drop concurrency from 4 to 1 so fewer image buffers are ever in memory at the same time.",
      icon: "pool",
      explanation: [
        "Only 8.4MB of the 1.41GB snapshot belongs to jobs that are actually running — concurrent work is not what is filling the heap.",
        "The retained listeners accumulate per completed job, so lowering concurrency slows the growth without stopping it.",
        "Throughput falls by three quarters in exchange for a leak that still ends in a restart.",
      ],
      codeExample: `// fewer jobs at once, same retention per completed job
const pool = new WorkerPool({ concurrency: 1 });`,
    },
    {
      id: "add-more-worker-processes",
      title: "Add more worker processes",
      description:
        "Spread the same job volume across more workers so each one grows more slowly before it is recycled.",
      icon: "server",
      explanation: [
        "Retention is per completed job, so the total leaked memory across the fleet is unchanged — it is only divided differently.",
        "Every added worker leaks at its own rate and eventually hits the same threshold and the same restart.",
        "Infrastructure cost rises to buy time against a defect that a listener removal would eliminate.",
      ],
      codeExample: `// same leak, more processes leaking it
const pool = new WorkerPool({ size: 12 });`,
    },
  ],

  hint: "The heap holds 1.19GB in closures that belong to jobs which finished hours ago. Ask what has to happen when a job ends for those closures to become unreachable.",

};

const QUEUE_BACKLOG_FIX: MissionFixConfig = {
  missionId: "worker-queue-backlog",
  confirmedRootCause:
    "Every failure is re-enqueued immediately with no attempt cap, no backoff and no dead-letter path, so a permanently invalid job and a rate-limited provider together consume nearly all worker capacity.",
  prompt: "Choose the best fix",

  options: [
    {
      id: "bounded-retries-dead-letter-and-backpressure",
      title: "Bound retries, dead-letter failures and apply backpressure",
      description:
        "Cap attempts with exponential backoff and jitter, dead-letter jobs that can never succeed, and rate-limit the service to what the provider will actually accept.",
      icon: "timer",
      explanation: [
        "Classifying failures separates a malformed payload, which will never succeed, from a 429, which will succeed later — and each gets the treatment it deserves.",
        "A capped attempt count with exponential backoff and jitter stops one poison job from re-entering a worker slot dozens of times a second.",
        "Dead-lettering permanent failures makes them visible and gets them out of the working set instead of hiding them in the retry churn.",
        "A provider-aware limiter and admission control mean the workers only offer as much load as the provider accepts, so retries stop generating the throttling that causes more retries.",
      ],
      codeExample: `const MAX_ATTEMPTS = 5;

export async function processNotification(job: Job<Notification>) {
  try {
    await limiter.schedule(() =>
      provider.send(job.data.recipient, job.data.template),
    );
  } catch (error) {
    if (isPermanent(error) || job.attemptsMade >= MAX_ATTEMPTS) {
      await deadLetter.add(job.name, job.data, { reason: String(error) });
      return;
    }
    const backoff = Math.min(2 ** job.attemptsMade * 1000, 60_000);
    await queue.add(job.name, job.data, {
      delay: backoff + Math.random() * 1000, // jitter
    });
  }
}`,
    },
    {
      id: "double-the-worker-count",
      title: "Double the number of workers",
      description:
        "Scale the worker pool from 24 to 48 so the queue is drained faster.",
      icon: "server",
      explanation: [
        "Going 8 → 24 workers already took successful deliveries from 240/min to 90/min; the relationship is inverse, and doubling again continues it.",
        "More workers mean more concurrent calls to a provider that is already rejecting 61% of them, so the throttling deepens.",
        "The poison job simply occupies more slots, because nothing has changed about how often it is allowed to come back.",
      ],
      codeExample: `// more capacity pointed at the same throttled provider
worker.concurrency = 48;`,
    },
    {
      id: "retry-immediately-forever",
      title: "Keep retrying until it succeeds",
      description:
        "Treat every failure as transient and retry in a tight loop so no notification is ever lost.",
      icon: "async",
      explanation: [
        "This is what the code does today, and it is precisely what produced attempt 4,812 on a job whose payload can never be valid.",
        "A tight retry loop against a rate-limited provider is indistinguishable from a self-inflicted load test.",
        "Durability comes from dead-lettering and replay, not from retrying something that cannot succeed.",
      ],
      codeExample: `// the current behaviour, made explicit
while (true) {
  try { return await provider.send(job.data); } catch { /* again */ }
}`,
    },
    {
      id: "increase-provider-timeout",
      title: "Increase the provider timeout",
      description:
        "Raise the HTTP timeout on delivery calls so throttled requests have longer to complete.",
      icon: "timer",
      explanation: [
        "A 429 is an immediate, deliberate rejection — it is not a slow response waiting for more time.",
        "Holding a worker slot open longer for a call that has already been refused reduces throughput further.",
        "The validation failure on the poison job is not a timeout at all, so nothing about it changes.",
      ],
      codeExample: `// waits longer for an answer that already arrived
provider.setTimeout(120_000);`,
    },
    {
      id: "remove-retries-completely",
      title: "Remove retries completely",
      description:
        "Drop any job that fails on its first attempt so no job can ever cycle through a worker twice.",
      icon: "database",
      explanation: [
        "It does clear the backlog, by discarding every notification that hit a transient 429 — which is 61% of them.",
        "Rate limiting is temporary by definition; a job refused now would have succeeded seconds later.",
        "The problem is unbounded retrying, not retrying; the fix is a bound, not a removal.",
      ],
      codeExample: `catch (error) {
  logger.error(error);
  return; // notification silently lost
}`,
    },
    {
      id: "purge-the-queue",
      title: "Purge the queue",
      description:
        "Drain the 184,000 backlogged messages so the workers can start again from a clean state.",
      icon: "pool",
      explanation: [
        "The depth is a symptom. With the retry behaviour unchanged, the same poison job and the same 429s rebuild the backlog within the hour.",
        "Purging destroys legitimate notifications that were only waiting behind the churn.",
        "It also erases the evidence that would let anyone confirm the fix worked.",
      ],
      codeExample: `// symptom removed, cause intact
await queue.drain();`,
    },
  ],

  hint: "Two different failures are sharing one code path: one job that can never succeed, and many that would succeed if they were tried later. Ask what each of them should cost the pool.",

};

const CONNECTION_POOL_FIX: MissionFixConfig = {
  missionId: "connection-pool-exhaustion",
  confirmedRootCause:
    "The order-detail handler acquires a pooled connection and then throws NotFoundError before reaching release(). Each missing order permanently costs the pool one connection, until all twenty are checked out and every request queues.",
  prompt: "Choose the best fix",

  options: [
    {
      id: "release-connections-in-finally-and-bound-pool-waits",
      title: "Release in finally and bound the wait",
      description:
        "Wrap connection use in scoped acquisition so every exit path releases, shorten how long a connection is held, and put a bound on acquisition.",
      icon: "pool",
      explanation: [
        "A finally block — or a withConnection helper that owns the lifecycle — releases on the error path as reliably as on the success path, so a missing order costs nothing.",
        "Acquiring the connection only around the queries that need it keeps the unrelated billing API call off the pool entirely.",
        "A short acquisition timeout turns pool starvation into a fast, visible failure instead of a ten-second hang.",
        "Instrumenting checkouts against releases means the next leak shows up as a metric rather than an outage.",
      ],
      codeExample: `async function withConnection<T>(fn: (c: Connection) => Promise<T>) {
  const connection = await pool.getConnection({ acquireTimeoutMs: 2000 });
  try {
    return await fn(connection);
  } finally {
    connection.release(); // runs on every path, including throws
  }
}

router.get("/orders/:id", async (req, res) => {
  const { order, items } = await withConnection(async (connection) => {
    const order = await orderRepository.findById(req.params.id, connection);
    if (!order) throw new NotFoundError(\`order \${req.params.id} not found\`);
    return { order, items: await connection.query(ITEMS_SQL, [order.id]) };
  });

  // external call happens after the connection is back in the pool
  const invoice = await billingApi.fetchInvoice(order.id);
  res.json({ ...order, items, invoice });
});`,
    },
    {
      id: "increase-pool-size",
      title: "Increase the pool size",
      description:
        "Raise the maximum from 20 to 100 connections so there is enough headroom for the traffic.",
      icon: "server",
      explanation: [
        "Leaked connections are never returned, so a larger pool is a larger number to leak through — it postpones exhaustion, it does not prevent it.",
        "The pool is losing roughly one connection per missing-order lookup, at 2.1% of requests; the arithmetic is unchanged by the ceiling.",
        "A hundred idle-in-session connections put real memory pressure on the database for no work in return.",
      ],
      codeExample: `// exhausts later, for the same reason
const pool = createPool({ max: 100 });`,
    },
    {
      id: "increase-request-timeout",
      title: "Increase the request timeout",
      description:
        "Give requests longer than 10 seconds to acquire a connection so fewer of them time out.",
      icon: "timer",
      explanation: [
        "The connections are gone, not late — waiting longer for one that will never be released only extends the hang.",
        "Longer waits hold client sockets and request memory open, so the failure spreads upward instead of being contained.",
        "The timeout is the only thing currently telling anyone that the pool is starved.",
      ],
      codeExample: `// waits longer for a connection that is never coming back
const pool = createPool({ acquireTimeoutMillis: 60_000 });`,
    },
    {
      id: "add-more-api-instances",
      title: "Add more API instances",
      description:
        "Scale the API horizontally so the load — and the pool pressure — is spread across more processes.",
      icon: "server",
      explanation: [
        "Each instance has its own pool and its own copy of the defect, so each one leaks and starves independently.",
        "More instances mean more total connections held idle-in-session against the same database.",
        "Latency is dominated by acquisition inside a process; adding processes does not change what happens inside one.",
      ],
      codeExample: `// N instances, N leaking pools
replicas: 12`,
    },
    {
      id: "retry-connection-acquisition",
      title: "Retry connection acquisition",
      description:
        "Catch acquisition timeouts and retry in a loop so requests eventually get a connection.",
      icon: "async",
      explanation: [
        "There are no free connections to retry into — all twenty are checked out by handlers that already returned.",
        "Retrying adds more waiters to a queue that is already 34 deep, so it lengthens every wait.",
        "It converts a clear timeout error into an indefinite hang, which is strictly harder to diagnose.",
      ],
      codeExample: `// competes for connections that no longer exist
while (true) {
  try { return await pool.getConnection(); } catch { /* try again */ }
}`,
    },
    {
      id: "optimize-the-item-query",
      title: "Optimize the order-items query",
      description:
        "Add an index and rewrite the item lookup so connections are held for less time.",
      icon: "database",
      explanation: [
        "The query already runs in 12ms and never reaches the slow-query log; there is no meaningful time left to remove.",
        "Leaked connections are held forever, so shortening a 12ms query by a few milliseconds changes nothing about them.",
        "Database throughput actually fell during the incident — the database is being asked to do less, not more.",
      ],
      codeExample: `-- optimising the 12ms half of a 4,900ms request
CREATE INDEX CONCURRENTLY idx_order_items_order_id ON order_items(order_id);`,
    },
  ],

  hint: "Compare the number of checkout events with the number of release events on the same connection id, and ask which lines run between them when something goes wrong.",

};

const SLOW_API_FIX: MissionFixConfig = {
  missionId: "slow-api-incident",
  confirmedRootCause:
    "The orders handler fetches the order list, then issues one additional order_items query per order. Each query is fast, but a request returning 48 orders executes 49 of them, so latency grows with the size of the result set.",
  prompt: "Choose the best fix",

  options: [
    {
      id: "bulk-fetch-related-data",
      title: "Fetch the related items in bulk",
      description:
        "Load all order items for the returned orders in a single query — or through the ORM's relation loading — and attach them in memory.",
      icon: "database",
      explanation: [
        "One additional query replaces 48, so the request costs two round trips regardless of how many orders it returns.",
        "Latency stops scaling with page size: the response time for 48 orders becomes close to the response time for 8.",
        "Grouping the items in memory is a few milliseconds of work against the ~2 seconds of round trips it removes.",
        "Database load falls as well, because the same rows are fetched with a fraction of the statements and parsing.",
      ],
      codeExample: `const orders = await orderRepository.find({ where: { userId } });
const orderIds = orders.map((o) => o.id);

// one query for every order's items
const items = await orderItemRepository.find({
  where: { orderId: In(orderIds) },
});

const byOrderId = new Map<string, OrderItem[]>();
for (const item of items) {
  const list = byOrderId.get(item.orderId) ?? [];
  list.push(item);
  byOrderId.set(item.orderId, list);
}

for (const order of orders) {
  order.items = byOrderId.get(order.id) ?? [];
}

return orders;`,
    },
    {
      id: "add-an-index-only",
      title: "Add an index on order_items.order_id",
      description:
        "Index the foreign key so each per-order lookup runs faster than its current 42ms.",
      icon: "hash",
      explanation: [
        "The count is the problem, not the cost of each one: even a 5ms query executed 48 times still adds nearly a quarter of a second of round trips.",
        "Nothing reaches the slow-query log today, so there is little per-query time available to reclaim.",
        "Latency would still grow with the number of orders returned, which is the behaviour the incident is about.",
      ],
      codeExample: `-- makes 48 queries slightly faster; there are still 48
CREATE INDEX CONCURRENTLY idx_order_items_order_id ON order_items(order_id);`,
    },
    {
      id: "increase-pool-size",
      title: "Increase the connection pool size",
      description:
        "Give the service more database connections so the extra queries have somewhere to run.",
      icon: "pool",
      explanation: [
        "Pool wait is 3ms and the database sits at 22% CPU — the service is not waiting for a connection.",
        "A bigger pool lets the same request issue its 49 queries with less queuing, which is not where the 2.4 seconds went.",
        "The query count per request is untouched, so the scaling behaviour is untouched.",
      ],
      codeExample: `// there is no pool contention to relieve
const pool = createPool({ max: 60 });`,
    },
    {
      id: "parallelize-with-promise-all",
      title: "Run every per-order query with Promise.all()",
      description:
        "Issue all 48 item queries at once instead of sequentially so the wall-clock time collapses.",
      icon: "async",
      explanation: [
        "The request still issues 49 queries — the N+1 pattern is intact, it has only been made concurrent.",
        "Forty-eight simultaneous queries per request against a pool of twenty means requests now contend for connections, and a larger page size makes it worse.",
        "Database load rises sharply under concurrent traffic: the same pattern that looks fast on one request saturates the pool at scale.",
        "It also trades a predictable slow endpoint for an unpredictable one that fails under load rather than in a profiler.",
      ],
      codeExample: `// 48 concurrent queries per request — faster in a benchmark,
// pool pressure and database load in production
await Promise.all(
  orders.map(async (order) => {
    order.items = await orderItemRepository.find({
      where: { orderId: order.id },
    });
  }),
);`,
    },
    {
      id: "cache-the-endpoint",
      title: "Cache the whole endpoint response",
      description:
        "Put a short-lived cache in front of GET /api/orders so repeated requests skip the work entirely.",
      icon: "server",
      explanation: [
        "Order lists are per user and change on every checkout, so the hit rate is low and stale data is visible immediately.",
        "Every miss pays the full 49-query cost, and the first request after any write always misses.",
        "The endpoint is still quadratically expensive underneath — the cache only decides how often that is paid.",
      ],
      codeExample: `// hides a slow query pattern behind a low hit rate
const cached = await cache.get(\`orders:\${userId}\`);
if (cached) return cached;`,
    },
    {
      id: "increase-request-timeout",
      title: "Increase the request timeout",
      description:
        "Raise the gateway timeout so the slow responses stop being cut off during checkout.",
      icon: "timer",
      explanation: [
        "Requests already succeed — the error rate is 0.4% and unchanged. They are slow, not failing.",
        "A longer timeout makes the symptom less visible to monitoring while the user still waits 2.4 seconds.",
        "Latency continues to grow with order count, so the new timeout eventually needs raising again.",
      ],
      codeExample: `// the user still waits; the alert stops firing
server.requestTimeout = 30_000;`,
    },
  ],

  hint: "Each query is already fast. Ask how many of them one request should need, and where the related rows could be collected in a single statement.",

};

export const fixConfigs: Record<string, MissionFixConfig> = {
  "user-signup-latency-spike": SIGNUP_LATENCY_FIX,
  "event-loop-overload": EVENT_LOOP_FIX,
  "promise-all-cascade": PROMISE_CASCADE_FIX,
  "async-map-trap": ASYNC_MAP_FIX,
  "overlapping-scheduler-runs": SCHEDULER_OVERLAP_FIX,
  "unhandled-rejection-storm": REJECTION_STORM_FIX,
  "jwt-session-expiry": JWT_REFRESH_RACE_FIX,
  "health-check-flapping": HEALTH_CHECK_FIX,
  "graceful-shutdown-bug": GRACEFUL_SHUTDOWN_FIX,
  "rate-limiter-race": RATE_LIMITER_RACE_FIX,
  "memory-leak-worker": MEMORY_LEAK_FIX,
  "worker-queue-backlog": QUEUE_BACKLOG_FIX,
  "connection-pool-exhaustion": CONNECTION_POOL_FIX,
  "slow-api-incident": SLOW_API_FIX,
};

export function getFix(missionId: string): MissionFixConfig | undefined {
  return fixConfigs[missionId];
}

export const FIXABLE_MISSION_IDS = Object.keys(fixConfigs);

/* ------------------------- Persistence (localStorage) ------------------- */

export function fixStorageKey(missionId: string): string {
  return `coderaid:${missionId}:fix`;
}

/**
 * Restores a mission's fix selection. The id is validated against the mission's
 * own options, so an id left over from edited content can never resurrect.
 */
export function loadFixState(config: MissionFixConfig): FixState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(fixStorageKey(config.missionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FixState>;

    const fixId = config.options.some((o) => o.id === parsed.fixId)
      ? (parsed.fixId as string)
      : null;

    return {
      fixId,
      // "Applied" can't outlive the selection that earned it.
      applied: parsed.applied === true && Boolean(fixId),
    };
  } catch {
    return null;
  }
}

export function saveFixState(missionId: string, state: FixState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(fixStorageKey(missionId), JSON.stringify(state));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}
