import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";

/**
 * The service-role client. **Bypasses row-level security**, so it is the only
 * thing that can write a mission run, an achievement or an active day — which
 * is what makes progress server-authoritative rather than merely
 * authenticated.
 *
 * `import "server-only"` at the top is load-bearing: it makes any import of
 * this module from a client component a build error, so the key cannot reach
 * the browser bundle by accident.
 *
 * Every caller must scope its own queries by `player_id` from the verified
 * session. RLS is not a backstop here.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Copy it from the Supabase dashboard (Settings → API) into .env.local. It must never be prefixed NEXT_PUBLIC_.",
    );
  }

  return createSupabaseClient(supabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
