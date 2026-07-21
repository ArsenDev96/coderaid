import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * The OAuth landing point. GitHub redirects to Supabase, Supabase redirects
 * here with a one-time code, and this exchanges it for a session cookie.
 *
 * `next` lets a sign-in that started from a protected page return to it. It is
 * validated as a relative path so the parameter can't be used to bounce a
 * freshly authenticated player to another origin.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const destination = next && next.startsWith("/") && !next.startsWith("//")
    ? next
    : "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/sign-in?error=missing_code`);
  }

  const { error } = await createClient().auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/sign-in?error=exchange_failed`);
  }

  return NextResponse.redirect(`${origin}${destination}`);
}
