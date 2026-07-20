import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getAchievements, achievementSources } from "@/lib/achievements";
import {
  EMPTY_VIEW,
  PLAYABLE_MISSION_IDS,
  canStart,
  chapterState,
  hasFullContent,
  missionAvailability,
  nextMissionId,
  playableSummary,
  recommendedMission,
  type PlayerView,
} from "@/lib/availability";
import { CAREER_RANKS } from "@/lib/data";
import { getDiagnosis } from "@/lib/diagnosis";
import { getFix, type FixOption } from "@/lib/fix";
import { missionSkillIds } from "@/lib/grading";
import { getInvestigation, keyEvidence } from "@/lib/investigation";
import { validateMissions } from "@/lib/mission-validation";
import {
  MISSIONS,
  NODE_MISSIONS,
  chapterTrack,
  getMission,
  type Mission,
} from "@/lib/missions";
import {
  EMPTY_LEDGER,
  levelFromXp,
  skillLevelFromXp,
  type Ledger,
  type MissionRecord,
} from "@/lib/progress";
import { getResult } from "@/lib/results";
import { SKILL_DEFS } from "@/lib/skills";
import { getVerification, resolveVerification } from "@/lib/verification";
import {
  collectResults,
  installStorage,
  play,
  uninstallStorage,
} from "./helpers/mission-run";

/**
 * Chapter 3 — Workers and Performance.
 *
 * `mission-flows-all.test.ts` already puts every playable mission through the
 * shared perfect / wrong / hint / replay contract. This file asserts what is
 * specific to these four incidents: that each one teaches the correct
 * engineering answer rather than the plausible one, that the well-known wrong
 * answers are explicitly *not* marked resolving, and that completing the
 * chapter closes out the Node.js MVP.
 */

const CHAPTER_THREE = MISSIONS.filter((m) => m.chapterId === 3);
const IDS = CHAPTER_THREE.map((m) => m.id);

function record(missionId: string): MissionRecord {
  return {
    missionId,
    completedAt: "2026-07-01T09:00:00.000Z",
    completedOn: "2026-07-01",
    score: 100,
    xpEarned: 100,
    durationMs: 900_000,
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

/** Every fix the mission offers apart from the one that resolves it. */
const nonResolvingIds = (missionId: string): string[] =>
  getFix(missionId)!
    .options.filter((o) => !o.resolvesRootCause)
    .map((o) => o.id);

/* ---------------------------- Chapter shape ----------------------------- */

describe("Chapter 3 completion", () => {
  it("holds four missions, all fully authored and available", () => {
    expect(IDS).toEqual([
      "memory-leak-worker",
      "worker-queue-backlog",
      "connection-pool-exhaustion",
      "slow-api-incident",
    ]);
    for (const mission of CHAPTER_THREE) {
      expect(hasFullContent(mission.id)).toBe(true);
      expect(mission.status).toBe("available");
      expect(missionAvailability(mission, EMPTY_VIEW)).toBe("available");
      expect(canStart(mission, EMPTY_VIEW)).toBe(true);
    }
  });

  it("authors a primary and supporting skills for every mission", () => {
    for (const mission of CHAPTER_THREE) {
      const { primary, supporting } = missionSkillIds(mission);
      expect(primary).toBe(mission.rewardSkillId);
      expect(supporting.length).toBeGreaterThanOrEqual(2);
      expect(getResult(mission.id)!.skillImprovement.skillId).toBe(primary);
      expect(getResult(mission.id)!.lessons.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("uses the canonical primary skill for each incident", () => {
    expect(getMission("memory-leak-worker")?.rewardSkillId).toBe("closures-memory");
    expect(getMission("worker-queue-backlog")?.rewardSkillId).toBe("background-jobs");
    expect(getMission("connection-pool-exhaustion")?.rewardSkillId).toBe(
      "performance-debugging",
    );
    // Deliberately not `performance-debugging`: this mission is about the shape
    // of the request, and the distinction keeps the two skills meaningful.
    expect(getMission("slow-api-incident")?.rewardSkillId).toBe("request-performance");
  });

  it("walks Chapter 2 into Chapter 3 and stops at the end of the MVP", () => {
    expect(nextMissionId("rate-limiter-race")).toBe(IDS[0]);
    for (let i = 0; i < IDS.length - 1; i += 1) {
      expect(nextMissionId(IDS[i])).toBe(IDS[i + 1]);
    }
    // slow-api-incident is the last Node.js mission; Chapters 4 and 5 are
    // future-track, so there is nothing playable after it.
    expect(nextMissionId(IDS[IDS.length - 1])).toBeUndefined();
  });

  it("reaches complete only after all four missions are finished", () => {
    expect(chapterState(3, EMPTY_VIEW)).toBe("in-progress");
    for (let i = 1; i < IDS.length; i += 1) {
      expect(chapterState(3, viewWith(IDS.slice(0, i)))).toBe("in-progress");
    }
    expect(chapterState(3, viewWith(IDS))).toBe("complete");
  });
});

/* ------------------------- Memory leak in workers ------------------------ */

describe("memory-leak-worker blames retained references", () => {
  const id = "memory-leak-worker";

  it("names long-lived references, evidenced across tools", () => {
    const diagnosis = getDiagnosis(id)!;
    expect(diagnosis.correctRootCauseId).toBe(
      "long-lived-references-retain-completed-jobs",
    );
    expect(diagnosis.correctEvidenceIds).toEqual(
      expect.arrayContaining([
        "listener-added-per-job-never-removed",
        "listener-count-climbs-with-jobs",
        "heap-never-returns-to-baseline",
      ]),
    );

    const investigation = getInvestigation(id)!;
    const sources = new Set(keyEvidence(investigation).map((e) => e.source));
    expect(sources.size).toBeGreaterThanOrEqual(4);
  });

  it("shows memory retained while the active-job count is zero", () => {
    const investigation = getInvestigation(id)!;
    const idle = investigation.evidence.find(
      (e) => e.id === "memory-retained-with-zero-active-jobs",
    );
    expect(idle?.isKeyEvidence).toBe(true);
    expect(idle!.description).toMatch(/active_jobs=0/);
    // The same fact appears in the logs the player actually reads.
    expect(
      investigation.logs.lines.some(
        (l) => l.evidenceId === "memory-retained-with-zero-active-jobs",
      ),
    ).toBe(true);
  });

  it("does not teach a bigger heap, a forced GC or a restart as the fix", () => {
    const heap = optionById(id, "increase-max-old-space-size");
    expect(heap.resolvesRootCause).toBe(false);

    const gc = optionById(id, "force-gc-after-every-job");
    expect(gc.resolvesRootCause).toBe(false);
    // The reason matters: a collection cannot free reachable objects.
    expect(gc.explanation.join(" ")).toMatch(/reachable/i);

    for (const wrong of [
      "restart-workers-on-a-schedule",
      "reduce-worker-concurrency",
      "add-more-worker-processes",
    ]) {
      expect(optionById(id, wrong).resolvesRootCause).toBe(false);
    }
  });

  it("resolves only by cleaning up listeners and bounding retained state", () => {
    const fix = getFix(id)!;
    expect(fix.correctFixId).toBe("cleanup-listeners-and-bound-retained-state");
    const resolving = optionById(id, fix.correctFixId);
    expect(resolving.resolvesRootCause).toBe(true);
    expect(resolving.codeExample).toMatch(/finally/);
    expect(resolving.codeExample).toMatch(/worker\.off/);
  });

  it("stabilises the heap only when the leak is actually fixed", () => {
    const config = getVerification(id)!;
    const heap = config.metrics.find((m) => m.id === "heap-after-4h")!;
    expect(heap.before).toBe("1.42 GB");
    expect(heap.after).toBe("214 MB");

    const failed = resolveVerification(config, false);
    expect(failed.metrics.find((m) => m.id === "heap-after-4h")!.after).toBe("1.42 GB");
    expect(failed.unresolvedLogs.join(" ")).toMatch(/MaxListenersExceededWarning/);
  });
});

/* --------------------------- Worker queue backlog ------------------------ */

describe("worker-queue-backlog blames unbounded retries", () => {
  const id = "worker-queue-backlog";

  it("names unbounded retries and missing backpressure", () => {
    const diagnosis = getDiagnosis(id)!;
    expect(diagnosis.correctRootCauseId).toBe(
      "unbounded-retries-and-missing-backpressure",
    );
    expect(diagnosis.correctEvidenceIds).toEqual(
      expect.arrayContaining([
        "same-job-retried-endlessly",
        "provider-429-rate",
        "immediate-requeue-in-catch",
        "backlog-grows-with-empty-dead-letter",
      ]),
    );
  });

  it("makes the poison job and the provider throttling both visible", () => {
    const investigation = getInvestigation(id)!;
    // The same job id, retried past any sane attempt count.
    expect(investigation.logs.lines.some((l) => /attempt=4812/.test(l.message))).toBe(
      true,
    );
    // And a provider that is actively refusing the load.
    expect(
      investigation.logs.lines.some((l) => /429 Too Many Requests/.test(l.message)),
    ).toBe(true);
    expect(
      investigation.metrics.cards.find((c) => c.evidenceId === "provider-429-rate")
        ?.value,
    ).toBe("61%");
  });

  it("does not teach more workers as the answer", () => {
    const workers = optionById(id, "double-the-worker-count");
    expect(workers.resolvesRootCause).toBe(false);
    // Because throughput already fell when workers were added.
    expect(workers.explanation.join(" ")).toMatch(/240|throughput/i);

    for (const wrong of [
      "retry-immediately-forever",
      "increase-provider-timeout",
      "remove-retries-completely",
      "purge-the-queue",
    ]) {
      expect(optionById(id, wrong).resolvesRootCause).toBe(false);
    }
  });

  it("resolves with bounded retries, dead-lettering and backpressure", () => {
    const fix = getFix(id)!;
    expect(fix.correctFixId).toBe("bounded-retries-dead-letter-and-backpressure");
    const resolving = optionById(id, fix.correctFixId);
    expect(resolving.resolvesRootCause).toBe(true);
    expect(resolving.codeExample).toMatch(/deadLetter/);
    expect(resolving.codeExample).toMatch(/MAX_ATTEMPTS/);
    expect(resolving.codeExample).toMatch(/Math\.random/); // jitter
    expect(resolving.explanation.join(" ")).toMatch(/backoff/i);
  });

  it("improves queue depth and oldest-job age only after the fix", () => {
    const config = getVerification(id)!;
    const depth = config.metrics.find((m) => m.id === "queue-depth")!;
    const age = config.metrics.find((m) => m.id === "oldest-job-age")!;
    expect(depth.before).toBe("184,012");
    expect(depth.after).toBe("1,240");
    expect(age.before).toBe("42m");
    expect(age.after).toBe("38s");

    const failed = resolveVerification(config, false);
    expect(failed.metrics.find((m) => m.id === "queue-depth")!.after).toBe("184,012");
    expect(failed.metrics.find((m) => m.id === "provider-429-rate")!.after).toBe("61%");
    expect(failed.checks.filter((c) => c.dependsOnFix !== false).every((c) => !c.passed)).toBe(
      true,
    );
  });
});

/* ------------------------ Connection pool exhaustion --------------------- */

describe("connection-pool-exhaustion blames the leaked error path", () => {
  const id = "connection-pool-exhaustion";

  it("names the connection leak on the error path", () => {
    const diagnosis = getDiagnosis(id)!;
    expect(diagnosis.correctRootCauseId).toBe("connection-leak-on-error-path");
    expect(diagnosis.correctEvidenceIds).toEqual(
      expect.arrayContaining([
        "early-return-skips-release",
        "checkout-without-matching-release",
        "pool-saturated-idle-zero",
      ]),
    );
  });

  it("shows pool wait dominating latency while queries stay healthy", () => {
    const investigation = getInvestigation(id)!;
    const acquire = investigation.trace!.spans.find((s) => s.id === "t-acquire")!;
    const query = investigation.trace!.spans.find((s) => s.id === "t-query")!;
    expect(acquire.ms).toBeGreaterThan(4000);
    expect(query.ms).toBeLessThan(50);
    expect(acquire.ms / query.ms).toBeGreaterThan(100);

    // And the database side is explicitly healthy, so the query is exonerated.
    const healthy = investigation.evidence.find((e) => e.id === "query-execution-healthy");
    expect(healthy?.isKeyEvidence).toBe(true);
  });

  it("covers the error path explicitly in code and in verification", () => {
    const investigation = getInvestigation(id)!;
    const flagged = investigation.code.lines.filter(
      (l) => l.evidenceId === "early-return-skips-release",
    );
    expect(flagged.length).toBeGreaterThanOrEqual(3);
    expect(flagged.some((l) => /NotFoundError/.test(l.text))).toBe(true);
    expect(flagged.some((l) => /release\(\)/.test(l.text))).toBe(true);

    const checks = getVerification(id)!.checks.map((c) => c.id);
    expect(checks).toContain("error-path-covered");
    expect(checks).toContain("release-on-every-path");
  });

  it("does not teach a bigger pool as the answer", () => {
    const bigger = optionById(id, "increase-pool-size");
    expect(bigger.resolvesRootCause).toBe(false);
    // A leak drains any ceiling; a larger one only delays exhaustion.
    expect(bigger.explanation.join(" ")).toMatch(/postpones|never returned|leak/i);

    for (const wrong of [
      "increase-request-timeout",
      "add-more-api-instances",
      "retry-connection-acquisition",
      "optimize-the-item-query",
    ]) {
      expect(optionById(id, wrong).resolvesRootCause).toBe(false);
    }
  });

  it("resolves only with a guaranteed release and a bounded wait", () => {
    const fix = getFix(id)!;
    expect(fix.correctFixId).toBe("release-connections-in-finally-and-bound-pool-waits");
    const resolving = optionById(id, fix.correctFixId);
    expect(resolving.resolvesRootCause).toBe(true);
    expect(resolving.codeExample).toMatch(/finally/);
    expect(resolving.codeExample).toMatch(/release\(\)/);
    expect(resolving.codeExample).toMatch(/acquireTimeoutMs/);
  });

  it("drops pool wait while query duration stays where it was", () => {
    const config = getVerification(id)!;
    const wait = config.metrics.find((m) => m.id === "acquire-wait")!;
    const query = config.metrics.find((m) => m.id === "query-duration")!;
    expect(wait.before).toBe("4.8s");
    expect(wait.after).toBe("2ms");
    // The query was never the problem, so it must not be sold as the win.
    expect(query.before).toBe("18ms");
    expect(query.after).toBe("17ms");
    expect(query.deltaTone).toBe("neutral");

    const failed = resolveVerification(config, false);
    expect(failed.metrics.find((m) => m.id === "acquire-wait")!.after).toBe("4.8s");
  });
});

/* ---------------------------- The slow API incident ---------------------- */

describe("slow-api-incident blames the N+1 loop", () => {
  const id = "slow-api-incident";

  it("names the N+1 query loop", () => {
    const diagnosis = getDiagnosis(id)!;
    expect(diagnosis.correctRootCauseId).toBe("n-plus-one-query-loop");
    expect(diagnosis.rootCauses.length).toBeGreaterThanOrEqual(5);
    // The plausible alternatives the brief calls for are all offered.
    const ids = diagnosis.rootCauses.map((r) => r.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "missing-database-index",
        "connection-pool-exhaustion",
        "slow-external-api",
        "event-loop-blocking",
        "large-response-serialization",
      ]),
    );
  });

  it("shows repeated per-order queries that are each individually fast", () => {
    const investigation = getInvestigation(id)!;
    // Repetition is visible in the logs and in the trace.
    expect(
      investigation.logs.lines.filter((l) => l.evidenceId === "repeated-item-queries")
        .length,
    ).toBeGreaterThanOrEqual(3);
    expect(
      investigation.trace!.spans.filter(
        (s) => s.evidenceId === "repeated-spans-in-trace",
      ).length,
    ).toBeGreaterThanOrEqual(3);

    // And each one is fast, which is what rules out the index and the database.
    const fast = investigation.evidence.find((e) => e.id === "per-query-time-fast")!;
    expect(fast.isKeyEvidence).toBe(true);
    expect(fast.description).toMatch(/42ms/);
    expect(
      investigation.evidence.find((e) => e.id === "database-healthy")?.isKeyEvidence,
    ).toBe(false);
  });

  it("keeps its original investigation evidence intact", () => {
    const collectable = new Set(
      getInvestigation(id)!.evidence.map((e) => e.id),
    );
    for (const original of [
      "latency-spike",
      "repeated-item-queries",
      "query-inside-loop",
      "query-count-scales",
      "normal-cpu",
    ]) {
      expect(collectable.has(original)).toBe(true);
    }
    // And every diagnosis option is something the player can actually collect.
    for (const option of getDiagnosis(id)!.evidence) {
      expect(collectable.has(option.id)).toBe(true);
    }
  });

  it("does not mark unrestricted Promise.all() as resolving", () => {
    const parallel = optionById(id, "parallelize-with-promise-all");
    expect(parallel.resolvesRootCause).toBe(false);
    expect(parallel.explanation.join(" ")).toMatch(/pool|database load/i);
    // The query count is what matters, and it is unchanged.
    expect(parallel.explanation.join(" ")).toMatch(/49|count/i);

    for (const wrong of [
      "add-an-index-only",
      "increase-pool-size",
      "cache-the-endpoint",
      "increase-request-timeout",
    ]) {
      expect(optionById(id, wrong).resolvesRootCause).toBe(false);
    }
    expect(nonResolvingIds(id)).toHaveLength(5);
  });

  it("resolves only by fetching the related data in bulk", () => {
    const fix = getFix(id)!;
    expect(fix.correctFixId).toBe("bulk-fetch-related-data");
    const resolving = optionById(id, fix.correctFixId);
    expect(resolving.resolvesRootCause).toBe(true);
    expect(resolving.codeExample).toMatch(/In\(orderIds\)/);
    expect(resolving.codeExample).not.toMatch(/Promise\.all/);
  });

  it("drops query count and latency together, keeping the database healthy", () => {
    const config = getVerification(id)!;
    const queries = config.metrics.find((m) => m.id === "query-count")!;
    const latency = config.metrics.find((m) => m.id === "response-time")!;
    expect(queries.before).toBe("49");
    expect(queries.after).toBe("2");
    expect(latency.after).toBe("192ms");
    // Independent signals must not be sold as the improvement.
    const independent = config.checks.filter((c) => c.dependsOnFix === false).map((c) => c.id);
    expect(independent).toContain("pool-not-pressured");
    expect(independent).toContain("database-cpu-healthy");

    const failed = resolveVerification(config, false);
    expect(failed.metrics.find((m) => m.id === "query-count")!.after).toBe("49");
    expect(failed.unresolvedLogs.join(" ")).toMatch(/queries=49/);
  });

  it("leaves the future database mission non-playable and distinct", () => {
    const future = getMission("n-plus-one-carnage") as Mission;
    expect(chapterTrack(future.chapterId)).toBe("future");
    expect(missionAvailability(future)).toBe("coming-soon");
    expect(canStart(future)).toBe(false);
    expect(PLAYABLE_MISSION_IDS).not.toContain(future.id);
    expect(hasFullContent(future.id)).toBe(false);
  });
});

/* ------------------------------ MVP closure ------------------------------ */

describe("the Node.js MVP after Chapter 3", () => {
  it("derives 14 playable, 0 in development, 14 total", () => {
    const summary = playableSummary();
    expect(summary).toEqual({ playable: 14, inDevelopment: 0, total: 14 });
    // And none of those numbers is authored anywhere.
    expect(summary.playable).toBe(
      NODE_MISSIONS.filter((m) => hasFullContent(m.id)).length,
    );
    expect(summary.total).toBe(NODE_MISSIONS.length);
    expect(PLAYABLE_MISSION_IDS).toHaveLength(14);
  });

  it("marks Chapters 1 to 3 as the complete set and 4 to 5 as coming soon", () => {
    const done = NODE_MISSIONS.map((m) => m.id);
    for (const chapterId of [1, 2, 3]) {
      expect(chapterState(chapterId, viewWith(done))).toBe("complete");
    }
    for (const chapterId of [4, 5]) {
      expect(chapterState(chapterId, viewWith(done))).toBe("coming-soon");
    }
  });

  it("recommends through all 14 missions and then stops offering new work", () => {
    const seen: string[] = [];
    for (let i = 0; i < NODE_MISSIONS.length; i += 1) {
      const next = recommendedMission(viewWith(seen));
      expect(next).toBeDefined();
      expect(hasFullContent(next!.id)).toBe(true);
      seen.push(next!.id);
    }
    expect(seen).toEqual(NODE_MISSIONS.map((m) => m.id));
    expect(seen[seen.length - 1]).toBe("slow-api-incident");

    // Everything is finished: the recommendation is a replay, never a future
    // mission, and there is no next playable mission after the last one.
    const replay = recommendedMission(viewWith(seen));
    expect(replay).toBeDefined();
    expect(chapterTrack(replay!.chapterId)).toBe("nodejs");
    expect(nextMissionId("slow-api-incident", viewWith(seen))).toBeUndefined();
  });

  it("still prefers a started but unfinished mission", () => {
    const done = NODE_MISSIONS.filter((m) => m.id !== "connection-pool-exhaustion").map(
      (m) => m.id,
    );
    expect(
      recommendedMission(viewWith(done, ["connection-pool-exhaustion"]))?.id,
    ).toBe("connection-pool-exhaustion");
  });

  it("validates with zero errors and zero warnings", () => {
    const report = validateMissions();
    expect(report.errors).toEqual([]);
    expect(report.warnings).toEqual([]);
    expect(report.playableMissionIds).toHaveLength(14);
    expect(report.ok).toBe(true);
  });
});

/* --------------------------- Playing it through -------------------------- */

describe("playing Chapter 3 through", () => {
  beforeEach(installStorage);
  afterEach(uninstallStorage);

  it("credits every mission and completes the chapter", () => {
    let ledger = EMPTY_LEDGER;
    let expectedXp = 0;

    for (const mission of CHAPTER_THREE) {
      play(mission.id);
      const collected = collectResults(mission.id, ledger);
      expect(collected.grade.score).toBe(100);
      expect(collected.grade.resolved).toBe(true);

      ledger = collected.ledger;
      expectedXp += mission.xp;
      expect(ledger.totalXp).toBe(expectedXp);
    }

    expect(chapterState(3, { ledger, startedMissionIds: [] })).toBe("complete");
  });

  it("leaves the queue backlog open when more workers are the chosen fix", () => {
    const id = "worker-queue-backlog";
    play(id, { correctFix: false });
    // The harness picks the first non-resolving fix, which is the scaling one.
    const state = JSON.parse(
      window.localStorage.getItem(`coderaid:${id}:fix`) as string,
    ) as { fixId: string };
    expect(state.fixId).toBe("double-the-worker-count");

    const { grade } = collectResults(id, EMPTY_LEDGER);
    expect(grade.resolved).toBe(false);
    expect(grade.rootCauseCorrect).toBe(true); // right diagnosis, wrong remedy
    expect(grade.score).toBeLessThan(100);

    const report = resolveVerification(getVerification(id)!, false);
    expect(report.metrics.find((m) => m.id === "queue-depth")!.after).toBe("184,012");
    expect(report.metrics.find((m) => m.id === "provider-429-rate")!.after).toBe("61%");
    expect(report.checks.filter((c) => c.dependsOnFix !== false).every((c) => !c.passed)).toBe(
      true,
    );
  });
});

/* ------------------ Progression and achievement attainability ------------ */

/**
 * A documented audit rather than a set of thresholds to tune. These assertions
 * pin down what the *current* content makes reachable, so a later change to
 * mission XP, skill wiring or rank thresholds shows up here as a deliberate
 * decision instead of a silent drift.
 */
describe("progression reachable from perfect completion", () => {
  const MAX_MISSION_XP = NODE_MISSIONS.reduce((sum, m) => sum + m.xp, 0);

  /** Skill XP a player would hold after a perfect run of every mission. */
  function perfectSkillXp(): Record<string, number> {
    const xp: Record<string, number> = {};
    for (const mission of NODE_MISSIONS) {
      const { primary, supporting } = missionSkillIds(mission);
      if (primary) xp[primary] = (xp[primary] ?? 0) + mission.xp;
      for (const skillId of supporting) {
        xp[skillId] = (xp[skillId] ?? 0) + Math.round(mission.xp * 0.4);
      }
    }
    return xp;
  }

  it("tops out at 1,830 XP and player level 6", () => {
    expect(MAX_MISSION_XP).toBe(1830);
    expect(levelFromXp(MAX_MISSION_XP)).toBe(6);
  });

  it("reaches Backend Apprentice but not the ranks above it", () => {
    const reachable = CAREER_RANKS.filter((r) => MAX_MISSION_XP >= r.minXp).map(
      (r) => r.name,
    );
    expect(reachable).toEqual(["Node.js Explorer", "Backend Apprentice"]);
    // Documented, not lowered: the Backend Engineer rank needs 10,000 XP and
    // the whole catalogue is worth 1,830. More missions, not a smaller number.
    expect(CAREER_RANKS.find((r) => r.name === "Backend Engineer")!.minXp).toBe(10_000);
    expect(MAX_MISSION_XP).toBeLessThan(10_000);
  });

  it("takes eight skills to the level cap and leaves two unstarted", () => {
    const xp = perfectSkillXp();
    const atCap = SKILL_DEFS.filter((s) => skillLevelFromXp(xp[s.id] ?? 0) === 10);
    expect(atCap.length).toBeGreaterThanOrEqual(8);

    // Nothing exercises these yet — a content gap, stated rather than hidden.
    expect(xp["streams"] ?? 0).toBe(0);
    expect(xp["validation"] ?? 0).toBe(0);
  });

  it("makes the async and debugging skill achievements reachable, but not Event Loop", () => {
    const xp = perfectSkillXp();
    expect(skillLevelFromXp(xp["root-cause-analysis"])).toBeGreaterThanOrEqual(7);
    expect(skillLevelFromXp(xp["async-javascript"])).toBeGreaterThanOrEqual(7);
    // event-loop is the primary reward of exactly one 80 XP mission, so level 7
    // (280 XP) cannot be reached from current content.
    expect(skillLevelFromXp(xp["event-loop"])).toBeLessThan(7);
  });

  it("leaves only the XP-gated and time-gated achievements out of reach", () => {
    const ledger: Ledger = {
      ...EMPTY_LEDGER,
      totalXp: MAX_MISSION_XP,
      skillXp: perfectSkillXp(),
      missions: Object.fromEntries(
        NODE_MISSIONS.map((m) => [m.id, { ...record(m.id), xpEarned: m.xp }]),
      ),
      activeDays: [],
    };
    const unlocked = new Set(
      getAchievements(achievementSources(ledger))
        .filter((a) => a.unlocked)
        .map((a) => a.id),
    );

    for (const id of [
      "first-mission",
      "ten-missions",
      "chapter-one-cleared",
      "debugging-specialist",
      "async-expert",
      "perfect-diagnosis",
      "zero-hints-used",
      "production-incident-master",
    ]) {
      expect(unlocked, `${id} should be reachable`).toContain(id);
    }

    // Not reachable from content alone: streaks need real days, the rank needs
    // 10,000 XP, and Event Loop has a single mission behind it.
    for (const id of [
      "seven-day-streak",
      "thirty-day-streak",
      "backend-engineer-rank",
      "event-loop-master",
    ]) {
      expect(unlocked, `${id} should not be reachable yet`).not.toContain(id);
    }
  });
});
