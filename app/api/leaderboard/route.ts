import { NextResponse } from "next/server";
import { standings } from "@/lib/server/standings";
import { currentUser } from "@/lib/supabase/server";

/**
 * The leaderboard, for signed-in players.
 *
 * Authentication is the privacy boundary. Standings carry other people's
 * display names — GitHub-derived, and nobody opted into publishing them — so a
 * signed-out visitor gets 401 rather than a public list of everyone who has
 * ever played. The page renders a sign-in prompt instead.
 *
 * The projection is built in `lib/server/standings.ts` and contains only what a
 * player earned: name, avatar, level, XP, incidents cleared, success rate, and
 * the two derived attributes the filters use. No email, and no run detail — the
 * board cannot leak which answers anyone chose.
 *
 * Nothing is stored. A rank is a fact about a moment; caching one in a column
 * would start disagreeing with the runs behind it the instant somebody played.
 */
export async function GET() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  try {
    const rows = await standings();
    return NextResponse.json({
      // Marked here rather than in the derivation, so the shared projection has
      // no notion of "you" and cannot accidentally return one player's view to
      // another.
      standings: rows.map((row) =>
        row.id === user.id ? { ...row, isCurrentUser: true } : row,
      ),
    });
  } catch {
    return NextResponse.json({ error: "read_failed" }, { status: 500 });
  }
}
