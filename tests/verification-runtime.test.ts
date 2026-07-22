import { describe, expect, it } from "vitest";
import { getFix } from "@/lib/fix";
import {
  LAG_THRESHOLD_MS,
  SCENARIO_ROWS,
  aggregateWeekly,
  buildRows,
  hasScenario,
  measure,
  runInline,
  runScenario,
  type Offloader,
  type ReportRow,
} from "@/lib/verification-runtime";
import { MISSION_ANSWERS } from "@/lib/server/answers";
import { offloads } from "@/lib/server/replay";

/**
 * The verification replay, asserted by running it.
 *
 * These are timing tests, which are usually a smell — so it is worth saying why
 * these are not flaky. They do not assert a duration; they assert a *direction*
 * separated by an order of magnitude. Blocking work misses a 16ms probe by
 * hundreds of milliseconds, non-blocking work misses it by nearly nothing, and
 * the threshold sits in the wide empty gap between. A slower machine makes the
 * blocked case block harder, which only widens the gap.
 */

/**
 * A genuinely non-blocking runner, standing in for the browser's Worker.
 *
 * It really does yield to the event loop between chunks — the probe keeps
 * firing throughout — so this is a fair stand-in rather than a stub that merely
 * reports success. It lives here rather than in the module because chunking is
 * not one of the mission's fix options; the product strategy is a real Worker.
 */
const runChunked: Offloader = async (rows: ReportRow[]) => {
  /**
   * Small on purpose. At 250 this yielded every ~57ms, which cleared the 120ms
   * threshold but only beat the blocked case by 4× — and the order-of-magnitude
   * assertion below caught it. A chunk has to be short enough that yielding is
   * the dominant behaviour, not an occasional interruption.
   */
  const CHUNK = 40;
  let total = 0;
  for (let start = 0; start < rows.length; start += CHUNK) {
    const slice = rows.slice(start, start + CHUNK);
    for (const row of slice) {
      let peak = row;
      for (const candidate of rows) {
        if (candidate.bucket === row.bucket && candidate.value > peak.value) {
          peak = candidate;
        }
      }
      total += peak.value;
    }
    // The yield: this is what keeps the loop answering.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return total;
};

describe("the workload", () => {
  it("is deterministic, so two replays are comparable", () => {
    expect(aggregateWeekly(buildRows(200))).toBe(aggregateWeekly(buildRows(200)));
  });

  it("is actually quadratic — the bug the mission is about", () => {
    // The first draft used `rows.find(...)`, which short-circuited and made the
    // work linear. Doubling the rows must roughly quadruple the comparisons.
    const count = (n: number) => {
      let comparisons = 0;
      const rows = buildRows(n);
      for (const row of rows) {
        for (const candidate of rows) {
          comparisons += 1;
          void candidate;
          void row;
        }
      }
      return comparisons;
    };
    expect(count(400)).toBe(400 * 400);
    expect(count(800) / count(400)).toBe(4);
  });
});

describe("measuring the replay", () => {
  it("records the thread stalling when the work runs inline", async () => {
    const result = await measure(buildRows(SCENARIO_ROWS), runInline);

    expect(result.rows).toBe(SCENARIO_ROWS);
    expect(result.maxLagMs).toBeGreaterThan(LAG_THRESHOLD_MS);
    expect(result.responsive).toBe(false);
  }, 30_000);

  it("records the thread staying responsive when the work is moved off it", async () => {
    const result = await measure(buildRows(SCENARIO_ROWS), runChunked);

    expect(result.maxLagMs).toBeLessThan(LAG_THRESHOLD_MS);
    expect(result.responsive).toBe(true);
  }, 30_000);

  it("separates the two cases by how much of the run the loop was answering", async () => {
    const rows = buildRows(SCENARIO_ROWS);
    const blocked = await measure(rows, runInline);
    const responsive = await measure(rows, runChunked);

    /**
     * This assertion used to compare `maxLagMs` with a 5× margin, and it was
     * flaky: running the whole suite in parallel put enough scheduling noise
     * into the *responsive* run (88ms) to bring it within 3× of the blocked one
     * (249ms). `maxLagMs` is a single worst sample, which is exactly the
     * statistic contention distorts.
     *
     * Availability is the robust version of the same claim. Under a 300ms
     * block the probe cannot fire at all; a chunked run keeps answering
     * throughout, and a busy machine costs it a few firings rather than all of
     * them. The gap stays wide because it is structural, not a matter of speed.
     */
    expect(responsive.availability).toBeGreaterThan(0.5);
    expect(blocked.availability).toBeLessThan(0.3);
    expect(responsive.availability).toBeGreaterThan(blocked.availability * 2);
  }, 60_000);
});

describe("the mission's own fix options, executed", () => {
  const MISSION = "event-loop-overload";

  it("has a runnable scenario", () => {
    expect(hasScenario(MISSION)).toBe(true);
    expect(hasScenario("promise-all-cascade")).toBe(false);
  });

  /**
   * The property worth having: the authored answer and the executed behaviour
   * must agree. If they ever diverge, the mission is teaching a fix that does
   * not work — and that is now a failing test rather than a claim nobody
   * checked.
   */
  it("keeps the thread responsive under the authored correct fix", async () => {
    const correct = MISSION_ANSWERS[MISSION].fixId;
    expect(offloads(MISSION, correct)).toBe(true);

    // `offloads` is the content claim; `runScenario` then executes it.
    const result = await runScenario(MISSION, offloads(MISSION, correct), runChunked);
    expect(result).not.toBeNull();
    expect(result!.responsive).toBe(true);
  }, 30_000);

  it("leaves the thread blocked under every distractor", async () => {
    const correct = MISSION_ANSWERS[MISSION].fixId;
    const config = getFix(MISSION);
    const distractors = config!.options
      .map((option) => option.id)
      .filter((id) => id !== correct);

    // The mission authors five options; four of them must genuinely not help.
    expect(distractors.length).toBeGreaterThan(0);

    for (const fixId of distractors) {
      expect(offloads(MISSION, fixId)).toBe(false);
      const result = await runScenario(
        MISSION,
        offloads(MISSION, fixId),
        runChunked,
      );
      // Even handed the non-blocking runner, a distractor never reaches it.
      expect(result!.responsive).toBe(false);
    }
  }, 120_000);

  it("blocks when no fix was applied at all", async () => {
    expect(offloads(MISSION, null)).toBe(false);
    const result = await runScenario(MISSION, false, runChunked);
    expect(result!.responsive).toBe(false);
  }, 30_000);

  it("returns nothing for a mission with no scenario, rather than inventing one", async () => {
    expect(await runScenario("promise-all-cascade", true, runChunked)).toBeNull();
  });
});
