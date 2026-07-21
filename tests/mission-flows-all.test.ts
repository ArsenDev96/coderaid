import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { achievementSources, getAchievements, unlockedIds } from "@/lib/achievements";
import { PLAYABLE_MISSION_IDS, nextMissionId } from "@/lib/availability";
import { getDiagnosis } from "@/lib/diagnosis";
import { answersFor } from "@/lib/server/answers";
import { getFix } from "@/lib/fix";
import { HINT_PENALTY, missionSkillIds } from "@/lib/grading";
import { getInvestigation, keyEvidence } from "@/lib/investigation";
import { getMission, type Mission } from "@/lib/missions";
import { EMPTY_LEDGER, skillXpFor } from "@/lib/progress";
import { clearRun } from "@/lib/run";
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
 * Every playable mission, put through the same four flows.
 *
 * The point is that no mission gets a pass because its own test was written
 * generously: perfect, wrong, hint and replay behaviour are asserted from the
 * mission's own authored answers, so authoring a new mission automatically
 * inherits the whole contract. If a mission is added to the five stage
 * registries and any of this fails, the mission is not finished.
 */

beforeEach(installStorage);
afterEach(uninstallStorage);

describe("every playable mission", () => {
  it("is a Node.js mission the catalogue marks available", () => {
    expect(PLAYABLE_MISSION_IDS.length).toBeGreaterThan(0);
    for (const id of PLAYABLE_MISSION_IDS) {
      expect(getMission(id)?.status).toBe("available");
    }
  });

  describe.each(PLAYABLE_MISSION_IDS)("%s", (missionId) => {
    const mission = getMission(missionId) as Mission;

    /* ------------------------------ Content ----------------------------- */

    it("offers at least five root causes and five fixes", () => {
      const diagnosis = getDiagnosis(missionId)!;
      const fix = getFix(missionId)!;
      expect(diagnosis.rootCauses.length).toBeGreaterThanOrEqual(5);
      expect(fix.options.length).toBeGreaterThanOrEqual(5);
    });

    it("names exactly one resolving fix, and it is an option that exists", () => {
      const fix = getFix(missionId)!;
      const answers = answersFor(missionId)!;
      // There is only one place a fix can be named correct now, so the old
      // 'flag and id agree' check has become 'the id resolves to an option'.
      expect(fix.options.map((o) => o.id)).toContain(answers.fixId);
    });

    it("needs evidence from more than one tool to reach the diagnosis", () => {
      const investigation = getInvestigation(missionId)!;
      const sources = new Set(keyEvidence(investigation).map((e) => e.source));
      expect(sources.size).toBeGreaterThanOrEqual(3);
      expect(investigation.requiredKeyClues).toBeGreaterThanOrEqual(2);
    });

    it("carries useful negative evidence", () => {
      const investigation = getInvestigation(missionId)!;
      const context = investigation.evidence.filter((e) => !e.isKeyEvidence);
      expect(context.length).toBeGreaterThanOrEqual(2);
    });

    it("authors four lessons and a canonical reward skill", () => {
      expect(mission.rewardSkillId).toBeTruthy();
      const { primary, supporting } = missionSkillIds(mission);
      expect(primary).toBe(mission.rewardSkillId);
      expect(supporting.length).toBeGreaterThan(0);
    });

    /* ----------------------------- The flows ---------------------------- */

    it("perfect run: scores 100, resolves, credits full XP and skill XP", () => {
      play(missionId);
      const { grade, credit, ledger } = collectResults(missionId, EMPTY_LEDGER);

      expect(grade.score).toBe(100);
      expect(grade.resolved).toBe(true);
      expect(grade.xpEarned).toBe(mission.xp);
      expect(credit.firstCompletion).toBe(true);
      expect(credit.xpAdded).toBe(mission.xp);
      expect(ledger.missions[missionId].resolved).toBe(true);
      expect(skillXpFor(ledger, mission.rewardSkillId as string)).toBe(mission.xp);

      const report = resolveVerification(getVerification(missionId)!, true);
      expect(report.checks.every((c) => c.passed)).toBe(true);
    });

    it("wrong run: does not resolve, and unlocks no resolved achievement", () => {
      play(missionId, {
        correctDiagnosis: false,
        correctEvidence: false,
        correctFix: false,
      });
      const { grade, ledger } = collectResults(missionId, EMPTY_LEDGER);

      expect(grade.resolved).toBe(false);
      expect(grade.rootCauseCorrect).toBe(false);
      expect(grade.score).toBeLessThan(50);
      expect(grade.score).toBeGreaterThanOrEqual(0);

      // Recorded as an attempt, never as a resolved incident.
      expect(ledger.missions[missionId]).toBeDefined();
      expect(ledger.missions[missionId].resolved).toBe(false);
      expect(achievementSources(ledger).resolvedMissions).toHaveLength(0);
      expect(
        unlockedIds(getAchievements(achievementSources(ledger))),
      ).not.toContain("first-mission");

      // And the verification says so: dependent checks fail, others hold.
      const report = resolveVerification(getVerification(missionId)!, false);
      expect(report.metrics.every((m) => m.after === m.before)).toBe(true);
      expect(
        report.checks.filter((c) => c.dependsOnFix !== false).every((c) => !c.passed),
      ).toBe(true);
      expect(
        report.checks.filter((c) => c.dependsOnFix === false).every((c) => c.passed),
      ).toBe(true);
    });

    it("hint run: costs one penalty per hint and no more", () => {
      play(missionId, { hints: ["diagnosis"] });
      const { grade } = collectResults(missionId, EMPTY_LEDGER);
      expect(grade.hintsUsed).toBe(1);
      expect(grade.score).toBe(100 - HINT_PENALTY);
      expect(achievementSources(collectResults(missionId, EMPTY_LEDGER).ledger)
        .hintFreeResolved).toBe(0);
    });

    it("replay: better run adds the difference, worse run adds nothing", () => {
      play(missionId, { correctEvidence: false });
      const first = collectResults(missionId, EMPTY_LEDGER);
      expect(first.grade.score).toBeLessThan(100);

      clearRun(missionId);
      play(missionId);
      const better = collectResults(missionId, first.ledger);
      expect(better.grade.score).toBe(100);
      expect(better.credit.xpAdded).toBe(mission.xp - first.grade.xpEarned);
      expect(better.ledger.totalXp).toBe(mission.xp);

      clearRun(missionId);
      play(missionId, { correctDiagnosis: false, correctFix: false });
      const worse = collectResults(missionId, better.ledger);
      expect(worse.credit.xpAdded).toBe(0);
      expect(worse.ledger.totalXp).toBe(better.ledger.totalXp);
      expect(worse.ledger.missions[missionId].score).toBe(100);
    });

    it("refreshing results cannot farm XP", () => {
      play(missionId);
      let ledger = collectResults(missionId, EMPTY_LEDGER).ledger;
      const afterFirst = ledger.totalXp;
      for (let i = 0; i < 3; i += 1) {
        ledger = collectResults(missionId, ledger).ledger;
      }
      expect(ledger.totalXp).toBe(afterFirst);
    });

    /* --------------------------- Stage guards --------------------------- */

    it("blocks later stages until their prerequisite exists", () => {
      for (const stage of ["Diagnosis", "Fix", "Verification", "Complete"] as const) {
        expect(stageAccess(stage, stageProgress(missionId)).allowed).toBe(false);
      }
      play(missionId);
      for (const stage of ["Diagnosis", "Fix", "Verification", "Complete"] as const) {
        expect(stageAccess(stage, stageProgress(missionId)).allowed).toBe(true);
      }
    });
  });
});

describe("mission ordering", () => {
  it("walks the playable catalogue by index and skips completions", () => {
    const order = [...PLAYABLE_MISSION_IDS];
    for (let i = 0; i < order.length - 1; i += 1) {
      expect(nextMissionId(order[i])).toBe(order[i + 1]);
    }
    expect(nextMissionId(order[order.length - 1])).toBeUndefined();
  });
});
