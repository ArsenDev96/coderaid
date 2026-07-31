-- CodeRaid — declaring the privileges the app has always relied on.
--
-- DRAFT, not yet applied to the hosted project. See §12 item 2.
--
-- The problem, stated plainly: **nothing in this schema has ever granted a
-- privilege to `service_role` or `authenticated` on the scored tables**, and the
-- app works only because the hosted project was created under Supabase's old
-- cloud default, which auto-granted every new table in `public` to `anon`,
-- `authenticated` and `service_role`.
--
-- That default is gone. A local stack started by the CLI today already behaves
-- the new way, and `supabase/config.toml` records the deadline:
--
--   auto_expose_new_tables ... "When unset, new entities are NOT auto-exposed,
--   matching the new cloud default ... the field is removed on 2026-10-30 once
--   the always-revoked behaviour is permanent."
--
-- Measured on 2026-07-31, same migrations, two environments:
--
--   hosted project     GET /rest/v1/mission_runs as anon         -> 200 []
--                      (the blanket grant exists; RLS filters it to nothing)
--   local CLI stack    GET /rest/v1/mission_runs as anon         -> 401 42501
--                      GET /rest/v1/players     as service_role  -> 401 42501
--
-- The second line is the serious one. `service_role` is the ONLY writer of
-- anything scored (§16.2), and on a project created today it cannot read or
-- write these tables at all. So:
--
--   * a fresh Supabase project for CI would not run the app,
--   * a local stack cannot run the e2e suite,
--   * and the live project breaks the day the old behaviour is removed.
--
-- This migration makes the dependency explicit. It grants exactly what the app
-- uses and nothing else, which is also narrower than the blanket default it
-- replaces.

/* ------------------------------ schema usage ----------------------------- */
-- Without this, no role can reach any relation in the schema regardless of
-- table grants. `anon` needs it to reach auth endpoints and nothing else.

grant usage on schema public to anon, authenticated, service_role;

/* ----------------------------- service_role ------------------------------ */
-- The route handlers. `service_role` has `bypassrls`, but bypassing RLS is not
-- the same as holding a table privilege — it still needs the GRANT.

grant select, insert, update, delete
  on public.players,
     public.mission_runs,
     public.player_active_days,
     public.player_achievements
  to service_role;

-- Identity columns draw from a sequence, and INSERT needs to use it.
grant usage, select on all sequences in schema public to service_role;

-- The ledger and the leaderboard are both derived from this view.
grant select on public.best_runs to service_role;

/* ----------------------------- authenticated ----------------------------- */
-- Read your own rows. RLS decides WHICH rows; this decides whether the role may
-- address the table at all. The two are independent and both are required.
--
-- `players` is deliberately SELECT-only here: the column-level UPDATE grant in
-- 0001_init.sql is what lets a player write their own six profile columns, and
-- restating it here would risk widening it.

grant select
  on public.players,
     public.mission_runs,
     public.player_active_days,
     public.player_achievements
  to authenticated;

/* --------------------------------- anon ---------------------------------- */
-- Nothing. Stated as an omission rather than left to be inferred: a signed-out
-- visitor never reads a table directly. Every read goes through a route handler
-- or a session, and `/api/leaderboard` 401s without one because its rows name
-- other people.

/* ------------------------------- best_runs ------------------------------- */
-- Re-asserted LAST, and deliberately after every grant above, because this file
-- is the one most likely to be edited into a blanket
-- `grant ... on all tables in schema public`. That would silently re-open
-- §12 item 20 — the view served the answer key to anyone holding the anon key.
-- Neither role may address it; `service_role` reads it, and it is granted that
-- explicitly above.

revoke all on public.best_runs from anon, authenticated;
