import { NextResponse } from "next/server";
import { parseClaim } from "@/lib/server/claim";
import { ledgerFor, syncAchievements } from "@/lib/server/ledger";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentUser } from "@/lib/supabase/server";

/**
 * Claiming progress earned before accounts existed — once, per player.
 *
 * CodeRaid shipped as a `localStorage` prototype, so there are players holding
 * a real ledger this database has never seen. This turns it into ordinary
 * `mission_runs` rows: after the claim their progress derives from runs exactly
 * like everyone else's, and a replay improves it under the same best-run rule.
 * Importing totals instead would have put a number in the database with no
 * evidence behind it, which is the one thing the schema is built to prevent.
 *
 * `parseClaim` decides what is trustworthy. Everything derivable — XP, skill
 * awards, which missions exist — is recomputed here; only the score, the
 * verdict and roughly when are taken on trust, because the runs happened
 * somewhere we weren't recording. That is why this is one-time, marked
 * `source = 'claimed'`, and guarded by a unique index rather than a flag alone.
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

  const db = createAdminClient();

  // One claim per player, ever. The flag is the fast path; the partial unique
  // index on (player_id, mission_id) where source = 'claimed' is what actually
  // holds if two tabs submit at once.
  const { data: player, error: readError } = await db
    .from("players")
    .select("claimed_at")
    .eq("id", user.id)
    .single();

  if (readError || !player) {
    return NextResponse.json({ error: "no_player" }, { status: 404 });
  }
  if (player.claimed_at) {
    return NextResponse.json({ error: "already_claimed" }, { status: 409 });
  }

  const runs = parseClaim(body);

  if (runs.length > 0) {
    const { error } = await db.from("mission_runs").insert(
      runs.map((run) => ({
        player_id: user.id,
        mission_id: run.missionId,
        score: run.score,
        xp_earned: run.xpEarned,
        resolved: run.resolved,
        skill_xp: run.skillXp,
        duration_ms: run.durationMs,
        hints_used: run.hintsUsed,
        completed_on: run.completedOn,
        source: "claimed",
        // Root cause, evidence and fix are deliberately null: the local ledger
        // recorded outcomes, not answers, and inventing them would make an
        // unverified run look like a graded one in the history.
      })),
    );

    if (error) {
      // The unique index rejecting a duplicate means a concurrent claim won.
      // That is the guard working, not a failure the player needs to see.
      const conflict = error.code === "23505";
      return NextResponse.json(
        { error: conflict ? "already_claimed" : "write_failed" },
        { status: conflict ? 409 : 500 },
      );
    }

    // A day a run happened on is a day the player was active. This is derived
    // from the runs just accepted rather than imported separately — the local
    // `activeDays` list is not read, so a claim cannot assert attendance on a
    // day it has no run to show for.
    const days = [...new Set(runs.map((r) => r.completedOn))];
    await db
      .from("player_active_days")
      .upsert(
        days.map((day) => ({ player_id: user.id, day })),
        { onConflict: "player_id,day", ignoreDuplicates: true },
      );
  }

  // Marked claimed even when the ledger turned out to hold nothing worth
  // importing: the player has answered the question, and should not be asked
  // again on every sign-in.
  await db
    .from("players")
    .update({ claimed_at: new Date().toISOString() })
    .eq("id", user.id);

  try {
    const ledger = await ledgerFor(user.id);
    await syncAchievements(user.id, ledger);
    return NextResponse.json({
      claimed: runs.length,
      ledger: await ledgerFor(user.id),
    });
  } catch {
    return NextResponse.json({ claimed: runs.length });
  }
}
