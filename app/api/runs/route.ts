import { NextResponse } from "next/server";
import { getDiagnosis } from "@/lib/diagnosis";
import { getFix } from "@/lib/fix";
import { gradeMission, rewardFor } from "@/lib/grading";
import { getMission } from "@/lib/missions";
import { creditBetween } from "@/lib/progress";
import { answersFor } from "@/lib/server/answers";
import { disclosedGrade } from "@/lib/server/grade-disclosure";
import { ledgerFor, syncAchievements } from "@/lib/server/ledger";
import { parseSubmission } from "@/lib/server/submission";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentUser } from "@/lib/supabase/server";

/**
 * Grades a run and records it.
 *
 * This is the trust boundary. The client sends what the player *chose*; the
 * answers, the grading and the write all happen here, so a score cannot be
 * asserted by the browser — only earned.
 *
 * Runs are append-only: a replay inserts another row, and "best run wins" is a
 * query over them rather than a mutation, so a refresh cannot farm XP and a
 * worse replay cannot erase a better one.
 *
 * **How much of the grade comes back is a separate question from what it is**
 * (§12 item 19). The run is always graded and recorded in full; the *response*
 * carries the per-component detail only when the run improved on the player's
 * best, because `rootCauseCorrect` and the evidence counts are what let the
 * three answers be searched one at a time rather than as a product. See
 * `lib/server/grade-disclosure.ts` for what that does and does not buy — it
 * narrows the oracle, and the closure is a rate limit.
 */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const submission = parseSubmission(body);
  if (!submission) {
    return NextResponse.json({ error: "invalid_submission" }, { status: 400 });
  }

  const mission = getMission(submission.missionId);
  const answers = answersFor(submission.missionId);
  if (!mission || !answers) {
    return NextResponse.json({ error: "unknown_mission" }, { status: 404 });
  }

  const diagnosisConfig = getDiagnosis(mission.id);
  const fixConfig = getFix(mission.id);

  const grade = gradeMission({
    mission,
    answers,
    diagnosis: diagnosisConfig
      ? {
          config: diagnosisConfig,
          state: {
            rootCauseId: submission.rootCauseId,
            evidenceIds: submission.evidenceIds,
            confirmed: true,
          },
        }
      : null,
    fix: fixConfig
      ? {
          config: fixConfig,
          state: { fixId: submission.fixId, applied: submission.fixApplied },
        }
      : null,
    run: submission.telemetry,
  });

  const reward = rewardFor(mission, grade);

  // Read the ledger before the insert so what the run earned can be *measured*
  // rather than predicted. A replay that didn't beat the previous attempt adds
  // nothing, and the diff says so without the client reimplementing the rule.
  //
  // It is also what decides disclosure, at no extra cost: "did this beat their
  // best" is the same question `creditBetween` is already reading the ledger to
  // answer, which is why §12 item 19's fix needs no new round trip and no new
  // table.
  let before;
  try {
    before = await ledgerFor(user.id);
  } catch {
    return NextResponse.json({ error: "read_failed" }, { status: 500 });
  }

  // Decided against the ledger as it was BEFORE the insert. Computed here, not
  // after, because once this run is recorded it is the player's best and every
  // run would look like an improvement on itself.
  const response = disclosedGrade(grade, before);

  const { error } = await createAdminClient()
    .from("mission_runs")
    .insert({
      player_id: user.id,
      mission_id: mission.id,
      score: grade.score,
      xp_earned: grade.xpEarned,
      resolved: grade.resolved,
      skill_xp: reward.skillXp,
      root_cause_id: submission.rootCauseId,
      evidence_ids: submission.evidenceIds,
      fix_id: submission.fixId,
      duration_ms: grade.durationMs,
      hints_used: grade.hintsUsed,
      // The player's own calendar date, bounded to ±1 day of the server's —
      // the streak is counted in local days, which UTC cannot express.
      completed_on: submission.completedOn,
    });

  if (error) {
    return NextResponse.json({ error: "write_failed" }, { status: 500 });
  }

  // Finishing a run is one of the two things that can cross an achievement
  // threshold, so the crossing is stamped here rather than asserted by the
  // browser. The ledger is rebuilt first because achievements are derived from
  // it, and it now includes the run just written.
  let ledger;
  try {
    ledger = await ledgerFor(user.id);
    await syncAchievements(user.id, ledger);
    // Re-read so the response carries any achievement just stamped.
    ledger = await ledgerFor(user.id);
  } catch {
    // The run is recorded, which is the part that must not be lost. The player
    // still gets their grade; the ledger arrives on the next read.
    return NextResponse.json({ grade: response });
  }

  // The grade for the screen the player is looking at, the ledger every other
  // view reads, and what this run actually added — so the results screen can
  // show real skill gains without recomputing anything.
  return NextResponse.json({
    grade: response,
    ledger,
    credit: creditBetween(before, ledger, mission.id),
  });
}
