import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDiagnosis, loadDiagnosisState, saveDiagnosisState } from "@/lib/diagnosis";
import { getFix, saveFixState } from "@/lib/fix";
import { gradeMission, rewardFor, type MissionGrade } from "@/lib/grading";
import { getMission } from "@/lib/missions";
import { loadRun } from "@/lib/run";
import {
  loadCachedGrade,
  loadCredit,
  loadGrade,
  saveCredit,
  saveGrade,
} from "@/lib/grade-submission";
import {
  clearVerdict,
  creditStorageKey,
  currentSubmission,
  gradeStorageKey,
  resultsStorageKey,
  submissionMatches,
  verificationStorageKey,
} from "@/lib/mission-storage";
import { creditRun, EMPTY_LEDGER, type Ledger } from "@/lib/progress";
import { loadResultsState, saveResultsState } from "@/lib/results";
import { answersFor } from "@/lib/server/answers";
import { loadVerificationState, saveVerificationState } from "@/lib/verification";
import { installStorage, play, uninstallStorage } from "./helpers/mission-run";

/**
 * The stale-verdict bug.
 *
 * A player submitted a wrong fix, got an unresolved verification, went back to
 * the Fix stage and applied the correct one — and Verification kept showing the
 * old unresolved result, with Continue to Results already unlocked.
 *
 * The cause was that a cached grade said what the server decided but not what
 * it decided *about*. Changing the fix wrote `…:fix` and nothing else, leaving
 * `…:grade`, `…:credit`, `…:verification` and `…:results` describing the
 * abandoned fix. Verification restores "done" from a cached grade plus
 * `…:verification`, so it restored a verdict for a fix that was no longer
 * applied.
 *
 * These tests cover both halves of the fix: the eager `clearVerdict()` the
 * stage workspaces call on a changed answer, and the submission envelope that
 * makes a surviving cache detectable even if the clear never ran.
 */

const MISSION = "event-loop-overload";

/**
 * The grade the server would return for whatever is currently saved.
 *
 * Reads the same storage the route handler's inputs come from, so a test that
 * changes a fix and re-grades exercises the real relationship between the two.
 */
function gradeCurrent(missionId: string): MissionGrade {
  const submission = currentSubmission(missionId);
  return gradeMission({
    mission: getMission(missionId)!,
    answers: answersFor(missionId) ?? null,
    diagnosis: {
      config: getDiagnosis(missionId)!,
      state: {
        rootCauseId: submission.rootCauseId,
        evidenceIds: submission.evidenceIds,
        confirmed: true,
      },
    },
    fix: {
      config: getFix(missionId)!,
      state: { fixId: submission.fixId, applied: true },
    },
    run: loadRun(missionId),
  });
}

/** Everything `VerificationWorkspace` writes when a run comes back graded. */
function recordRun(missionId: string): MissionGrade {
  const submission = currentSubmission(missionId);
  const grade = gradeCurrent(missionId);
  saveGrade(missionId, grade, submission);
  saveCredit(missionId, {
    xpAdded: grade.xpEarned,
    skillXpAdded: {},
    firstCompletion: true,
  });
  saveVerificationState(missionId, { run: true, completed: true });
  return grade;
}

/** What the Verification screen decides on mount. */
function verificationShowsDone(missionId: string): boolean {
  return Boolean(loadGrade(missionId) && loadVerificationState(missionId)?.completed);
}

beforeEach(() => installStorage());
afterEach(() => uninstallStorage());

describe("the reported bug, end to end", () => {
  it("does not show the old unresolved verdict after the correct fix is applied", () => {
    const answers = answersFor(MISSION)!;
    const fix = getFix(MISSION)!;

    /* 1 — wrong fix, everything else right. */
    play(MISSION, { correctFix: false });
    const first = recordRun(MISSION);
    expect(first.resolved).toBe(false);
    expect(verificationShowsDone(MISSION)).toBe(true);

    /* 2 — back to Fix, select the correct option. This is what the workspace
       now does on a changed selection, and what it did not do before. */
    saveFixState(MISSION, { fixId: answers.fixId, applied: false });
    clearVerdict(MISSION);

    /* 3 — the old verdict is gone, in every place it was cached. */
    expect(loadGrade(MISSION)).toBeNull();
    expect(loadCredit(MISSION)).toBeNull();
    expect(loadVerificationState(MISSION)?.completed).not.toBe(true);
    expect(loadResultsState(MISSION)?.claimed).not.toBe(true);
    // The screen asks for a new run rather than restoring the failed one.
    expect(verificationShowsDone(MISSION)).toBe(false);

    /* 4 — apply and run verification again. */
    saveFixState(MISSION, { fixId: answers.fixId, applied: true });
    const second = recordRun(MISSION);

    /* 5 — the correct fix resolves, and that is what is shown. */
    expect(second.resolved).toBe(true);
    expect(loadGrade(MISSION)?.resolved).toBe(true);
    expect(verificationShowsDone(MISSION)).toBe(true);

    // Sanity: the two runs really are different verdicts on the same mission.
    expect(first.score).toBeLessThan(second.score);
    expect(fix.options.some((o) => o.id === answers.fixId)).toBe(true);
  });

  it("shows the latest verdict after a refresh, not the first one", () => {
    play(MISSION, { correctFix: false });
    recordRun(MISSION);

    saveFixState(MISSION, { fixId: answersFor(MISSION)!.fixId, applied: false });
    clearVerdict(MISSION);
    saveFixState(MISSION, { fixId: answersFor(MISSION)!.fixId, applied: true });
    recordRun(MISSION);

    // A refresh is exactly this: re-read everything from storage.
    expect(loadGrade(MISSION)?.resolved).toBe(true);
    expect(loadCachedGrade(MISSION)?.fixId).toBe(answersFor(MISSION)!.fixId);
    expect(verificationShowsDone(MISSION)).toBe(true);
  });

  it("keeps both attempts as valid server runs and takes the best", () => {
    // The client-side fix must not touch run history. Postgres keeps every
    // attempt and `best_runs` picks the winner — modelled here by the same
    // `creditRun` the ledger derivation uses.
    play(MISSION, { correctFix: false });
    const wrong = recordRun(MISSION);

    saveFixState(MISSION, { fixId: answersFor(MISSION)!.fixId, applied: true });
    clearVerdict(MISSION);
    const right = recordRun(MISSION);

    const mission = getMission(MISSION)!;
    let ledger: Ledger = EMPTY_LEDGER;
    ledger = creditRun(ledger, rewardFor(mission, wrong)).ledger;
    const afterWrong = ledger.totalXp;
    ledger = creditRun(ledger, rewardFor(mission, right)).ledger;

    const record = ledger.missions[MISSION];
    expect(record.attempts).toBe(2);
    expect(record.score).toBe(right.score);
    expect(record.resolved).toBe(true);
    expect(ledger.totalXp).toBeGreaterThan(afterWrong);
  });
});

describe("clearVerdict", () => {
  it("removes exactly the four downstream caches", () => {
    play(MISSION);
    recordRun(MISSION);
    saveResultsState(MISSION, { claimed: true, score: 100 });

    clearVerdict(MISSION);

    for (const key of [
      gradeStorageKey(MISSION),
      creditStorageKey(MISSION),
      verificationStorageKey(MISSION),
      resultsStorageKey(MISSION),
    ]) {
      expect(window.localStorage.getItem(key)).toBeNull();
    }
  });

  it("preserves the player's answers and run telemetry", () => {
    play(MISSION);
    recordRun(MISSION);

    const fixBefore = window.localStorage.getItem(`coderaid:${MISSION}:fix`);
    const diagnosisBefore = window.localStorage.getItem(`coderaid:${MISSION}:diagnosis`);
    const runBefore = window.localStorage.getItem(`coderaid:${MISSION}:run`);
    const investigationBefore = window.localStorage.getItem(
      `coderaid:${MISSION}:investigation`,
    );

    clearVerdict(MISSION);

    // Changing a fix is part of the mission, not a restart: the clock spans the
    // whole mission and the collected evidence is still the player's work.
    expect(window.localStorage.getItem(`coderaid:${MISSION}:fix`)).toBe(fixBefore);
    expect(window.localStorage.getItem(`coderaid:${MISSION}:diagnosis`)).toBe(diagnosisBefore);
    expect(window.localStorage.getItem(`coderaid:${MISSION}:run`)).toBe(runBefore);
    expect(window.localStorage.getItem(`coderaid:${MISSION}:investigation`)).toBe(
      investigationBefore,
    );
  });

  it("only touches the mission it was given", () => {
    play(MISSION);
    recordRun(MISSION);
    play("promise-all-cascade");
    recordRun("promise-all-cascade");

    clearVerdict(MISSION);

    expect(loadGrade(MISSION)).toBeNull();
    expect(loadGrade("promise-all-cascade")).not.toBeNull();
  });
});

describe("the cached grade carries its submission", () => {
  it("stores the mission, root cause, evidence and fix it graded", () => {
    play(MISSION);
    recordRun(MISSION);

    const cached = loadCachedGrade(MISSION)!;
    const answers = answersFor(MISSION)!;
    expect(cached.missionId).toBe(MISSION);
    expect(cached.fixId).toBe(answers.fixId);
    expect(cached.rootCauseId).toBe(answers.rootCauseId);
    expect([...cached.evidenceIds].sort()).toEqual([...answers.evidenceIds].sort());
  });

  it("is discarded when the fix changed, even if nothing cleared it", () => {
    // Belt and braces: the eager clear is the primary defence, this is what
    // catches a cache that survived it — a second tab, a devtools edit, or a
    // future code path that forgets to call `clearVerdict`.
    play(MISSION, { correctFix: false });
    recordRun(MISSION);
    expect(loadGrade(MISSION)).not.toBeNull();

    saveFixState(MISSION, { fixId: answersFor(MISSION)!.fixId, applied: true });

    expect(loadGrade(MISSION)).toBeNull();
    // The envelope is still on disk — it is the *read* that refuses it.
    expect(loadCachedGrade(MISSION)).not.toBeNull();
    expect(verificationShowsDone(MISSION)).toBe(false);
  });

  it("is discarded when the root cause changed", () => {
    play(MISSION);
    recordRun(MISSION);

    const diagnosis = getDiagnosis(MISSION)!;
    const saved = loadDiagnosisState(diagnosis)!;
    const other = diagnosis.rootCauses.find((c) => c.id !== saved.rootCauseId)!;
    saveDiagnosisState(MISSION, { ...saved, rootCauseId: other.id });

    expect(loadGrade(MISSION)).toBeNull();
  });

  it("is discarded when the evidence set changed", () => {
    play(MISSION);
    recordRun(MISSION);

    const diagnosis = getDiagnosis(MISSION)!;
    const saved = loadDiagnosisState(diagnosis)!;
    saveDiagnosisState(MISSION, {
      ...saved,
      evidenceIds: saved.evidenceIds.slice(0, -1),
    });

    expect(loadGrade(MISSION)).toBeNull();
  });

  it("survives merely re-ordering the same evidence", () => {
    // Re-ordering is not a different answer, and the server grades evidence as
    // a set. Discarding here would force a pointless re-run.
    play(MISSION);
    recordRun(MISSION);

    const diagnosis = getDiagnosis(MISSION)!;
    const saved = loadDiagnosisState(diagnosis)!;
    saveDiagnosisState(MISSION, {
      ...saved,
      evidenceIds: [...saved.evidenceIds].reverse(),
    });

    expect(loadGrade(MISSION)).not.toBeNull();
  });

  it("rejects a legacy cache written without a submission", () => {
    // Pre-fix caches are bare MissionGrade objects. There is no way to tell
    // which fix they describe, so they are treated as absent.
    play(MISSION);
    const grade = gradeCurrent(MISSION);
    window.localStorage.setItem(gradeStorageKey(MISSION), JSON.stringify(grade));
    saveVerificationState(MISSION, { run: true, completed: true });

    expect(loadGrade(MISSION)).toBeNull();
    expect(verificationShowsDone(MISSION)).toBe(false);
  });

  it("rejects a truncated or hand-edited cache", () => {
    play(MISSION);
    window.localStorage.setItem(gradeStorageKey(MISSION), "{\"missionId\":\"x\"");
    expect(loadGrade(MISSION)).toBeNull();
    window.localStorage.setItem(gradeStorageKey(MISSION), JSON.stringify({ nope: 1 }));
    expect(loadGrade(MISSION)).toBeNull();
  });
});

describe("re-selecting the fix that was already submitted", () => {
  it("does not show a verdict again until verification is re-run", () => {
    const answers = answersFor(MISSION)!;
    play(MISSION, { correctFix: false });
    recordRun(MISSION);

    // Change to the correct fix — the workspace clears the verdict.
    saveFixState(MISSION, { fixId: answers.fixId, applied: false });
    clearVerdict(MISSION);

    // Then change *back* to the fix that was already graded. The old verdict
    // must not reappear: nothing has been submitted since, so there is no
    // recorded run for this state to display.
    const wrongFix = getFix(MISSION)!.options.find((o) => o.id !== answers.fixId)!;
    saveFixState(MISSION, { fixId: wrongFix.id, applied: true });

    expect(loadGrade(MISSION)).toBeNull();
    expect(verificationShowsDone(MISSION)).toBe(false);
  });

  it("keeps a legitimately earned verdict when nothing actually changed", () => {
    // Revisiting the Fix stage and clicking the option that is already selected
    // must not throw away a real result.
    play(MISSION);
    recordRun(MISSION);

    expect(loadGrade(MISSION)).not.toBeNull();
    expect(verificationShowsDone(MISSION)).toBe(true);
  });
});

describe("submissionMatches", () => {
  const base = {
    missionId: "m",
    rootCauseId: "cause",
    evidenceIds: ["a", "b"],
    fixId: "fix",
  };

  it("accepts an identical submission and set-equal evidence", () => {
    expect(submissionMatches(base, { ...base })).toBe(true);
    expect(submissionMatches(base, { ...base, evidenceIds: ["b", "a"] })).toBe(true);
  });

  it.each([
    ["mission", { missionId: "other" }],
    ["fix", { fixId: "other" }],
    ["root cause", { rootCauseId: "other" }],
    ["evidence", { evidenceIds: ["a"] }],
    ["extra evidence", { evidenceIds: ["a", "b", "c"] }],
    ["a null fix", { fixId: null }],
  ])("rejects a changed %s", (_label, patch) => {
    expect(submissionMatches(base, { ...base, ...patch })).toBe(false);
  });
});
