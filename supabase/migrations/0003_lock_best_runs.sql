-- CodeRaid — closing the best_runs read hole.
--
-- The bug, stated plainly: `public.best_runs` is a view over `mission_runs`,
-- which has RLS enabled and a select-your-own-rows policy. A Postgres view does
-- NOT enforce the RLS of the tables underneath it. Unless the view is declared
-- `security_invoker`, its queries run as the view's OWNER, and the owner here is
-- the superuser that ran 0001 — so every policy on `mission_runs` is bypassed.
-- Supabase's default privileges then grant SELECT on new public relations to
-- `anon` and `authenticated`, which handed the whole view to the anon key that
-- ships in the client bundle.
--
-- What that exposed. `best_runs` is `mission_runs.*` plus an attempts count, so
-- every row carries `root_cause_id`, `evidence_ids` and `fix_id` — the ANSWER
-- KEY for every mission any player has ever completed — alongside every
-- player's score, telemetry and completion dates. `lib/server/answers.ts` keeps
-- the answers out of the bundle and `tests/bundle-secrecy.test.ts` greps the
-- build to prove it; both were guarding the front door while this view held the
-- back one open. It also contradicts the privacy boundary
-- `app/api/leaderboard/route.ts` documents, which is that the rows name other
-- people and therefore require a session.
--
-- Measured before this migration, with the anon key and no session at all:
--
--   GET /rest/v1/mission_runs -> []          RLS holds
--   GET /rest/v1/players      -> []          RLS holds
--   GET /rest/v1/best_runs    -> every row   RLS bypassed
--
-- And with a real signed-in player's token: `mission_runs` returned 0 rows
-- while `best_runs` returned every row in the table. So this leaked to
-- `authenticated` as well as to `anon`, which is why the revoke below names
-- both. A fix that only revoked `anon` would have left any account able to read
-- the answer key.

/* ------------------------ 1. make the view honest ------------------------ */
-- With `security_invoker`, the view executes as the CALLER, so the policies on
-- `mission_runs` apply to reads through it exactly as they apply to reads of
-- the table. This alone closes the hole for a signed-in player: they would see
-- their own best runs and nobody else's.

alter view public.best_runs set (security_invoker = true);

/* ------------------------ 2. and then unreachable ------------------------ */
-- Belt and braces, and the braces are load-bearing. `security_invoker` makes
-- the view return the right ROWS; revoking the grant means neither role may
-- query it at all. Nothing outside the server has any business reading this
-- relation — the ledger and the leaderboard are both derived from it by route
-- handlers holding the service-role key, which has `bypassrls` and is
-- unaffected by either statement here.
--
-- Two guards rather than one because they fail differently: a future migration
-- that recreates the view with `create or replace` silently loses the
-- `security_invoker` setting, and the revoke is what still stands if that
-- happens.

revoke all on public.best_runs from anon, authenticated;

/* ------------------------------ the rule --------------------------------- */
-- The house rule this establishes is written next to the RLS comment block in
-- 0001_init.sql, where the next person writing a view will actually be looking:
-- every view over an RLS-protected table sets `security_invoker = true` at
-- creation, and grants nothing to `anon` or `authenticated` unless the rows are
-- genuinely public.
--
-- `e2e/view-privileges.spec.ts` is the alarm behind this fix: it queries
-- `/rest/v1/best_runs` with the anon key and fails if anything comes back.
