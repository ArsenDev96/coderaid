import { NextResponse } from "next/server";
import { parseProfileUpdate } from "@/lib/server/profile";
import { createClient, currentUser } from "@/lib/supabase/server";

/**
 * The player's own profile — the one thing in this schema they may write.
 *
 * **This route deliberately does not use the service-role client.** Every other
 * writer in the app holds it, because grading and progression must not be
 * assertable from a browser. A profile is the opposite case: `0001_init.sql`
 * revokes blanket `UPDATE` on `players` and grants it back on exactly six
 * columns — `display_name`, `avatar_id`, `slogan`, `path_id`, `experience_id`
 * and `onboarding_completed`. Running as the signed-in user means Postgres
 * enforces both halves: RLS decides the row is theirs, and the column grant
 * decides which values they may set.
 *
 * The practical consequence is worth stating plainly: if this handler had a bug
 * that let a request name any column, the database would still refuse to write
 * `claimed_at` or anything in `mission_runs`. With the admin client it would
 * not. That is the whole reason the grant exists, and until now nothing used it
 * — the columns were granted and no code path wrote them (§12 item 17).
 *
 * Progress is untouched by any of this. Nothing here is scored, so there is no
 * ledger to re-derive and no achievement threshold to re-check.
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

  const update = parseProfileUpdate(body);
  if (!update) {
    return NextResponse.json({ error: "invalid_profile" }, { status: 400 });
  }

  // `.eq("id", user.id)` is belt-and-braces: RLS already restricts the row to
  // the caller. Scoping it here too means the query says what it means without
  // the reader having to hold the policy in their head.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .update(update)
    .eq("id", user.id)
    .select("display_name,avatar_id,slogan,path_id,experience_id,onboarding_completed")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "write_failed" }, { status: 500 });
  }

  // The stored row rather than the submitted one, so the client renders what
  // the database actually holds — a name that was truncated or had characters
  // stripped comes back in its real form instead of the form that was sent.
  return NextResponse.json({
    profile: {
      name: data.display_name,
      avatarId: data.avatar_id,
      slogan: data.slogan,
      pathId: data.path_id,
      experienceId: data.experience_id,
      completed: data.onboarding_completed,
    },
  });
}
