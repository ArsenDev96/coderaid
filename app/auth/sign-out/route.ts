import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Sign-out is a POST, not a link: a GET would let any page on the internet log
 * the player out with an <img> tag.
 */
export async function POST(request: Request) {
  const { origin } = new URL(request.url);
  await createClient().auth.signOut();
  return NextResponse.redirect(`${origin}/`, { status: 303 });
}
