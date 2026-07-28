/**
 * A cached grade must never outlive the answers it describes.
 *
 * The reproduction this file exists for: run verification with a wrong fix,
 * receive a correct unresolved verdict, go back, pick the *right* fix, and
 * verify again — and be shown the previous run's report. Unchanged event-loop
 * lag, unchanged API latency, failed checks, the old verdict. The player did
 * the incident correctly and the screen told them they hadn't.
 *
 * The cache is keyed by mission, and a mission has exactly one entry however
 * many times it is replayed, so the entry had no way to say which attempt it
 * belonged to. It does now, and these tests hold that property.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { saveDiagnosisState } from "@/lib/diagnosis";
import { getFix, saveFixState } from "@/lib/fix";
import {
  clearGradedRun,
  gradeStorageKey,
  loadCredit,
  loadGrade,
  NO_ANSWERS,
  sameAnswers,
  saveCredit,
  saveGrade,
  storedAnswers,
} from "@/lib/grade-submission";
import type { MissionGrade } from "@/lib/grading";
import { NO_CREDIT } from "@/lib/progress";
import { answersFor } from "@/lib/server/answers";
import { loadVerificationState } from "@/lib/verification";
import { installStorage, play, uninstallStorage } from "./helpers/mission-run";

const MISSION = "event-loop-overload";

/** A grade shaped like the server's, with only the fields the UI reads set. */
function gradeStub(resolved: boolean): MissionGrade {
  return {
    missionId: MISSION,
    score: resolved ? 100 : 35,
    resolved,
    rootCauseCorrect: true,
    fixCorrect: resolved,
    evidenceHits: 5,
    evidenceTotal: 5,
    evidenceMisses: 0,
    hintsUsed: 0,
    durationMs: 60_000,
    stepsCompleted: 6,
    totalSteps: 6,
    xpEarned: resolved ? 80 : 28,
    breakdown: [],
  };
}

/**
 * What `VerificationWorkspace` does on mount. "Done" needs a grade that still
 * describes the saved answers — a local completed flag alone is not enough.
 */
function verificationMount(missionId: string) {
  const grade = loadGrade(missionId);
  const saved = loadVerificationState(missionId);
  return grade && saved?.completed
    ? { phase: "done" as const, fixResolves: grade.resolved }
    : { phase: "idle" as const, fixResolves: false };
}

beforeEach(() => {
  installStorage();
});
afterEach(() => {
  uninstallStorage();
});

describe("the answers a grade describes", () => {
  it("reads nothing as an empty set rather than throwing", () => {
    expect(storedAnswers(MISSION)).toEqual(NO_ANSWERS);
  });

  it("fingerprints the saved diagnosis and fix", () => {
    play(MISSION);
    const answers = answersFor(MISSION)!;
    const stored = storedAnswers(MISSION);

    expect(stored.rootCauseId).toBe(answers.rootCauseId);
    expect(stored.fixId).toBe(answers.fixId);
    expect(stored.fixApplied).toBe(true);
    expect(stored.evidenceIds).toEqual([...answers.evidenceIds].sort());
  });

  it("treats the same evidence in a different order as unchanged", () => {
    play(MISSION);
    const before = storedAnswers(MISSION);

    saveDiagnosisState(MISSION, {
      rootCauseId: before.rootCauseId,
      evidenceIds: [...before.evidenceIds].reverse(),
      confirmed: true,
    });

    expect(sameAnswers(before, storedAnswers(MISSION))).toBe(true);
  });

  it("treats a different fix, or an unapplied one, as a change", () => {
    play(MISSION);
    const before = storedAnswers(MISSION);
    const other = getFix(MISSION)!.options.find((o) => o.id !== before.fixId)!;

    saveFixState(MISSION, { fixId: other.id, applied: true });
    expect(sameAnswers(before, storedAnswers(MISSION))).toBe(false);

    saveFixState(MISSION, { fixId: before.fixId, applied: false });
    expect(sameAnswers(before, storedAnswers(MISSION))).toBe(false);
  });
});

describe("the cached verdict", () => {
  it("is returned while it still describes the saved answers", () => {
    play(MISSION);
    saveGrade(MISSION, gradeStub(true), storedAnswers(MISSION));

    expect(loadGrade(MISSION)?.resolved).toBe(true);
  });

  it("is refused once the fix changes, and returned again if it changes back", () => {
    play(MISSION, { correctFix: false });
    const wrongFixId = storedAnswers(MISSION).fixId;
    saveGrade(MISSION, gradeStub(false), storedAnswers(MISSION));
    expect(loadGrade(MISSION)).not.toBeNull();

    const answers = answersFor(MISSION)!;
    saveFixState(MISSION, { fixId: answers.fixId, applied: true });
    expect(loadGrade(MISSION)).toBeNull();

    // Reverting is not a new attempt: the cached verdict is true of these
    // answers again, and re-grading would only produce the same one.
    saveFixState(MISSION, { fixId: wrongFixId, applied: true });
    expect(loadGrade(MISSION)?.resolved).toBe(false);
  });

  it("is refused once the diagnosis changes", () => {
    play(MISSION);
    saveGrade(MISSION, gradeStub(true), storedAnswers(MISSION));

    const stored = storedAnswers(MISSION);
    saveDiagnosisState(MISSION, {
      rootCauseId: stored.rootCauseId,
      evidenceIds: stored.evidenceIds.slice(1),
      confirmed: true,
    });

    expect(loadGrade(MISSION)).toBeNull();
  });

  it("refuses a cache written before grades carried their answers", () => {
    play(MISSION);
    // The shape the old `saveGrade` wrote: a bare grade, with no way to prove
    // which attempt it belongs to.
    window.localStorage.setItem(
      gradeStorageKey(MISSION),
      JSON.stringify(gradeStub(false)),
    );

    expect(loadGrade(MISSION)).toBeNull();
  });

  it("refuses a truncated or hand-edited cache", () => {
    play(MISSION);
    window.localStorage.setItem(gradeStorageKey(MISSION), "{\"grade\":{\"score\":100");
    expect(loadGrade(MISSION)).toBeNull();

    window.localStorage.setItem(
      gradeStorageKey(MISSION),
      JSON.stringify({ grade: { score: 100 }, answers: storedAnswers(MISSION) }),
    );
    expect(loadGrade(MISSION)).toBeNull();
  });

  it("takes the credit with it when cleared", () => {
    play(MISSION);
    saveGrade(MISSION, gradeStub(true), storedAnswers(MISSION));
    saveCredit(MISSION, { ...NO_CREDIT, xpAdded: 80 });
    expect(loadCredit(MISSION)?.xpAdded).toBe(80);

    clearGradedRun(MISSION);

    expect(loadGrade(MISSION)).toBeNull();
    expect(loadCredit(MISSION)).toBeNull();
  });
});

describe("the reported reproduction", () => {
  it("does not show the wrong fix's verdict after the correct fix is chosen", () => {
    // 1-4: play it with the wrong fix and be told, correctly, that it failed.
    play(MISSION, { correctFix: false });
    saveGrade(MISSION, gradeStub(false), storedAnswers(MISSION));
    saveCredit(MISSION, { ...NO_CREDIT, xpAdded: 28 });

    const failed = verificationMount(MISSION);
    expect(failed.phase).toBe("done");
    expect(failed.fixResolves).toBe(false);

    // 5-7: back to the Fix stage, pick the fix that actually moves the
    // aggregation off the event loop, apply it.
    const answers = answersFor(MISSION)!;
    expect(answers.fixId).toBe("move-report-generation-to-worker-thread");
    saveFixState(MISSION, { fixId: answers.fixId, applied: true });

    // 8: verification again. The previous unresolved report is not what this
    // attempt is, so the screen offers the run rather than the old verdict —
    // which is what makes the second run a measurement instead of a replay of
    // the first one's conclusion.
    const again = verificationMount(MISSION);
    expect(again.phase).toBe("idle");
    expect(again.fixResolves).toBe(false);
    expect(loadGrade(MISSION)).toBeNull();
  });

  it("leaves the results screen with nothing to report rather than the old score", () => {
    play(MISSION, { correctFix: false });
    saveGrade(MISSION, gradeStub(false), storedAnswers(MISSION));

    const answers = answersFor(MISSION)!;
    saveFixState(MISSION, { fixId: answers.fixId, applied: true });

    // `ResultsWorkspace` reads exactly this, and renders "this run hasn't been
    // graded yet" when it comes back null — reachable here because a mission
    // already in the ledger opens every stage gate for review and replay.
    expect(loadGrade(MISSION)).toBeNull();
  });

  it("does not carry `applied` from one fix option to the next", () => {
    // The other half of the defect: `applied` survived a change of selection,
    // so a newly picked option arrived at verification already marked applied
    // — a fix the player never applied, about to be graded as if they had.
    play(MISSION, { correctFix: false });
    const other = getFix(MISSION)!.options.find(
      (o) => o.id !== storedAnswers(MISSION).fixId,
    )!;

    // What `FixWorkspace.selectFix` now writes on a change of selection.
    saveFixState(MISSION, { fixId: other.id, applied: false });
    clearGradedRun(MISSION);

    const stored = storedAnswers(MISSION);
    expect(stored.fixId).toBe(other.id);
    expect(stored.fixApplied).toBe(false);
  });
});
