import {
  aggregateWeekly,
  runInline,
  type Offloader,
  type ReportRow,
} from "./verification-runtime";

/**
 * The browser's way of taking the work off the main thread: a real Worker.
 *
 * This is the counterpart to the mission's correct fix — `node:worker_threads`
 * on the server, `Worker` in the browser — and it is what makes the replay a
 * measurement instead of an animation. While this runs, the main thread's probe
 * keeps firing, which is exactly the difference the player is being shown.
 *
 * The worker's body is built from `aggregateWeekly.toString()` rather than being
 * written out a second time. Two copies of the workload would eventually drift,
 * and a drifted copy would quietly make the "fixed" path do less work than the
 * broken one — which would fake the very result this exists to measure.
 */
function workerSource(): string {
  return `
    const aggregateWeekly = ${aggregateWeekly.toString()};
    self.onmessage = (event) => {
      self.postMessage(aggregateWeekly(event.data));
    };
  `;
}

/** True when this environment can actually run work off the main thread. */
export function canOffload(): boolean {
  return typeof Worker !== "undefined" && typeof URL.createObjectURL === "function";
}

/**
 * Runs the aggregation in a Worker, falling back to inline execution where
 * Workers are unavailable.
 *
 * The fallback is deliberately honest rather than convenient: it does not
 * pretend the work moved. A browser without Workers genuinely cannot offload,
 * so the measurement genuinely shows a blocked thread, and the report says what
 * happened rather than what was supposed to happen.
 */
export const browserOffloader: Offloader = async (rows: ReportRow[]) => {
  if (!canOffload()) return runInline(rows);

  const url = URL.createObjectURL(
    new Blob([workerSource()], { type: "text/javascript" }),
  );
  const worker = new Worker(url);

  try {
    return await new Promise<number>((resolve, reject) => {
      worker.onmessage = (event: MessageEvent<number>) => resolve(event.data);
      worker.onerror = () => reject(new Error("The replay worker failed."));
      worker.postMessage(rows);
    });
  } finally {
    worker.terminate();
    URL.revokeObjectURL(url);
  }
};
