import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAnonKey, supabaseUrl } from "./env";

/**
 * A request-scoped Supabase client that reads the player's session from
 * cookies. Use it in server components and route handlers to answer "who is
 * this?" — it runs as the signed-in user, so RLS applies.
 *
 * For writing anything scored, use `admin.ts` instead: this client is subject
 * to the same policies as the browser, and those deliberately forbid writing a
 * run, an achievement or an active day.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a server component, where cookies are read-only. The
          // session refresh is written by the route handlers instead, so this
          // is safe to ignore rather than surface.
        }
      },
    },
  });
}

/** The signed-in user, or `null`. Never throws on an absent session. */
export async function currentUser() {
  const {
    data: { user },
  } = await createClient().auth.getUser();
  return user;
}
