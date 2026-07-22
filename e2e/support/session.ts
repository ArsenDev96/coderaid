import type { BrowserContext } from "@playwright/test";
import { createChunks, stringToBase64URL } from "@supabase/ssr/dist/main/utils";

/**
 * Minting a real session for the browser, without GitHub.
 *
 * The app signs players in with GitHub OAuth only, which a test cannot drive —
 * so these helpers do what the OAuth callback would have done: create a user
 * with the service-role key, exchange a password for a session, and write that
 * session into the cookie jar in exactly the format `@supabase/ssr` reads.
 *
 * Why this is worth the awkwardness: everything the server decides — the grade,
 * the ledger, the claim, the leaderboard — lives behind the sign-in wall, so a
 * suite that stops at that wall cannot see any of it. Until this existed, all
 * of it was verified by hand and nothing re-checked it.
 *
 * **These tests write to the real Supabase project.** There is no local stack
 * here. Every user is created with a unique `coderaid-e2e+…` address and
 * deleted in teardown; the schema's `on delete cascade` takes the runs, active
 * days and achievements with it. See the `player` fixture in `./fixtures.ts`.
 */

/** The three variables the fixture needs. Names only — never log the values. */
const URL_VAR = "NEXT_PUBLIC_SUPABASE_URL";
const ANON_VAR = "NEXT_PUBLIC_SUPABASE_ANON_KEY";
const SERVICE_VAR = "SUPABASE_SERVICE_ROLE_KEY";

/** True when the suite can reach Supabase at all — CI forks have no secrets. */
export function hasCredentials(): boolean {
  return Boolean(
    process.env[URL_VAR] &&
      process.env[ANON_VAR] &&
      process.env[SERVICE_VAR],
  );
}

function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    // The name, never the value.
    throw new Error(`${name} is not set — the authenticated specs need it.`);
  }
  return value;
}

/**
 * The cookie name `@supabase/ssr` uses, derived the same way it derives it:
 * the first label of the project host. `https://abc.supabase.co` → `sb-abc-auth-token`.
 */
export function cookieName(): string {
  const host = new URL(env(URL_VAR)).hostname;
  return `sb-${host.split(".")[0]}-auth-token`;
}

type Session = Record<string, unknown>;

export type TestPlayer = {
  id: string;
  email: string;
  session: Session;
};

async function authFetch(
  path: string,
  init: RequestInit & { serviceRole?: boolean } = {},
): Promise<Response> {
  const { serviceRole, ...rest } = init;
  const key = serviceRole ? env(SERVICE_VAR) : env(ANON_VAR);
  return fetch(`${env(URL_VAR)}${path}`, {
    ...rest,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...rest.headers,
    },
  });
}

/**
 * A confirmed user with a password.
 *
 * `email_confirm` matters: without it the password grant refuses to issue a
 * session, and the failure reads as bad credentials rather than an unconfirmed
 * address. `user_name` populates `players.display_name` through the
 * `handle_new_user` trigger, the same field GitHub would have filled — so the
 * leaderboard has a name to show.
 */
export async function createPlayer(label: string): Promise<TestPlayer> {
  // Unique per run: these land in a shared project, and two concurrent runs
  // must not collide on an address.
  const nonce = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `coderaid-e2e+${label}-${nonce}@example.com`;
  const password = `e2e-${nonce}-Aa1!`;

  const created = await authFetch("/auth/v1/admin/users", {
    method: "POST",
    serviceRole: true,
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { user_name: `E2E ${label}` },
    }),
  });

  if (!created.ok) {
    throw new Error(`Could not create the test user (${created.status}).`);
  }
  const user = (await created.json()) as { id: string };

  const granted = await authFetch("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (!granted.ok) {
    // Clean up rather than leaking a user into the project on a partial failure.
    await deletePlayer(user.id);
    throw new Error(`Could not sign the test user in (${granted.status}).`);
  }

  return { id: user.id, email, session: (await granted.json()) as Session };
}

/** Cascades to runs, active days and achievements via the schema's FKs. */
export async function deletePlayer(id: string): Promise<void> {
  await authFetch(`/auth/v1/admin/users/${id}`, {
    method: "DELETE",
    serviceRole: true,
  });
}

/**
 * Writes the session into a browser context the way the library reads it:
 * `base64-` + base64url JSON, chunked, because a session exceeds the 4KB cookie
 * limit once the JWTs are in it. This mirrors `cookies.js` in `@supabase/ssr`
 * exactly — if that encoding ever changes, these specs fail loudly rather than
 * silently signing nobody in.
 */
export async function applySession(
  context: BrowserContext,
  session: Session,
  baseURL: string,
): Promise<void> {
  const encoded = `base64-${stringToBase64URL(JSON.stringify(session))}`;
  const { hostname } = new URL(baseURL);

  await context.addCookies(
    createChunks(cookieName(), encoded).map((chunk) => ({
      name: chunk.name,
      value: chunk.value,
      domain: hostname,
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax" as const,
    })),
  );
}

/** Direct Postgres reads, for asserting what the server actually recorded. */
export async function selectRows<T = Record<string, unknown>>(
  table: string,
  query: string,
): Promise<T[]> {
  const response = await authFetch(`/rest/v1/${table}?${query}`, {
    serviceRole: true,
  });
  if (!response.ok) {
    throw new Error(`Reading ${table} failed (${response.status}).`);
  }
  return (await response.json()) as T[];
}
