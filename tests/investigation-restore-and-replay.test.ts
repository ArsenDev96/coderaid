import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getInvestigation,
  investigationStorageKey,
  keyEvidence,
  loadInvestigationState,
  saveInvestigationState,
} from "@/lib/investigation";
import { loadGrade } from "@/lib/grade-submission";
import {
  clearInvestigationOnward,
  clearMissionWorkingState,
  creditStorageKey,
  diagnosisStorageKey,
  fixStorageKey,
  gradeStorageKey,
  resultsStorageKey,
  runStorageKey,
  verificationStorageKey,
} from "@/lib/mission-storage";
import { loadRun } from "@/lib/run";
import { resumeFor } from "@/components/missions/map/useMissionResume";
import { installStorage, play, uninstallStorage } from "./helpers/mission-run";

/**
 * The two investigation-state defects.
 *
 * **Restored progress appeared without explanation.** Opening a mission with
 * saved work showed evidence already marked Collected. The restore itself is
 * right; being silent about it is not, because the player cannot tell their own
 * earlier work from something the game did for them.
 *
 * **A replay reused the previous attempt's state.** "Run It Again" was a plain
 * link to the briefing, so the second attempt opened on the first one's
 * evidence, confirmed diagnosis, applied fix and running clock. It was a
 * navigation, not a new attempt.
 *
 * The workspace is a React component and these are Node tests, so what is
 * covered here is the storage contract both behaviours rest on: exactly which
 * keys each action clears, what it deliberately keeps, and what a reload sees
 * afterwards.
 */

const MISSION = "event-loop-overload";
const OTHER = "promise-all-cascade";

/** Every per-mission slot, so a sweep can be asserted exhaustively. */
const ALL_SLOTS = (missionId: string) => ({
  investigation: investigationStorageKey(missionId),
  diagnosis: diagnosisStorageKey(missionId),
  fix: fixStorageKey(missionId),
  verification: verificationStorageKey(missionId),
  results: resultsStorageKey(missionId),
  grade: gradeStorageKey(missionId),
  credit: creditStorageKey(missionId),
  run: runStorageKey(missionId),
});

const present = (key: string) => window.localStorage.getItem(key) !== null;

beforeEach(() => installStorage());
afterEach(() => uninstallStorage());

/* ------------------------- Restored investigation ----------------------- */

describe("what the workspace knows on mount", () => {
  it("reports the real number of previously collected findings", () => {
    const investigation = getInvestigation(MISSION)!;
    const collected = investigation.evidence.slice(0, 4).map((e) => e.id);
    saveInvestigationState(MISSION, {
      activeTool: investigation.tools[1],
      collectedEvidenceIds: collected,
    });

    // What the effect reads to decide whether to show the notice, and with
    // what count. A placeholder here would be worse than no notice at all.
    const restored = loadInvestigationState(MISSION, investigation.tools)!;
    expect(restored.collectedEvidenceIds).toHaveLength(4);
    expect(restored.activeTool).toBe(investigation.tools[1]);
  });

  it("counts nothing for a mission that was never opened", () => {
    expect(loadInvestigationState(MISSION, getInvestigation(MISSION)!.tools)).toBeNull();
  });

  it("does not count findings that no longer exist in the mission", () => {
    // The workspace filters restored ids through `findEvidence` before counting,
    // so a renamed finding cannot inflate the notice.
    const investigation = getInvestigation(MISSION)!;
    saveInvestigationState(MISSION, {
      activeTool: investigation.tools[0],
      collectedEvidenceIds: [investigation.evidence[0].id, "deleted-in-a-later-edit"],
    });

    const restored = loadInvestigationState(MISSION, investigation.tools)!;
    const real = restored.collectedEvidenceIds.filter((id) =>
      investigation.evidence.some((e) => e.id === id),
    );
    expect(restored.collectedEvidenceIds).toHaveLength(2);
    expect(real).toHaveLength(1);
  });
});

/* ---------------------- Restart Investigation clears -------------------- */

describe("clearInvestigationOnward", () => {
  it("clears the evidence and everything built on top of it", () => {
    play(MISSION);
    const slots = ALL_SLOTS(MISSION);

    clearInvestigationOnward(MISSION);

    for (const slot of [
      slots.investigation,
      slots.diagnosis,
      slots.fix,
      slots.verification,
      slots.results,
      slots.grade,
      slots.credit,
    ]) {
      expect(present(slot)).toBe(false);
    }
  });

  it("keeps the run clock, because re-reading the logs is not a new attempt", () => {
    play(MISSION);
    const before = window.localStorage.getItem(runStorageKey(MISSION));

    clearInvestigationOnward(MISSION);

    expect(window.localStorage.getItem(runStorageKey(MISSION))).toBe(before);
    expect(loadRun(MISSION)).not.toBeNull();
  });

  it("sends the mission back to its investigation, not to a confirmed diagnosis", () => {
    play(MISSION);
    expect(resumeFor(MISSION).stage).toBe("Complete");

    clearInvestigationOnward(MISSION);

    // The run survives, so the honest resume point is the investigation itself.
    const resume = resumeFor(MISSION);
    expect(resume.stage).toBe("Investigation");
    expect(resume.cluesFound).toBe(0);
    expect(resume.started).toBe(true);
  });

  it("touches only the mission it was given", () => {
    play(MISSION);
    play(OTHER);

    clearInvestigationOnward(MISSION);

    expect(present(investigationStorageKey(MISSION))).toBe(false);
    expect(present(investigationStorageKey(OTHER))).toBe(true);
    expect(present(diagnosisStorageKey(OTHER))).toBe(true);
  });
});

/* ------------------------------- Replay --------------------------------- */

describe("clearMissionWorkingState — what Run It Again does", () => {
  it("clears every one of this mission's local slots", () => {
    play(MISSION);
    const slots = ALL_SLOTS(MISSION);
    // Sanity: the attempt really did write all of them worth checking.
    expect(present(slots.investigation)).toBe(true);
    expect(present(slots.run)).toBe(true);

    clearMissionWorkingState(MISSION);

    for (const [name, key] of Object.entries(slots)) {
      expect(present(key), `${name} should be cleared`).toBe(false);
    }
  });

  it("clears the run clock, unlike restarting the investigation", () => {
    // This is the difference between the two: a replay is a fresh attempt, so
    // it is timed from zero and its hint count starts empty.
    play(MISSION, { hints: ["diagnosis"] });
    expect(loadRun(MISSION)?.hintsUsed).toEqual(["diagnosis"]);

    clearMissionWorkingState(MISSION);

    expect(loadRun(MISSION)).toBeNull();
  });

  it("puts the mission back at its briefing", () => {
    play(MISSION);
    clearMissionWorkingState(MISSION);

    const resume = resumeFor(MISSION);
    expect(resume.stage).toBe("Briefing");
    expect(resume.started).toBe(false);
    expect(resume.cluesFound).toBe(0);
  });

  it("leaves nothing for the investigation to restore", () => {
    play(MISSION);
    clearMissionWorkingState(MISSION);

    const investigation = getInvestigation(MISSION)!;
    expect(loadInvestigationState(MISSION, investigation.tools)).toBeNull();
    // Which is what makes the second attempt's rows selectable again rather
    // than already collected.
    expect(keyEvidence(investigation).length).toBeGreaterThan(0);
  });

  it("does not resurrect the previous attempt's verdict", () => {
    play(MISSION);
    clearMissionWorkingState(MISSION);

    expect(loadGrade(MISSION)).toBeNull();
  });

  it("touches only the mission it was given", () => {
    play(MISSION);
    play(OTHER);
    // Whatever the other mission had written, all of it survives.
    const survivors = Object.values(ALL_SLOTS(OTHER)).filter(present);
    expect(survivors.length).toBeGreaterThan(0);

    clearMissionWorkingState(MISSION);

    for (const key of survivors) expect(present(key)).toBe(true);
    expect(Object.values(ALL_SLOTS(MISSION)).filter(present)).toEqual([]);
  });

  it("is safe on a mission that was never played", () => {
    expect(() => clearMissionWorkingState("never-opened")).not.toThrow();
  });
});

/* --------------------------- Key-name agreement ------------------------- */

describe("the per-mission key namespace", () => {
  it("is the one both lib/run.ts and lib/investigation.ts use", () => {
    // Both re-export from `lib/mission-storage.ts` rather than rebuilding the
    // string, which is what makes the sweep above exhaustive.
    expect(runStorageKey(MISSION)).toBe(`coderaid:${MISSION}:run`);
    expect(investigationStorageKey(MISSION)).toBe(`coderaid:${MISSION}:investigation`);
  });

  it("covers exactly the slots a played mission writes", () => {
    play(MISSION);
    const known = new Set(Object.values(ALL_SLOTS(MISSION)));
    const written: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i)!;
      if (key.startsWith(`coderaid:${MISSION}:`)) written.push(key);
    }

    // A stage that invents a new slot without naming it in mission-storage.ts
    // would survive both clears above. This is what catches that.
    expect(written.filter((k) => !known.has(k))).toEqual([]);
  });
});
