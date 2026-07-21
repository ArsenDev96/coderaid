import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  EMPTY_VIEW,
  PLAYABLE_MISSION_IDS,
  canStart,
  chapterState,
  hasFullContent,
  missionAvailability,
  nextMissionId,
  recommendedMission,
  type PlayerView,
} from "@/lib/availability";
import { getDiagnosis } from "@/lib/diagnosis";
import { answersFor } from "@/lib/server/answers";
import { getFix, type FixOption } from "@/lib/fix";
import { missionSkillIds } from "@/lib/grading";
import { getInvestigation } from "@/lib/investigation";
import { MISSIONS, chapterTrack, getMission, type Mission } from "@/lib/missions";
import { EXPERIENCE_LEVELS, recommendedStartingMission } from "@/lib/onboarding";
import { EMPTY_LEDGER, type Ledger, type MissionRecord } from "@/lib/progress";
import { getResult } from "@/lib/results";
import { getVerification, resolveVerification } from "@/lib/verification";
import {
  collectResults,
  installStorage,
  play,
  uninstallStorage,
} from "./helpers/mission-run";

/**
 * Chapter 2 — Node.js APIs.
 *
 * `mission-flows-all.test.ts` already runs every playable mission through the
 * shared contract. This file asserts the things that are specific to these five
 * incidents: that the chapter is reachable end to end in the right order, and
 * that each mission teaches the correct engineering answer rather than a
 * plausible-looking one.
 */

const CHAPTER_TWO = MISSIONS.filter((m) => m.chapterId === 2);
const IDS = CHAPTER_TWO.map((m) => m.id);

function record(missionId: string): MissionRecord {
  return {
    missionId,
    completedAt: "2026-06-01T09:00:00.000Z",
    completedOn: "2026-06-01",
    score: 100,
    xpEarned: 100,
    durationMs: 600_000,
    hintsUsed: 0,
    resolved: true,
    attempts: 1,
  };
}

function viewWith(completed: string[] = [], started: string[] = []): PlayerView {
  const missions: Ledger["missions"] = {};
  for (const id of completed) missions[id] = record(id);
  return {
    ledger: { ...EMPTY_LEDGER, missions },
    startedMissionIds: started,
  };
}

const optionById = (missionId: string, fixId: string): FixOption => {
  const option = getFix(missionId)!.options.find((o) => o.id === fixId);
  expect(option, `${missionId} should offer the fix "${fixId}"`).toBeDefined();
  return option!;
};

/* ---------------------------- Chapter shape ----------------------------- */

describe("Chapter 2 completion", () => {
  it("holds five missions, all fully authored and available", () => {
    expect(IDS).toEqual([
      "user-signup-latency-spike",
      "jwt-session-expiry",
      "health-check-flapping",
      "graceful-shutdown-bug",
      "rate-limiter-race",
    ]);
    for (const mission of CHAPTER_TWO) {
      expect(hasFullContent(mission.id)).toBe(true);
      expect(mission.status).toBe("available");
      expect(missionAvailability(mission, EMPTY_VIEW)).toBe("available");
      expect(canStart(mission, EMPTY_VIEW)).toBe(true);
    }
  });

  it("reaches complete state only once every mission in it is finished", () => {
    expect(chapterState(2, EMPTY_VIEW)).toBe("in-progress");
    expect(chapterState(2, viewWith(IDS.slice(0, -1)))).toBe("in-progress");
    expect(chapterState(2, viewWith(IDS))).toBe("complete");
  });

  it("gives every mission a canonical primary skill and supporting skills", () => {
    for (const mission of CHAPTER_TWO) {
      const { primary, supporting } = missionSkillIds(mission);
      expect(primary).toBe(mission.rewardSkillId);
      expect(supporting.length).toBeGreaterThanOrEqual(2);
      expect(getResult(mission.id)!.skillImprovement.skillId).toBe(primary);
    }
  });

  it("walks Chapter 1 into Chapter 2 and on into Chapter 3", () => {
    expect(nextMissionId("unhandled-rejection-storm")).toBe(IDS[0]);
    for (let i = 0; i < IDS.length - 1; i += 1) {
      expect(nextMissionId(IDS[i])).toBe(IDS[i + 1]);
    }
    // Chapter 3 is authored now, so the chapter continues rather than stopping.
    const next = nextMissionId(IDS[IDS.length - 1]);
    expect(next).toBe("memory-leak-worker");
    expect(getMission(next as string)?.chapterId).toBe(3);
  });
});

/* --------------------------- Recommendations ---------------------------- */

describe("Chapter 2 recommendations", () => {
  it("never recommends a Chapter 3 mission while Chapter 2 is unfinished", () => {
    const chapterOne = MISSIONS.filter((m) => m.chapterId === 1).map((m) => m.id);
    for (let i = 0; i < IDS.length; i += 1) {
      const view = viewWith([...chapterOne, ...IDS.slice(0, i)]);
      const next = recommendedMission(view);
      expect(next?.id).toBe(IDS[i]);
      expect(next?.chapterId).toBe(2);
    }
  });

  it("moves on to Chapter 3 once Chapters 1 and 2 are finished", () => {
    const everything = MISSIONS.filter(
      (m) => m.chapterId === 1 || m.chapterId === 2,
    ).map((m) => m.id);
    const suggestion = recommendedMission(viewWith(everything));

    // The next unfinished playable mission — never an unwritten one.
    expect(suggestion).toBeDefined();
    expect(hasFullContent(suggestion!.id)).toBe(true);
    expect(suggestion!.id).toBe("memory-leak-worker");
    expect(chapterTrack(suggestion!.chapterId)).toBe("nodejs");
  });

  it("still prefers a started but unfinished Chapter 2 mission", () => {
    const view = viewWith([], ["rate-limiter-race"]);
    expect(recommendedMission(view)?.id).toBe("rate-limiter-race");
  });

  it("points every onboarding experience level at a playable mission", () => {
    const expected: Record<string, string> = {
      beginner: "event-loop-overload",
      junior: "promise-all-cascade",
      mid: "user-signup-latency-spike",
    };

    for (const level of EXPERIENCE_LEVELS) {
      const suggested = recommendedStartingMission(level.id);
      expect(suggested.id).toBe(expected[level.id]);

      const mission = getMission(suggested.id) as Mission;
      expect(mission.title).toBe(suggested.title);
      expect(PLAYABLE_MISSION_IDS).toContain(mission.id);
      expect(canStart(mission, EMPTY_VIEW)).toBe(true);
    }
  });
});

/* ------------------------- Mission correctness -------------------------- */

describe("jwt-session-expiry teaches the concurrency fix, not a weaker session", () => {
  const id = "jwt-session-expiry";

  it("blames the race between concurrent refreshes and rotation", () => {
    const diagnosis = getDiagnosis(id)!;
    expect(answersFor(id)!.rootCauseId).toBe(
      "concurrent-refresh-token-rotation-race",
    );
    // The clue is a burst of refreshes, not one bad log line: the diagnosis
    // needs the burst, the rotation, and the client that caused both.
    expect(answersFor(id)!.evidenceIds).toEqual(
      expect.arrayContaining([
        "refresh-burst-same-token-family",
        "one-refresh-succeeds-rest-reuse",
        "every-401-calls-refresh",
      ]),
    );
  });

  it("resolves only by refreshing once, never by weakening the token model", () => {
    const fix = getFix(id)!;
    expect(answersFor(id)!.fixId).toBe("single-flight-refresh-with-safe-token-rotation");

    const resolving = optionById(id, answersFor(id)!.fixId);
    expect(resolving.id).toBe(answersFor(id)!.fixId);
    expect(resolving.codeExample).toMatch(/inFlight/);
    expect(resolving.codeExample).toMatch(/finally/);

    // Every option that trades security for quiet must be marked wrong.
    for (const wrong of [
      "disable-refresh-token-rotation",
      "ignore-refresh-token-reuse-detection",
      "increase-access-token-lifetime",
      "retry-failed-refresh-requests",
      "clear-session-on-every-401",
    ]) {
      expect(wrong).not.toBe(answersFor(id)!.fixId);
    }
  });

  it("keeps rotation and reuse detection green whatever the player chose", () => {
    const config = getVerification(id)!;
    const independent = config.checks.filter((c) => c.dependsOnFix === false);
    expect(independent.map((c) => c.id)).toEqual(
      expect.arrayContaining(["rotation-intact", "reuse-detection-intact"]),
    );
    const failed = resolveVerification(config, false);
    expect(
      failed.checks.filter((c) => c.dependsOnFix === false).every((c) => c.passed),
    ).toBe(true);
    expect(failed.checks.find((c) => c.id === "single-refresh")!.passed).toBe(false);
  });
});

describe("health-check-flapping separates liveness from readiness", () => {
  const id = "health-check-flapping";

  it("blames the probe's coupling to a transient dependency", () => {
    const diagnosis = getDiagnosis(id)!;
    expect(answersFor(id)!.rootCauseId).toBe(
      "liveness-probe-coupled-to-transient-dependencies",
    );
    // The correlation the player has to make: the probe fails while the same
    // instance is answering business traffic.
    expect(answersFor(id)!.evidenceIds).toEqual(
      expect.arrayContaining([
        "liveness-probe-runs-deep-dependency-check",
        "health-span-dominated-by-analytics",
        "local-requests-still-served",
      ]),
    );
  });

  it("resolves only by splitting the probes and bounding the checks", () => {
    const fix = getFix(id)!;
    expect(answersFor(id)!.fixId).toBe(
      "separate-liveness-readiness-and-bounded-dependency-checks",
    );
    const resolving = optionById(id, answersFor(id)!.fixId);
    expect(resolving.codeExample).toMatch(/\/live/);
    expect(resolving.codeExample).toMatch(/\/ready/);
    expect(resolving.codeExample).toMatch(/withTimeout/);

    // A bigger timeout or more restarts is never the root fix.
    for (const wrong of [
      "increase-liveness-timeout",
      "increase-restart-limit",
      "remove-health-checks",
      "add-more-instances",
      "ignore-all-dependency-failures",
    ]) {
      expect(wrong).not.toBe(answersFor(id)!.fixId);
    }
  });

  it("leaves the flapping in place for a timeout-only fix", () => {
    const config = getVerification(id)!;
    const failed = resolveVerification(config, false);

    expect(failed.metrics.every((m) => m.after === m.before)).toBe(true);
    expect(failed.metrics.every((m) => m.status === "fail")).toBe(true);
    expect(
      failed.checks.filter((c) => c.dependsOnFix !== false).every((c) => !c.passed),
    ).toBe(true);
    expect(failed.logs).toEqual(config.unresolvedLogs);
    expect(failed.logs.join(" ")).toMatch(/action=restart/);
  });

  describe("a wrong fix", () => {
    beforeEach(installStorage);
    afterEach(uninstallStorage);

    it("is not counted as a resolved run", () => {
      play(id, { correctDiagnosis: false, correctFix: false });
      const { grade } = collectResults(id, EMPTY_LEDGER);
      expect(grade.resolved).toBe(false);
      expect(grade.fixCorrect).toBe(false);
    });
  });
});

describe("graceful-shutdown-bug teaches a bounded drain in order", () => {
  const id = "graceful-shutdown-bug";

  it("blames the exit, not the platform around it", () => {
    const diagnosis = getDiagnosis(id)!;
    expect(answersFor(id)!.rootCauseId).toBe(
      "immediate-process-exit-without-draining-work",
    );
    for (const plausible of [
      "load-balancer-misrouting",
      "database-failover-during-deploy",
      "queue-provider-duplicate-delivery",
    ]) {
      expect(diagnosis.rootCauses.map((r) => r.id)).toContain(plausible);
      expect(answersFor(id)!.rootCauseId).not.toBe(plausible);
    }
  });

  it("orders the drain: stop traffic, stop jobs, finish work, close resources", () => {
    const fix = getFix(id)!;
    expect(answersFor(id)!.fixId).toBe("bounded-graceful-shutdown-with-draining");
    const code = optionById(id, answersFor(id)!.fixId).codeExample!;

    const order = ["setReady(false)", "consumers.stop", "closeServer", "drained", "pool.end", "process.exit"];
    const positions = order.map((step) => code.indexOf(step));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);

    // And the wait is bounded, not a hopeful sleep.
    expect(code).toMatch(/SHUTDOWN_TIMEOUT_MS/);
  });

  it("does not accept a fixed delay or a reordered close as the fix", () => {
    for (const wrong of [
      "delay-before-process-exit",
      "close-database-first-then-wait",
      "increase-client-retry-count",
      "add-more-replicas-during-deploy",
      "ignore-sigterm",
    ]) {
      expect(wrong).not.toBe(answersFor(id)!.fixId);
    }
  });

  it("still drops in-flight work when the drain is only a delay", () => {
    const config = getVerification(id)!;
    const failed = resolveVerification(config, false);
    expect(failed.metrics.find((m) => m.id === "dropped-requests")!.after).toBe("23");
    expect(failed.unresolvedBreakdown.some((s) => /interrupted/i.test(s.label))).toBe(
      true,
    );
  });
});

describe("rate-limiter-race requires an atomic shared operation", () => {
  const id = "rate-limiter-race";

  it("blames the non-atomic read-modify-write", () => {
    const diagnosis = getDiagnosis(id)!;
    expect(answersFor(id)!.rootCauseId).toBe(
      "non-atomic-distributed-rate-limit-counter",
    );
    // Evidence has to come from more than the code: the same read on several
    // instances, the lost writes, and the way the error scales with replicas.
    expect(answersFor(id)!.evidenceIds).toEqual(
      expect.arrayContaining([
        "same-count-read-by-several-instances",
        "writes-overwrite-each-other",
        "overshoot-scales-with-replicas",
      ]),
    );

    const investigation = getInvestigation(id)!;
    const sources = new Set(
      investigation.evidence.filter((e) => e.isKeyEvidence).map((e) => e.source),
    );
    expect(sources.size).toBeGreaterThanOrEqual(4);
  });

  it("treats an in-memory lock as insufficient for a multi-instance race", () => {
    const mutex = optionById(id, "in-memory-mutex-around-the-counter");
    expect(mutex.id).not.toBe(answersFor(id)!.fixId);
    expect(mutex.explanation.join(" ")).toMatch(/instance/i);

    for (const wrong of [
      "increase-the-rate-limit",
      "retry-failed-counter-writes",
      "read-the-counter-twice",
      "add-more-api-instances",
    ]) {
      expect(wrong).not.toBe(answersFor(id)!.fixId);
    }
  });

  it("resolves only with one atomic increment in the shared store", () => {
    const fix = getFix(id)!;
    expect(answersFor(id)!.fixId).toBe("atomic-shared-rate-limit-operation");
    const resolving = optionById(id, answersFor(id)!.fixId);
    expect(resolving.id).toBe(answersFor(id)!.fixId);
    expect(resolving.codeExample).toMatch(/incrementAndExpire/);
  });

  it("brings the window back to exactly the configured limit", () => {
    const config = getVerification(id)!;
    const metric = config.metrics.find((m) => m.id === "allowed-per-window")!;
    expect(metric.before).toBe("147");
    expect(metric.after).toBe("100");

    const failed = resolveVerification(config, false);
    expect(failed.metrics.find((m) => m.id === "allowed-per-window")!.after).toBe("147");
  });
});

/* ----------------------------- End to end ------------------------------- */

describe("playing Chapter 2 through", () => {
  beforeEach(installStorage);
  afterEach(uninstallStorage);

  it("credits every mission and completes the chapter", () => {
    let ledger = EMPTY_LEDGER;
    let expectedXp = 0;

    for (const mission of CHAPTER_TWO) {
      play(mission.id);
      const collected = collectResults(mission.id, ledger);
      expect(collected.grade.score).toBe(100);
      expect(collected.grade.resolved).toBe(true);

      ledger = collected.ledger;
      expectedXp += mission.xp;
      expect(ledger.totalXp).toBe(expectedXp);
    }

    expect(chapterState(2, { ledger, startedMissionIds: [] })).toBe("complete");
  });
});
