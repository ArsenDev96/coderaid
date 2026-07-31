import { describe, expect, it } from "vitest";
import { getFix } from "@/lib/fix";
import { MISSION_ANSWERS } from "@/lib/server/answers";
import { replayStrategy } from "@/lib/server/replay";
import {
  MAPPED_ITEMS,
  VENDOR_COUNT,
  hasReplay,
  runReplay,
} from "@/lib/verification-replays";

/**
 * The Chapter 1 replays, asserted by running them.
 *
 * Two properties are being pinned, and the second is the new one:
 *
 *   1. The authored correct fix must *measurably* resolve the incident, and
 *      every distractor must measurably fail to. That is the property
 *      `verification-runtime.test.ts` already establishes for
 *      `event-loop-overload`.
 *
 *   2. Each distractor must fail **in the specific way `lib/fix.ts` says it
 *      does**. `catch-each-promise-returning-null` is not wrong because it
 *      loses the profiles — the mission text is explicit that it keeps them —
 *      it is wrong because it loses the failure. A test that only checked
 *      "distractor ⇒ bad" would pass while the replay contradicted the prose.
 *
 * Unlike the event-loop replay these assert counts, not durations, so there is
 * no timing margin to be flaky about. The one time-shaped scenario
 * (`overlapping-scheduler-runs`) is structural: its run takes longer than its
 * interval by design, so a slower machine overlaps at least as much, never less.
 */

const MISSIONS = [
  "promise-all-cascade",
  "async-map-trap",
  "overlapping-scheduler-runs",
] as const;

/** The correct fix, from the server-side answer key. */
const correctFixFor = (missionId: string) => MISSION_ANSWERS[missionId].fixId;

/** Every other option the mission offers. */
function distractorsFor(missionId: string): string[] {
  const correct = correctFixFor(missionId);
  return getFix(missionId)!
    .options.map((option) => option.id)
    .filter((id) => id !== correct);
}

async function replayFix(missionId: string, fixId: string | null) {
  const strategy = replayStrategy(missionId, fixId);
  expect(strategy).not.toBeNull();
  const result = await runReplay(missionId, strategy!);
  expect(result).not.toBeNull();
  return result!;
}

describe("the registry", () => {
  it("covers exactly the three missions §17 says can be replayed honestly", () => {
    for (const missionId of MISSIONS) expect(hasReplay(missionId)).toBe(true);
    // Reproducing a connection pool in a browser tab would be theatre.
    expect(hasReplay("connection-pool-exhaustion")).toBe(false);
    // event-loop-overload has its own module; this one must not claim it.
    expect(hasReplay("event-loop-overload")).toBe(false);
  });

  it("returns nothing for a mission with no replay, rather than inventing one", async () => {
    expect(await runReplay("connection-pool-exhaustion", "all")).toBeNull();
  });

  /**
   * The check that catches the realistic future mistake: someone adds a sixth
   * fix option and forgets the strategy for it, so it silently replays the
   * baseline and looks like a distractor whether or not it is one.
   */
  it("maps every authored fix option to a strategy", () => {
    for (const missionId of MISSIONS) {
      const baseline = replayStrategy(missionId, null);
      for (const option of getFix(missionId)!.options) {
        const strategy = replayStrategy(missionId, option.id);
        expect(strategy, `${missionId}/${option.id}`).toBeTruthy();
        // A mapped option must not fall through to the baseline by accident.
        if (option.id !== correctFixFor(missionId)) {
          expect(
            strategy === baseline && option.id !== null,
            `${missionId}/${option.id} fell through to the baseline`,
          ).toBe(strategy === baseline);
        }
      }
    }
  });
});

describe("every mission's authored correct fix, executed", () => {
  for (const missionId of MISSIONS) {
    it(`resolves the incident for ${missionId}`, async () => {
      const result = await replayFix(missionId, correctFixFor(missionId));
      expect(result.incidentRecurred).toBe(false);
    }, 20_000);
  }
});

describe("every distractor, executed", () => {
  for (const missionId of MISSIONS) {
    it(`leaves the incident in place for ${missionId}`, async () => {
      const distractors = distractorsFor(missionId);
      expect(distractors.length).toBeGreaterThan(0);
      for (const fixId of distractors) {
        const result = await replayFix(missionId, fixId);
        expect(result.incidentRecurred, `${missionId}/${fixId}`).toBe(true);
      }
    }, 30_000);
  }

  it("leaves the incident in place when no fix was chosen at all", async () => {
    for (const missionId of MISSIONS) {
      const result = await replayFix(missionId, null);
      expect(result.incidentRecurred, missionId).toBe(true);
    }
  }, 20_000);
});

/**
 * The prose in `lib/fix.ts`, turned into arithmetic. If an explanation and the
 * executed behaviour ever disagree, one of them is wrong — and this is what
 * says which.
 */
describe("each fix behaves the specific way the mission says it does", () => {
  const REACHABLE = VENDOR_COUNT - 1; // one vendor is permanently 503

  describe("promise-all-cascade", () => {
    const mission = "promise-all-cascade";

    it("discards the whole batch under plain Promise.all", async () => {
      const result = await replayFix(mission, null);
      expect(result.metrics.retained).toBe(0);
    });

    it("keeps every reachable profile and names the failure under the correct fix", async () => {
      const result = await replayFix(mission, correctFixFor(mission));
      expect(result.metrics.retained).toBe(REACHABLE);
      expect(result.metrics.namedFailures).toBe(1);
    });

    /** The whole reason this mission needed a per-fix model. */
    it("keeps the profiles but loses the failure under catch-and-return-null", async () => {
      const result = await replayFix(mission, "catch-each-promise-returning-null");
      expect(result.metrics.retained).toBe(REACHABLE);
      expect(result.metrics.namedFailures).toBe(0);
      expect(result.incidentRecurred).toBe(true);
    });

    it("gets partway through and stops when run sequentially", async () => {
      const result = await replayFix(mission, "process-vendors-sequentially");
      expect(result.metrics.retained).toBeGreaterThan(0);
      expect(result.metrics.retained).toBeLessThan(REACHABLE);
    });

    it("still loses the batch when the retry is exhausted", async () => {
      const result = await replayFix(mission, "retry-failed-vendor-with-backoff");
      expect(result.metrics.retained).toBe(0);
    }, 20_000);
  });

  describe("async-map-trap", () => {
    const mission = "async-map-trap";

    it("reports done with nothing finished when the promises are not awaited", async () => {
      const result = await replayFix(mission, null);
      expect(result.metrics.completedAtReturn).toBe(0);
    });

    it("finishes every item under the correct fix", async () => {
      const result = await replayFix(mission, correctFixFor(mission));
      expect(result.metrics.completedAtReturn).toBe(MAPPED_ITEMS);
    });

    it("is still unawaited when map becomes forEach", async () => {
      const result = await replayFix(mission, "switch-map-to-foreach");
      expect(result.metrics.completedAtReturn).toBe(0);
    });

    /**
     * The interesting distractor: a fixed sleep finishes *some* of the work, so
     * it looks like progress. It is a race, and the tail proves it.
     */
    it("finishes only part of the work behind a fixed delay", async () => {
      const result = await replayFix(mission, "delay-before-returning");
      expect(result.metrics.completedAtReturn).toBeLessThan(MAPPED_ITEMS);
    });
  });

  describe("overlapping-scheduler-runs", () => {
    const mission = "overlapping-scheduler-runs";

    it("overlaps runs and double-charges on a plain interval", async () => {
      const result = await replayFix(mission, null);
      expect(result.metrics.maxConcurrentRuns).toBeGreaterThanOrEqual(2);
      expect(result.metrics.duplicateCharges).toBeGreaterThan(0);
    }, 20_000);

    it("never runs twice at once under the correct fix", async () => {
      const result = await replayFix(mission, correctFixFor(mission));
      expect(result.metrics.maxConcurrentRuns).toBe(1);
      expect(result.metrics.duplicateCharges).toBe(0);
    }, 20_000);

    /**
     * Both of these clean up the symptom and leave the root cause — the runs
     * still overlap, and both still called the payment API. The authored root
     * cause is the overlap, so both are distractors, and the numbers say why.
     */
    it("stops the duplicates but keeps the overlap under idempotency keys", async () => {
      const result = await replayFix(mission, "add-idempotency-key-to-charges");
      expect(result.metrics.duplicateCharges).toBe(0);
      expect(result.metrics.maxConcurrentRuns).toBeGreaterThanOrEqual(2);
    }, 20_000);

    it("still overlaps when the interval is merely made longer", async () => {
      const result = await replayFix(mission, "increase-the-interval");
      expect(result.metrics.maxConcurrentRuns).toBeGreaterThanOrEqual(2);
    }, 20_000);
  });
});
