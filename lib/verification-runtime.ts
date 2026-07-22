/**
 * Verification that actually executes something.
 *
 * The rest of the verification stage is *derived*: authored before/after
 * numbers, revealed or withheld depending on whether the player's fix resolved
 * the root cause (`resolveVerification`). Honest about what it knows, but
 * nothing runs — which made it the largest remaining piece of theatre in the
 * app (§12 item 1).
 *
 * This module closes that for the missions where it can be closed honestly.
 * `event-loop-overload` is about synchronous CPU work starving an event loop,
 * and a browser *has* an event loop — so the incident can be reproduced rather
 * than described. The aggregation below is real O(n²) work over real rows, and
 * the lag figure is a real measurement of how long the main thread stopped
 * answering.
 *
 * **Why this cannot become an answer oracle.** Nothing here is labelled correct.
 * There is no `resolves` flag, no expected value, and no branch on "is this the
 * right fix" — the code runs whichever strategy the chosen fix implies and
 * reports what happened. Whether that counts as resolved is still the server's
 * verdict, from grading. The measurement and the verdict agree because the
 * simulation is faithful, not because either was told the answer, and
 * `tests/verification-runtime.test.ts` pins exactly that: the authored correct
 * fix must *measurably* keep the thread responsive and every distractor must
 * measurably fail to. A mission whose "correct" fix does not actually work is
 * then a failing test rather than a claim nobody checked.
 */

/* ----------------------------- The workload ------------------------------ */

export type ReportRow = { id: number; bucket: number; value: number };

/**
 * Deterministic rows, so a measurement is comparable between runs. Seeded by
 * hand rather than with `Math.random()` — a scenario that differs per run
 * cannot be asserted on.
 */
export function buildRows(count: number): ReportRow[] {
  const rows: ReportRow[] = new Array(count);
  for (let i = 0; i < count; i += 1) {
    rows[i] = { id: i, bucket: i % 32, value: (i * 2654435761) % 1000 };
  }
  return rows;
}

/**
 * The bug, faithfully: for every row, a full scan of the same array to find its
 * bucket's peak — which is what the mission's `report.controller.ts` does with a
 * nested lookup. Quadratic, entirely synchronous, and the reason the event loop
 * stops.
 *
 * Written as an explicit inner loop rather than `rows.find(...)` because `find`
 * short-circuits on the first match: the first draft of this looked quadratic,
 * measured at 4ms for 1,400 rows, and would have "demonstrated" blocking that
 * never happened. The scan has to actually be a scan.
 */
export function aggregateWeekly(rows: ReportRow[]): number {
  let total = 0;
  for (const row of rows) {
    let peak = row;
    // The O(n) lookup inside the O(n) loop — the authored root cause.
    for (const candidate of rows) {
      if (candidate.bucket === row.bucket && candidate.value > peak.value) {
        peak = candidate;
      }
    }
    total += peak.value;
  }
  return total;
}

/* ------------------------------ Measurement ------------------------------ */

export type Measurement = {
  /**
   * The longest the thread went without answering a scheduled callback — the
   * browser-side equivalent of the mission's `event_loop_lag_ms`.
   */
  maxLagMs: number;
  /** Wall-clock for the whole replay. */
  totalMs: number;
  /** How many rows were aggregated. */
  rows: number;
  /** True when the thread stayed responsive throughout. */
  responsive: boolean;
  /**
   * Share of the probe's expected firings that actually happened, 0–1.
   *
   * A more robust statistic than `maxLagMs` for comparing two runs. `maxLagMs`
   * is a single worst sample, so on a loaded machine — CI, or a test suite
   * running in parallel — one unlucky scheduling gap during the *responsive*
   * run can rival the blocked one. This counts how much of the run the loop was
   * answering at all, which noise moves a little and a 300ms block moves a lot.
   */
  availability: number;
};

/**
 * Lag above which the thread counts as blocked.
 *
 * A responsive loop answers a 16ms probe within a frame or two; a blocked one
 * misses it by hundreds of milliseconds. The gap between those is wide enough
 * that this threshold does not need to be precise, which matters because CI
 * machines are slower and noisier than a developer's.
 */
export const LAG_THRESHOLD_MS = 120;

const PROBE_INTERVAL_MS = 16;

/**
 * How the report gets built: on the calling thread, or somewhere else.
 *
 * Injected rather than imported so the scenario is testable in Node — the
 * browser supplies a real `Worker`, a test supplies a chunked runner. Both
 * genuinely leave the measuring thread free, which is the property under test;
 * neither is a stub that merely claims to.
 */
export type Offloader = (rows: ReportRow[]) => Promise<number>;

/** Runs the aggregation inline. This is what blocks. */
export const runInline: Offloader = async (rows) => aggregateWeekly(rows);

/**
 * Measures how responsive the thread stays while `offload` produces the report.
 *
 * The probe is the measurement: a timer that should fire every 16ms, and the
 * largest gap between consecutive firings is how long the loop was unavailable.
 * That is the same thing an APM agent reports as event-loop lag, done the same
 * way.
 */
export async function measure(
  rows: ReportRow[],
  offload: Offloader,
): Promise<Measurement> {
  let maxLagMs = 0;
  let samples = 0;
  let last = performance.now();
  const startedAt = last;

  const probe = setInterval(() => {
    const now = performance.now();
    maxLagMs = Math.max(maxLagMs, now - last - PROBE_INTERVAL_MS);
    samples += 1;
    last = now;
  }, PROBE_INTERVAL_MS);

  try {
    // Let the probe establish a baseline before the work starts, so the first
    // interval's own scheduling delay isn't counted as lag.
    await new Promise((resolve) => setTimeout(resolve, PROBE_INTERVAL_MS * 2));
    last = performance.now();

    await offload(rows);
  } finally {
    clearInterval(probe);
  }

  // One final sample: work that blocked right up to the end would otherwise go
  // unmeasured, because the probe never got to run after it.
  maxLagMs = Math.max(maxLagMs, performance.now() - last - PROBE_INTERVAL_MS);

  const totalMs = performance.now() - startedAt;
  const expectedSamples = Math.max(1, totalMs / PROBE_INTERVAL_MS);

  return {
    maxLagMs: Math.round(Math.max(0, maxLagMs)),
    totalMs: Math.round(totalMs),
    rows: rows.length,
    responsive: maxLagMs < LAG_THRESHOLD_MS,
    availability: Math.min(1, samples / expectedSamples),
  };
}

/* ------------------------------- Scenarios ------------------------------- */

/**
 * Missions with a runnable replay. A list of ids only — **never which fix is
 * the right one**.
 *
 * The first draft of this module kept a `mission → offloading fix id` map here,
 * which put the fix stage's answer in the client bundle in machine-readable
 * form: precisely the leak `resolvesRootCause` was deleted for. Whether the work
 * moves off the thread is now decided by the server's grading verdict and passed
 * in, so the browser executes the replay without ever being told the answer.
 * The mission→fix mapping lives in `lib/server/replay.ts`, behind `server-only`.
 */
const SCENARIO_MISSIONS: readonly string[] = ["event-loop-overload"];

/**
 * Rows per replay — calibrated, not guessed.
 *
 * The work is quadratic, so this is the dial that decides how long the thread
 * stops. Measured locally: 5,000 rows ≈ 54ms, 9,000 ≈ 195ms, 12,000 ≈ 350ms.
 * 12,000 blocks long enough to be unmistakable against the 120ms threshold —
 * with room for a slower CI machine, where more lag only strengthens the
 * assertion — while staying short enough that a player's tab is never
 * meaningfully hung.
 */
export const SCENARIO_ROWS = 12_000;

export function hasScenario(missionId: string): boolean {
  return SCENARIO_MISSIONS.includes(missionId);
}

/**
 * Replays the incident and reports what happened. Returns `null` for missions
 * with no runnable scenario, so callers fall back to the derived report rather
 * than inventing one.
 *
 * `offloaded` comes from the server's grading verdict — the browser is told
 * *that* the fix worked, never *which* fix would have. The work below is real
 * either way: inline execution genuinely blocks the thread and the offloaded
 * path genuinely does not, so the number reported is measured rather than
 * chosen.
 */
export async function runScenario(
  missionId: string,
  offloaded: boolean,
  offload: Offloader,
): Promise<Measurement | null> {
  if (!hasScenario(missionId)) return null;
  const rows = buildRows(SCENARIO_ROWS);
  return measure(rows, offloaded ? offload : runInline);
}
