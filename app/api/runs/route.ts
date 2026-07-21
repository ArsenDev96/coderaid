import { NextResponse } from "next/server";
import { getDiagnosis } from "@/lib/diagnosis";
import { getFix } from "@/lib/fix";
import { gradeMission, rewardFor } from "@/lib/grading";
import { getMission } from "@/lib/missions";
import { creditBetween } from "@/lib/progress";
import { answersFor } from "@/lib/server/answers";
import { ledgerFor, syncAchievements } from "@/lib/server/ledger";
import { parseSubmission } from "@/lib/server/submission";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentUser } from "@/lib/supabase/server";

/**
 * Grades a run and records it.
 *
 * This is the trust boundary. The client sends what the player *chose*; the
 * answers, the grading and the write all happen here, so a score cannot be
 * asserted by the browser — only earned. The response carries the full
 * breakdown because the results screen renders it, and knowing the formula
 * afterwards reveals nothing about the next mission's answer.
 *
 * Runs are append-only: a replay inserts another row, and "best run wins" is a
 * query over them rather than a mutation, so a refresh cannot farm XP and a
 * worse replay cannot erase a better one.
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
  let before;
  try {
    before = await ledgerFor(user.id);
  } catch {
    return NextResponse.json({ error: "read_failed" }, { status: 500 });
  }

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
    return NextResponse.json({ grade });
  }

  // The grade for the screen the player is looking at, the ledger every other
  // view reads, and what this run actually added — so the results screen can
  // show real skill gains without recomputing anything.
  return NextResponse.json({
    grade,
    ledger,
    credit: creditBetween(before, ledger, mission.id),
  });
}
