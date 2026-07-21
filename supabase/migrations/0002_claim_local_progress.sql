-- CodeRaid — claiming progress earned before accounts existed.
--
-- CodeRaid shipped as a localStorage prototype, so there are players with a
-- real ledger and no row in this database. Phase 4 lets them keep it: on first
-- sign-in they can hand over their local ledger once, and it becomes ordinary
-- mission_runs rows.
--
-- Synthesising runs rather than importing totals is the whole point. The
-- schema's organising rule is that the runs are the evidence and every number
-- is derived from them; writing a claimed XP total instead would reintroduce
-- exactly the second source of truth that rule exists to prevent. A claimed run
-- goes through best_runs, streaks and achievements like any other, and if the
-- player replays the mission, best-run-wins applies with no special case.

/* --------------------------- claim, once only ---------------------------- */
-- Nullable rather than a boolean: *when* they claimed is worth keeping, and a
-- null is unambiguously "never". The route handler checks this before writing,
-- and the partial unique index below is what makes the check race-proof.

alter table public.players
  add column if not exists claimed_at timestamptz;

comment on column public.players.claimed_at is
  'When this player imported a pre-account localStorage ledger. Null = never. One-time.';

/* ------------------------- where a run came from ------------------------- */
-- A claimed run is a record of something the player says they did before we
-- were recording, which is not the same as a run this server graded. Both
-- count toward progress; only one was witnessed. Keeping them distinguishable
-- costs one column and means the difficulty tuning the runs were kept for
-- isn't quietly polluted by unverified scores.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name   = 'mission_runs'
       and column_name  = 'source'
  ) then
    alter table public.mission_runs
      add column source text not null default 'played'
      check (source in ('played', 'claimed'));
  end if;
end
$$;

comment on column public.mission_runs.source is
  'played = graded by this server. claimed = imported from a pre-account local ledger, unverified.';

-- A player may claim at most one run per mission, whatever else they play.
-- This is the real guard: the route's claimed_at check can lose a race with
-- itself on a double-submit, and a unique index cannot.
create unique index if not exists mission_runs_one_claim_per_mission
  on public.mission_runs (player_id, mission_id)
  where source = 'claimed';

/* --------------------------------- RLS ----------------------------------- */
-- Unchanged in substance, and worth restating: there is still no insert policy
-- on mission_runs. A claim is written by a route handler holding the
-- service-role key after it has validated and re-derived everything it can, so
-- "claim" is not a hole in the trust model — it is one more thing the server
-- does on the player's behalf.
--
-- players.claimed_at is deliberately NOT added to the column-level UPDATE
-- grant, so a player cannot reset their own claim flag and import twice.
