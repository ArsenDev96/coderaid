import { test as base, expect } from "@playwright/test";
import { hasCredentials, readAsAnon } from "./support/session";

/**
 * The database API is a public surface, and `best_runs` was wide open on it.
 *
 * `NEXT_PUBLIC_SUPABASE_ANON_KEY` ships in the client bundle — that is what it
 * is for — so "can be read with the anon key and no session" means "is on the
 * open internet". RLS is what makes that safe for the tables. It did **not**
 * make it safe for the view: a Postgres view runs as its OWNER unless declared
 * `security_invoker`, so `public.best_runs` bypassed every policy on
 * `mission_runs`, and Supabase's default grant to `anon` made the result
 * reachable. `0003_lock_best_runs.sql` closes it.
 *
 * What was leaking is worth naming precisely, because it is the one thing this
 * codebase spends the most effort hiding. `best_runs` is `mission_runs.*`, so
 * every row carried `root_cause_id`, `evidence_ids` and `fix_id` — **the answer
 * key** — for every mission any player had completed, plus their scores and
 * telemetry. `lib/server/answers.ts` puts the answers behind `server-only` and
 * `tests/bundle-secrecy.test.ts` greps the real build to prove they stayed
 * there. Both were guarding the front door.
 *
 * **Why this lives in `e2e/` and not in `tests/`.** §15.1 records that nothing
 * in the Vitest suite talks to Supabase, and that is a property worth keeping —
 * it is what makes the unit suite runnable with no credentials and no network.
 * This assertion is a fact about the live database's privileges, not about any
 * module, so it belongs with the other specs that cross into Postgres (§15.5).
 *
 * These specs need no browser and no session. They are `base` rather than the
 * `player` fixture from `./support/fixtures` precisely because signing in is
 * what they must NOT do: the whole question is what an unauthenticated stranger
 * can read.
 */

/** Everything a `best_runs` row would hand over. Named, so a failure says why. */
const ANSWER_KEY_COLUMNS = ["root_cause_id", "evidence_ids", "fix_id"];

base.describe("what the anon key can read", () => {
  base.skip(
    !hasCredentials(),
    "needs the Supabase keys; skipped where secrets are unavailable.",
  );

  base("best_runs hands nothing to an anonymous caller", async () => {
    const read = await readAsAnon("best_runs");

    // Either answer is correct and they are not the same fix. `revoke all`
    // gives 401/403 and no row set; `security_invoker` alone gives 200 and an
    // empty array, because an anonymous caller owns no runs. The migration
    // applies both, so this passes on either — and fails loudly if a later
    // migration recreates the view and drops them.
    if (read.rows !== null) {
      expect(
        read.rows,
        "best_runs returned rows to an anonymous caller — the answer key is public",
      ).toEqual([]);
    } else {
      expect([401, 403, 404]).toContain(read.status);
    }
  });

  base("no answer-key column reaches an anonymous caller", async () => {
    // Asserting on the columns as well as the row count, because the failure
    // this guards against is not "some rows leaked" but "these fields leaked".
    // A future view that exposes a subset would pass the count check above by
    // accident of being empty at that moment; this one names the stakes.
    const read = await readAsAnon("best_runs");
    const columns = new Set((read.rows ?? []).flatMap((row) => Object.keys(row)));

    for (const column of ANSWER_KEY_COLUMNS) {
      expect(
        columns.has(column),
        `best_runs.${column} is readable without a session`,
      ).toBe(false);
    }
  });

  base("RLS still holds on the tables underneath", async () => {
    // The control. These were never broken — they are here so a failure of the
    // first two tests can be read correctly. If all three go red, the project
    // is unreachable or the key is wrong; if only the first two do, the view
    // has lost its protection again.
    for (const table of ["mission_runs", "players", "player_achievements"]) {
      const read = await readAsAnon(table);
      expect(read.status, `${table} did not answer`).toBe(200);
      expect(read.rows, `${table} leaked rows to an anonymous caller`).toEqual([]);
    }
  });
});
