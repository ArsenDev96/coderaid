import { test as base, expect } from "@playwright/test";
import { credentialsMissing, readAsAnon, selectRows } from "./support/session";

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
    credentialsMissing(),
    "needs the Supabase keys; skipped locally without them, red in CI.",
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

  base("the project answers at all, and the tables refuse an anonymous caller", async () => {
    /*
      The control, and it is the reason the two specs above can be read at all:
      "nothing came back" is the passing outcome there, and an unreachable
      project or a wrong key produces exactly that.

      **Rewritten 2026-07-31, because the original control stopped being one.**
      It asserted `200` with `[]` from each table — anon holding `SELECT` while
      RLS filtered every row away. That was only ever true because the hosted
      project was created under Supabase's old default, which auto-granted every
      new `public` table to `anon`. Under the current default there is no grant
      at all, so the same read answers `401 42501`, and the spec failed against a
      correctly-configured database (§12 item 2).

      **401 is the stronger posture, not a regression** — no grant beats a grant
      plus a policy — so both are accepted. But accepting both costs the original
      control its discriminating power: if anon is refused everywhere, "refused"
      no longer distinguishes a locked-down project from an unreachable one.

      So reachability is established with the service-role key instead, which
      must succeed in every privilege model. That is what makes the anon results
      below meaningful rather than vacuous.
    */
    const reachable = await selectRows("mission_runs", "select=id&limit=1");
    expect(
      Array.isArray(reachable),
      "the project did not answer a service-role read — nothing below can be trusted",
    ).toBe(true);

    for (const table of ["mission_runs", "players", "player_achievements"]) {
      const read = await readAsAnon(table);

      // No grant (401/403) or a grant with RLS filtering everything (200 []).
      // Both are correct; what must never happen is a row coming back.
      if (read.rows !== null) {
        expect(read.status, `${table} answered oddly`).toBe(200);
        expect(read.rows, `${table} leaked rows to an anonymous caller`).toEqual([]);
      } else {
        expect(
          [401, 403],
          `${table} neither answered nor refused cleanly`,
        ).toContain(read.status);
      }
    }
  });
});
