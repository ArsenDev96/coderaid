-- CodeRaid — letting a player start over without deleting what they did.
--
-- §12 item 7. "Reset Progress" could not erase earned XP for a signed-in
-- player, because runs are append-only and best-run-wins is a query over them
-- rather than a mutation. The copy said so, which was honest but left the
-- control weaker than players expect.
--
-- The decision (2026-07-30) was a **tombstone, not a delete**: `players.reset_at`
-- marks the moment a player started over, and every derivation reads only the
-- runs after it. Nothing is removed from `mission_runs`.
--
-- Why a tombstone rather than `delete from mission_runs`:
--
--   * Append-only is load-bearing in three places, not one. It is what makes
--     "best run wins" a query rather than a mutation, what makes a replay an
--     upgrade rather than a second award, and what makes the replay limit
--     (`lib/replay-limit.ts`) self-enforcing — the limit counts rows, so a
--     delete would hand back a fresh set of attempts and turn Reset Progress
--     into a rate-limit bypass.
--   * The history stays available for the difficulty tuning `0001_init.sql`
--     kept it for.
--
-- A delete is still the right answer to a genuine erasure request — that is a
-- different feature with a different name, and it should delete the account.

/* ---------------------------- 1. the tombstone --------------------------- */

alter table public.players
  add column if not exists reset_at timestamptz;

comment on column public.players.reset_at is
  'When the player last started over. Every derivation ignores runs at or before this instant; nothing is deleted. Null means never reset.';

/* ------------------------ 2. teach the view about it --------------------- */
-- `best_runs` is the single source both the ledger (lib/server/ledger.ts) and
-- the leaderboard (lib/server/standings.ts) derive from, so filtering here is
-- what makes a reset apply to both at once instead of in two places that can
-- drift apart.
--
-- READ THE HOUSE RULE in 0001_init.sql before touching this. `create or replace
-- view` SILENTLY DROPS `security_invoker`, which is exactly how this view came
-- to serve the answer key to the open internet (0003). Both guards are
-- therefore restated below, deliberately, even though 0003 already set them:
-- the `with (security_invoker = true)` on the definition, and the revoke after
-- it. Neither is redundant — they fail differently, which is the point.
--
-- WHY THIS DROPS THE VIEW INSTEAD OF REPLACING IT. `create or replace view`
-- may only *append* columns; it cannot reorder or rename an existing one. The
-- live view still carries the column list 0001 expanded from `mission_runs.*`,
-- because 0003 changed the view's OPTIONS (`alter view … set`) rather than its
-- definition — so it never re-expanded the star. `mission_runs.source` was
-- added afterwards, by 0002. Re-expanding `r.*` here therefore inserts `source`
-- *before* the trailing `attempts`, and the replace fails with:
--
--   42P16: cannot change name of view column "attempts" to "source"
--
-- Seen for real on 2026-07-31, the first time this migration was run. Dropping
-- is safe because nothing in the database depends on this view — no other view,
-- no function, no policy — and both of its consumers (`lib/server/ledger.ts`
-- and `lib/server/standings.ts`) select columns by name through PostgREST.
--
-- The drop is also precisely why the `revoke` below is not optional. Supabase's
-- default privileges grant `SELECT` on **new** public relations to `anon` and
-- `authenticated`, and a dropped-and-recreated view is a new relation. Without
-- the revoke, applying this migration would silently reopen §12 item 20.

drop view if exists public.best_runs;

create view public.best_runs
  with (security_invoker = true)
as
select distinct on (r.player_id, r.mission_id)
       r.*,
       (select count(*)
          from public.mission_runs a
          join public.players ap on ap.id = a.player_id
         where a.player_id = r.player_id
           and a.mission_id = r.mission_id
           -- Attempts are counted post-reset too, so the number beside a
           -- mission describes the history the player can actually see.
           and a.completed_at > coalesce(ap.reset_at, '-infinity'::timestamptz)
       ) as attempts
  from public.mission_runs r
  join public.players p on p.id = r.player_id
 where r.completed_at > coalesce(p.reset_at, '-infinity'::timestamptz)
 order by r.player_id, r.mission_id, r.score desc, r.completed_at asc;

comment on view public.best_runs is
  'Best run per player per mission, ignoring anything before the player''s reset_at — the rows the ledger is summed from.';

revoke all on public.best_runs from anon, authenticated;

/* ----------------------- 3. what a reset does NOT do --------------------- */
-- Recorded here because the omissions are decisions, not oversights:
--
--   * `mission_runs` is untouched. That is the whole idea.
--   * `players.claimed_at` is untouched. The pre-account import is one-time by
--     design (0002); letting a reset re-open it would make it repeatable.
--   * The replay limit keeps counting raw `mission_runs`, unfiltered, so a
--     reset does not refill the hour's attempts.
--   * `player_achievements` rows ARE deleted by the reset route, not here. An
--     unlock time is a derived conclusion, not evidence — leaving it would show
--     an achievement as unlocked while the ledger it derives from says
--     otherwise, which is precisely the second-source-of-truth problem
--     §4 principle 12 exists to prevent.
--   * `player_active_days` is filtered by the route, not deleted, so the
--     streak restarts while the visit history stays intact.
