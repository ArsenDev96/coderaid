import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { achievementSources, unlockedIds } from "@/lib/achievements";
import { missionAvailability, nextMissionId } from "@/lib/availability";
import { skillRewardFor } from "@/lib/grading";
import { getMission, type Mission } from "@/lib/missions";
import { EMPTY_LEDGER, loadLedger, skillXpFor } from "@/lib/progress";
import { loadResultsState } from "@/lib/results";
import { clearRun, loadRun, recordHint, startedMissionIds } from "@/lib/run";
import { stageAccess } from "@/lib/stage-access";
import { getVerification, resolveVerification } from "@/lib/verification";
import {
  collectResults,
  installStorage,
  play,
  stageProgress,
  uninstallStorage,
} from "./helpers/mission-run";

/**
 * The four flows, followed end to end through the real modules for the
 * reference mission. `mission-flows-all.test.ts` runs the same shapes across
 * every playable mission; this file is the detailed walk-through.
 */

const MISSION_ID = "event-loop-overload";
const mission = getMission(MISSION_ID) as Mission;

beforeEach(installStorage);
afterEach(uninstallStorage);

describe("the perfect run", () => {
  it("scores 100, resolves the incident and credits the full reward", () => {
    play(MISSION_ID);
    const { grade, credit, ledger, achievements } = collectResults(
      MISSION_ID,
      EMPTY_LEDGER,
    );

    expect(grade.score).toBe(100);
    expect(grade.resolved).toBe(true);
    expect(grade.hintsUsed).toBe(0);
    expect(grade.xpEarned).toBe(mission.xp);

    expect(credit.firstCompletion).toBe(true);
    expect(credit.xpAdded).toBe(mission.xp);
    expect(ledger.totalXp).toBe(mission.xp);
    expect(ledger.missions[MISSION_ID].resolved).toBe(true);

    // Skill XP lands where the mission says it should.
    expect(skillXpFor(ledger, "event-loop")).toBe(mission.xp);
    for (const id of Object.keys(skillRewardFor(mission, grade))) {
      expect(skillXpFor(ledger, id)).toBeGreaterThan(0);
    }

    // Resolved-run achievements unlock; hint-free counts this run.
    const unlocked = unlockedIds(achievements);
    expect(unlocked).toContain("first-mission");
    expect(unlocked).toContain("perfect-diagnosis");
    expect(achievementSources(ledger).hintFreeResolved).toBe(1);
  });

  it("shows the mission as completed and points at the next one", () => {
    play(MISSION_ID);
    const { ledger } = collectResults(MISSION_ID, EMPTY_LEDGER);
    const view = { ledger, startedMissionIds: startedMissionIds() };

    expect(missionAvailability(mission, view)).toBe("completed");
    expect(nextMissionId(MISSION_ID, view)).toBe("promise-all-cascade");
  });

  it("reports improved metrics from the verification stage", () => {
    play(MISSION_ID);
    const config = getVerification(MISSION_ID)!;
    const report = resolveVerification(config, true);
    expect(report.checks.every((c) => c.passed)).toBe(true);
    expect(report.metrics.every((m) => m.after === m.before)).toBe(false);
  });
});

describe("the wrong run", () => {
  it("scores low, leaves the incident unresolved, and unlocks nothing resolved", () => {
    play(MISSION_ID, {
      correctDiagnosis: false,
      correctEvidence: false,
      correctFix: false,
    });
    const { grade, ledger, achievements } = collectResults(
      MISSION_ID,
      EMPTY_LEDGER,
    );

    expect(grade.rootCauseCorrect).toBe(false);
    expect(grade.resolved).toBe(false);
    expect(grade.score).toBeLessThan(50);
    expect(grade.score).toBeGreaterThanOrEqual(0);

    // The run is recorded — it happened — but not as a resolved incident.
    expect(ledger.missions[MISSION_ID]).toBeDefined();
    expect(ledger.missions[MISSION_ID].resolved).toBe(false);
    expect(achievementSources(ledger).resolvedMissions).toHaveLength(0);
    expect(unlockedIds(achievements)).not.toContain("first-mission");
    expect(unlockedIds(achievements)).not.toContain("perfect-diagnosis");
  });

  it("leaves verification metrics and dependent checks unimproved", () => {
    const config = getVerification(MISSION_ID)!;
    const report = resolveVerification(config, false);

    expect(report.metrics.every((m) => m.after === m.before)).toBe(true);
    expect(
      report.checks.filter((c) => c.dependsOnFix !== false).every((c) => !c.passed),
    ).toBe(true);
    expect(
      report.checks.filter((c) => c.dependsOnFix === false).every((c) => c.passed),
    ).toBe(true);
    expect(report.logs).toEqual(config.unresolvedLogs);
  });
});

describe("the hint run", () => {
  it("charges each hint exactly once, however often it is reopened", () => {
    play(MISSION_ID, { hints: ["diagnosis"] });
    // Re-opening the same hint, as the UI would on a second toggle.
    recordHint(MISSION_ID, "diagnosis");
    recordHint(MISSION_ID, "diagnosis");

    const { grade } = collectResults(MISSION_ID, EMPTY_LEDGER);
    expect(loadRun(MISSION_ID)?.hintsUsed).toEqual(["diagnosis"]);
    expect(grade.hintsUsed).toBe(1);
    expect(grade.score).toBe(95);
  });

  it("charges both hints when both are opened", () => {
    play(MISSION_ID, { hints: ["diagnosis", "fix"] });
    const { grade, ledger } = collectResults(MISSION_ID, EMPTY_LEDGER);
    expect(grade.score).toBe(90);
    expect(ledger.missions[MISSION_ID].hintsUsed).toBe(2);
    // A hinted run still resolved, but it isn't hint-free.
    expect(achievementSources(ledger).hintFreeResolved).toBe(0);
  });
});

describe("replay", () => {
  it("adds only the improvement when the replay scores higher", () => {
    play(MISSION_ID, { correctEvidence: false });
    const first = collectResults(MISSION_ID, EMPTY_LEDGER);
    expect(first.grade.score).toBeLessThan(100);

    clearRun(MISSION_ID);
    play(MISSION_ID);
    const second = collectResults(MISSION_ID, first.ledger);

    expect(second.grade.score).toBe(100);
    expect(second.credit.xpAdded).toBe(mission.xp - first.grade.xpEarned);
    expect(second.ledger.totalXp).toBe(mission.xp);
    expect(second.ledger.missions[MISSION_ID].attempts).toBe(2);
  });

  it("never reduces progress when the replay scores worse", () => {
    play(MISSION_ID);
    const best = collectResults(MISSION_ID, EMPTY_LEDGER);

    clearRun(MISSION_ID);
    play(MISSION_ID, { correctDiagnosis: false, correctFix: false });
    const worse = collectResults(MISSION_ID, best.ledger);

    expect(worse.credit.xpAdded).toBe(0);
    expect(worse.ledger.totalXp).toBe(best.ledger.totalXp);
    expect(worse.ledger.missions[MISSION_ID].score).toBe(100);
    expect(skillXpFor(worse.ledger, "event-loop")).toBe(
      skillXpFor(best.ledger, "event-loop"),
    );
  });

  it("cannot farm XP by refreshing the results screen", () => {
    play(MISSION_ID);
    let ledger = collectResults(MISSION_ID, EMPTY_LEDGER).ledger;
    const afterFirst = ledger.totalXp;

    for (let i = 0; i < 5; i += 1) {
      ledger = collectResults(MISSION_ID, ledger).ledger;
    }

    expect(ledger.totalXp).toBe(afterFirst);
    expect(loadLedger()).toEqual(ledger);
    expect(loadResultsState(MISSION_ID)?.claimed).toBe(true);
  });
});

describe("direct-route protection", () => {
  it("blocks every later stage for a player who has done nothing", () => {
    for (const stage of ["Diagnosis", "Fix", "Verification", "Complete"] as const) {
      expect(stageAccess(stage, stageProgress(MISSION_ID)).allowed).toBe(false);
    }
  });

  it("does not block replay of a completed mission", () => {
    play(MISSION_ID);
    collectResults(MISSION_ID, EMPTY_LEDGER);
    clearRun(MISSION_ID);
    for (const key of ["investigation", "diagnosis", "fix", "verification"]) {
      window.localStorage.removeItem(`coderaid:${MISSION_ID}:${key}`);
    }

    for (const stage of ["Diagnosis", "Fix", "Verification", "Complete"] as const) {
      expect(stageAccess(stage, stageProgress(MISSION_ID, true)).allowed).toBe(true);
    }
  });
});
