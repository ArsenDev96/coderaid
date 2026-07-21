import { NextResponse } from "next/server";
import { getDiagnosis } from "@/lib/diagnosis";
import { getFix } from "@/lib/fix";
import { gradeMission, rewardFor } from "@/lib/grading";
import { getMission } from "@/lib/missions";
import { answersFor } from "@/lib/server/answers";
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
      // The player's own calendar date — the unit the streak counts in.
      completed_on: new Date().toISOString().slice(0, 10),
    });

  if (error) {
    return NextResponse.json({ error: "write_failed" }, { status: 500 });
  }

  return NextResponse.json({ grade });
}
