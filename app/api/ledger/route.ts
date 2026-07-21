import { NextResponse } from "next/server";
import { hasClaimed, ledgerFor, syncAchievements } from "@/lib/server/ledger";
import { parseLocalDate } from "@/lib/server/submission";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentUser } from "@/lib/supabase/server";

/**
 * The player's progression ledger, read from Postgres.
 *
 * `GET` reads it. `POST` records that the player was active today and then
 * reads it — opening the app is activity, which is what a streak actually
 * measures, and doing both in one request is what the provider needs on mount.
 *
 * A signed-out caller gets 401 rather than an empty ledger, because those are
 * different facts: the provider falls back to the local ledger on 401, and
 * would wrongly show zero if "no session" and "no progress" looked alike.
 *
 * Neither verb lets the client state a number. The active day is the only
 * value that crosses, and `parseLocalDate` bounds it to ±1 day of the server's
 * own date, so the most a forged request can buy is a day it nearly had.
 */

export async function GET() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  try {
    const [ledger, claimed] = await Promise.all([
      ledgerFor(user.id),
      hasClaimed(user.id),
    ]);
    return NextResponse.json({ ledger, claimed });
  } catch {
    return NextResponse.json({ error: "read_failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // An empty or unparseable body is fine — the date falls back to the
    // server's own, which is right for everyone in UTC and off by at most a
    // day for anyone else.
  }

  const day = parseLocalDate(
    (body as Record<string, unknown> | null)?.today,
  );

  try {
    const { error } = await createAdminClient()
      .from("player_active_days")
      .upsert(
        { player_id: user.id, day },
        { onConflict: "player_id,day", ignoreDuplicates: true },
      );
    if (error) throw new Error(error.message);

    // A day recorded can extend a streak, which is the other thing that
    // crosses an achievement threshold.
    const ledger = await ledgerFor(user.id);
    await syncAchievements(user.id, ledger);

    // Re-read so the response carries the achievement just stamped rather than
    // the state from immediately before it.
    const [fresh, claimed] = await Promise.all([
      ledgerFor(user.id),
      hasClaimed(user.id),
    ]);
    return NextResponse.json({ ledger: fresh, claimed });
  } catch {
    return NextResponse.json({ error: "write_failed" }, { status: 500 });
  }
}
