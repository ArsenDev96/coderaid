import { NextResponse } from "next/server";
import { ledgerFor } from "@/lib/server/ledger";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentUser } from "@/lib/supabase/server";

/**
 * Starting over — §12 item 7, decided 2026-07-30 as a **tombstone, not a
 * delete**.
 *
 * Stamps `players.reset_at` and drops the player's achievement stamps. Nothing
 * is removed from `mission_runs`: `best_runs` filters on the tombstone
 * (migration 0004), so the ledger, the skills, the leaderboard and the mission
 * states all go to zero together while the history stays intact for the
 * difficulty tuning it was kept for.
 *
 * **Why this route holds the service-role key when `/api/profile` deliberately
 * does not.** That route runs as the signed-in user precisely because
 * `0001_init.sql` grants them exactly six profile columns, so Postgres refuses
 * anything else even if the handler is wrong. `reset_at` is **not** one of the
 * six, and it must not be: a column the browser can write is a column the
 * browser can write *at any value*, and a player who could set their own
 * `reset_at` to the future would silently void every run they went on to
 * record. So the tombstone is a server-owned column and this handler is the
 * only thing that writes it.
 *
 * **Why the achievement stamps are deleted rather than filtered.** An unlock
 * time is a derived conclusion, not evidence (§4 principle 12). Keeping a stamp
 * whose ledger no longer supports it would be a second source of truth that
 * immediately disagrees with the runs — the exact failure the schema has no
 * `total_xp` column to avoid. They are re-stamped the moment they are re-earned.
 *
 * **What a reset deliberately does not do:**
 *   - it does not refill the replay limit, which counts raw `mission_runs`
 *     rows and so is unaffected by the tombstone (`lib/replay-limit.ts`);
 *   - it does not re-open the one-time pre-account claim (`players.claimed_at`,
 *     migration 0002), which would otherwise become repeatable;
 *   - it does not touch the profile, the identity or the preferences;
 *   - it does not delete the account. A genuine erasure request is a different
 *     feature with a different name, and it should remove the account itself.
 */
export async function POST() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const db = createAdminClient();
  const now = new Date().toISOString();

  const { error: stampError } = await db
    .from("players")
    .update({ reset_at: now })
    .eq("id", user.id);

  if (stampError) {
    return NextResponse.json({ error: "reset_failed" }, { status: 500 });
  }

  /*
    Ordering matters. The tombstone lands first, so a failure here leaves a
    player whose ledger is already empty and whose stale stamps are filtered out
    by `ledgerFor` anyway — degraded, but consistent. The reverse order would
    delete the stamps and, on failure, leave the player with their full progress
    and their achievements missing, which is a worse and less recoverable state.
  */
  const { error: stampsError } = await db
    .from("player_achievements")
    .delete()
    .eq("player_id", user.id);

  if (stampsError) {
    return NextResponse.json({ error: "reset_partial" }, { status: 500 });
  }

  // The zero ledger, read back rather than assumed, so the client adopts what
  // the database actually holds. If this read fails the reset still happened;
  // the client refetches on its next mount.
  try {
    return NextResponse.json({ ledger: await ledgerFor(user.id), resetAt: now });
  } catch {
    return NextResponse.json({ resetAt: now });
  }
}
