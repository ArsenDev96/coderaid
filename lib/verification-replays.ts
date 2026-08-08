/**
 * Runnable replays for the rest of Chapter 1 (§12 item 1, §17).
 *
 * `lib/verification-runtime.ts` made `event-loop-overload` real. These three are
 * the only other missions §17 admits can be reproduced honestly: they are pure
 * JavaScript-runtime behaviours — promise settlement, awaiting, and re-entrant
 * scheduling — and a browser exhibits all three natively. Nothing here is a
 * metaphor for a distributed system. A connection pool exhausting or a container
 * being restarted by a liveness probe still cannot be replayed in one tab, and
 * still is not.
 *
 * **How this differs from the event-loop replay, and why.** That one takes a
 * boolean — did the fix move the work off the thread — because all four of its
 * distractors genuinely leave it there, so broken-or-fixed is a faithful model.
 * It is not faithful here. `promise-all-cascade`'s
 * `catch-each-promise-returning-null` distractor *does* stop the cascade; the
 * mission's own text says so, and calls it wrong for a different reason (it
 * discards which vendor failed). Replaying it as a total loss would contradict
 * the mission. So each fix names a **strategy**, and the strategy is what runs.
 *
 * **Why this is still not an answer oracle.** No strategy here is labelled
 * correct. There is no expected value and no branch on "was this right" — each
 * one runs and reports what happened, and whether that resolves the incident is
 * still the server's verdict from grading. The `fixId → strategy` map is
 * answer-shaped, so it lives in `lib/server/replay.ts` behind `server-only`,
 * exactly where the `event-loop-overload` mapping already lives. The browser is
 * handed a strategy name it cannot rank.
 *
 * What makes that safe rather than merely tidy: the strategy names are not
 * ordered, and several non-answers produce partially good numbers. `catch-null`
 * retains every profile it could. `idempotency` prevents every duplicate.
 * Knowing your fix ran as `catch-null` tells you nothing you could not already
 * see in the outcome the verification stage shows you anyway.
 */

/* -------------------------------- Shared --------------------------------- */

/** A measured replay. `metrics` are counts, never verdicts. */
export type ReplayResult = {
  missionId: string;
  strategy: string;
  metrics: Record<string, number>;
  /**
   * Whether the incident happened again under this strategy — computed from the
   * metrics above, not from knowing which fix was chosen. Each scenario defines
   * it as the negation of what its authored root cause claims to be about.
   */
  incidentRecurred: boolean;
};

/** Resolves after `ms`, and genuinely yields — these are real timers. */
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/* -------------------------- promise-all-cascade --------------------------- */

/**
 * 48 vendors, one of which fails — the mission's `northwind`, permanently 503.
 *
 * Root cause: `Promise.all` rejects on the first rejection, so the 47 profiles
 * that did arrive are discarded with it. The measurement is therefore two
 * numbers, not one: how many profiles survived, and how many failures were
 * reported *by name*. A fix that saves the profiles but loses the failure is a
 * quiet wrong success, which the mission calls out explicitly — and which only
 * the second number can see.
 */
export const VENDOR_COUNT = 48;
const FAILING_VENDOR = 31;

type VendorProfile = { vendor: number; records: number };

/** One vendor call. Real async work; vendor 31 rejects however often it is asked. */
async function fetchVendorProfile(vendor: number): Promise<VendorProfile> {
  await sleep(1);
  if (vendor === FAILING_VENDOR) {
    throw new Error(`vendor ${vendor} responded 503`);
  }
  return { vendor, records: (vendor * 7) % 23 };
}

export type CascadeStrategy =
  | "all"
  | "settle"
  | "catch-null"
  | "sequential"
  | "retry"
  | "try-catch";

async function runCascade(strategy: CascadeStrategy): Promise<ReplayResult> {
  const vendors = Array.from({ length: VENDOR_COUNT }, (_, i) => i);
  let retained = 0;
  let namedFailures = 0;

  switch (strategy) {
    case "settle": {
      const settled = await Promise.allSettled(vendors.map(fetchVendorProfile));
      retained = settled.filter((r) => r.status === "fulfilled").length;
      // The vendor and the reason both survive, which is what makes it a report.
      namedFailures = settled.filter((r) => r.status === "rejected").length;
      break;
    }
    case "catch-null": {
      // Stops the cascade — and throws away which vendor failed and why.
      const results = await Promise.all(
        vendors.map((v) => fetchVendorProfile(v).catch(() => null)),
      );
      retained = results.filter((r) => r !== null).length;
      namedFailures = 0;
      break;
    }
    case "sequential": {
      // Awaiting one at a time does not stop the throw; it only changes how far
      // the run gets before it dies. Everything after the bad vendor is lost.
      try {
        for (const vendor of vendors) {
          await fetchVendorProfile(vendor);
          retained += 1;
        }
      } catch {
        // The run ends here, exactly as it does in production.
      }
      break;
    }
    case "retry": {
      // A retry absorbs a blip. northwind is not a blip, so after the attempts
      // are spent the rejection reaches `Promise.all` unchanged.
      const withRetry = async (vendor: number) => {
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            return await fetchVendorProfile(vendor);
          } catch (error) {
            if (attempt === 2) throw error;
          }
        }
        throw new Error("unreachable");
      };
      try {
        const results = await Promise.all(vendors.map(withRetry));
        retained = results.length;
      } catch {
        retained = 0;
      }
      break;
    }
    case "try-catch": {
      // Catching the rejection changes who reports the failure, not the fact
      // that `Promise.all` already discarded the batch before anyone caught it.
      try {
        const results = await Promise.all(vendors.map(fetchVendorProfile));
        retained = results.length;
      } catch {
        retained = 0;
      }
      break;
    }
    case "all":
    default: {
      try {
        const results = await Promise.all(vendors.map(fetchVendorProfile));
        retained = results.length;
      } catch {
        retained = 0;
      }
      break;
    }
  }

  const reachable = VENDOR_COUNT - 1;
  return {
    missionId: "promise-all-cascade",
    strategy,
    metrics: { attempted: VENDOR_COUNT, retained, namedFailures },
    // The incident is "a batch was discarded, and nobody was told which vendor
    // broke". Both halves have to be answered.
    incidentRecurred: retained < reachable || namedFailures < 1,
  };
}

/* ----------------------------- async-map-trap ----------------------------- */

/**
 * A worker job that maps over its items and forgets to await them.
 *
 * Root cause: `items.map(async …)` produces an array of promises, and a job that
 * does not await it returns while every one of them is still running. The
 * measurement is the only one that matters: at the instant the job reported
 * itself complete, how much work had actually finished?
 *
 * Item `i` takes `(i + 1) * STEP_MS`, so the tail is comfortably slower than any
 * fixed delay — which is what makes `delay-before-returning` measurably a race
 * rather than a fix, instead of merely arguably one.
 */
export const MAPPED_ITEMS = 8;
const STEP_MS = 8;
const FIXED_DELAY_MS = 15;

export type AsyncMapStrategy =
  | "unawaited"
  | "await-all"
  | "foreach"
  | "try-catch"
  | "timeout"
  | "delay";

async function runAsyncMap(strategy: AsyncMapStrategy): Promise<ReplayResult> {
  const items = Array.from({ length: MAPPED_ITEMS }, (_, i) => i);
  let completed = 0;
  const processItem = async (item: number) => {
    await sleep((item + 1) * STEP_MS);
    completed += 1;
  };

  switch (strategy) {
    case "await-all":
      await Promise.all(items.map(processItem));
      break;
    case "foreach":
      // `forEach` cannot await an async callback — the same bug wearing a
      // different method name.
      items.forEach((item) => void processItem(item));
      break;
    case "try-catch":
      // Catching inside each call makes failures visible. It does not make the
      // job wait for any of them.
      items.map((item) => processItem(item).catch(() => undefined));
      break;
    case "timeout":
      // A longer job timeout changes when the runner gives up, not when the job
      // returns. The job still returns immediately.
      items.map(processItem);
      break;
    case "delay":
      items.map(processItem);
      await sleep(FIXED_DELAY_MS);
      break;
    case "unawaited":
    default:
      items.map(processItem);
      break;
  }

  // Read at the moment the job reports completion — the whole point.
  const completedAtReturn = completed;
  return {
    missionId: "async-map-trap",
    strategy,
    metrics: { total: MAPPED_ITEMS, completedAtReturn },
    incidentRecurred: completedAtReturn < MAPPED_ITEMS,
  };
}

/* ------------------------ overlapping-scheduler-runs ---------------------- */

/**
 * A sync job on a timer that takes longer than its own interval.
 *
 * Root cause: `setInterval` does not await the previous run, so a run that
 * overruns is joined by the next one rather than delaying it. The measurement is
 * the overlap itself — `maxConcurrentRuns` — because that is what the authored
 * root cause names. Duplicate charges are the *symptom*, and are counted
 * separately so that fixes which suppress the symptom without removing the
 * overlap can be told apart from the one that removes it.
 *
 * `RUN_MS` exceeds both `INTERVAL_MS` and `LONGER_INTERVAL_MS`, so the overlap
 * is structural rather than a matter of how fast the machine is.
 */
const RUN_MS = 60;
const INTERVAL_MS = 25;
const LONGER_INTERVAL_MS = 45;
const SCHEDULER_WINDOW_MS = 220;

export type SchedulerStrategy =
  | "interval"
  | "guarded-loop"
  | "idempotency"
  | "longer-interval"
  | "dedupe-after"
  | "worker";

async function runScheduler(strategy: SchedulerStrategy): Promise<ReplayResult> {
  let active = 0;
  let maxConcurrentRuns = 0;
  let runsStarted = 0;
  const charged: number[] = [];
  /**
   * Invoices already settled. A run claims the lowest unsettled invoice, charges
   * it, and only marks it settled when it finishes — so the duplicate is caused
   * by the overlap rather than produced alongside it.
   *
   * The first draft derived the invoice from a counter instead, which manufactured
   * duplicates even when nothing overlapped: the *correct* fix scored one, and the
   * test caught it. Same lesson as `aggregateWeekly`'s short-circuiting first
   * draft — a scenario has to reproduce the mechanism, not just the symptom.
   */
  const settled = new Set<number>();

  const doRun = async (guardDuplicates: boolean) => {
    runsStarted += 1;
    active += 1;
    maxConcurrentRuns = Math.max(maxConcurrentRuns, active);

    let invoice = 0;
    while (settled.has(invoice)) invoice += 1;
    // The call to the payment API. An idempotency key is what makes the second
    // one a no-op; without it the customer is charged twice.
    if (!guardDuplicates || !charged.includes(invoice)) charged.push(invoice);

    await sleep(RUN_MS);
    settled.add(invoice);
    active -= 1;
  };

  if (strategy === "guarded-loop") {
    // The fix: schedule the next run only once this one has finished, and refuse
    // to start a second while one is in flight.
    let running = false;
    const deadline = Date.now() + SCHEDULER_WINDOW_MS;
    while (Date.now() < deadline) {
      if (!running) {
        running = true;
        await doRun(false);
        running = false;
      }
      await sleep(INTERVAL_MS);
    }
  } else {
    const interval = strategy === "longer-interval" ? LONGER_INTERVAL_MS : INTERVAL_MS;
    const inFlight: Promise<void>[] = [];
    const timer = setInterval(() => {
      inFlight.push(doRun(strategy === "idempotency"));
    }, interval);
    await sleep(SCHEDULER_WINDOW_MS);
    clearInterval(timer);
    await Promise.all(inFlight);
  }

  const seen = new Set<number>();
  let duplicateCharges = 0;
  for (const invoice of charged) {
    if (seen.has(invoice)) duplicateCharges += 1;
    seen.add(invoice);
  }
  // Cleaning up afterwards removes the duplicates from the ledger. The two runs
  // still both ran, and both still called the payment API.
  if (strategy === "dedupe-after") duplicateCharges = 0;

  return {
    missionId: "overlapping-scheduler-runs",
    strategy,
    metrics: { runsStarted, maxConcurrentRuns, duplicateCharges },
    // The authored root cause is the overlap, not the duplicate. A fix that
    // leaves runs overlapping has not addressed it, however clean the ledger.
    incidentRecurred: maxConcurrentRuns > 1,
  };
}

/* -------------------------------- Registry -------------------------------- */

/**
 * Missions with a runnable replay here. Ids only — **never which fix is right**,
 * for the same reason `SCENARIO_MISSIONS` in `verification-runtime.ts` is.
 */
const REPLAY_MISSIONS: readonly string[] = [
  "promise-all-cascade",
  "async-map-trap",
  "overlapping-scheduler-runs",
];

export function hasReplay(missionId: string): boolean {
  return REPLAY_MISSIONS.includes(missionId);
}

/**
 * The strategy each mission falls back to when no fix was chosen, i.e. the
 * unmodified incident. Safe to ship to the browser: "what the code did before
 * anyone touched it" is the mission briefing, not the answer.
 */
export const BASELINE_STRATEGY: Record<string, string> = {
  "promise-all-cascade": "all",
  "async-map-trap": "unawaited",
  "overlapping-scheduler-runs": "interval",
};

/**
 * Runs `missionId`'s incident under `strategy` and reports what happened.
 *
 * `strategy` comes from the server (`lib/server/replay.ts`), which resolves it
 * from the player's chosen fix. Returns `null` for missions with no replay, so
 * callers fall back to the derived report rather than inventing one.
 */
export async function runReplay(
  missionId: string,
  strategy: string,
): Promise<ReplayResult | null> {
  switch (missionId) {
    case "promise-all-cascade":
      return runCascade(strategy as CascadeStrategy);
    case "async-map-trap":
      return runAsyncMap(strategy as AsyncMapStrategy);
    case "overlapping-scheduler-runs":
      return runScheduler(strategy as SchedulerStrategy);
    default:
      return null;
  }
}
