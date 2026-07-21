"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./env";

/**
 * The browser Supabase client — sign-in, sign-out and reading the session.
 *
 * It is *not* used to read or write progress. Progress is server-authoritative:
 * every scored value goes through a route handler holding the service-role key,
 * because row-level security decides which row a player may touch and never
 * which values they may write into it.
 */
export function createClient() {
  return createBrowserClient(supabaseUrl(), supabaseAnonKey());
}
