-- CodeRaid — initial schema.
--
-- The organising rule carried over from lib/progress.ts: the mission runs are
-- the evidence, and every number the app shows is DERIVED from them. There is
-- deliberately no `total_xp` column anywhere — a stored total is a second
-- source of truth that can disagree with the runs behind it.
--
-- Trust model: progress is server-authoritative. Route handlers hold the
-- service-role key and are the only writer of anything a player is scored on.
-- RLS below grants players SELECT on their own rows and UPDATE on their own
-- *profile* columns only — never on a score, an XP value or a run.

/* ------------------------------- players -------------------------------- */

create table if not exists public.players (
  id                   uuid primary key references auth.users (id) on delete cascade,
  display_name         text        not null default 'Operative',
  avatar_id            text,
  slogan               text,
  -- The onboarding wizard's answers (lib/onboarding.ts).
  path_id              text,
  experience_id        text,
  onboarding_completed boolean     not null default false,
  created_at           timestamptz not null default now()
);

comment on table public.players is
  'One row per authenticated player. Identity and preferences only — nothing scored.';

/* ----------------------------- mission_runs ----------------------------- */
-- Append-only. A replay inserts a new row; nothing is ever updated in place,
-- so "best run wins" becomes a query rather than a mutation, and a player's
-- history stays intact for difficulty tuning later.

create table if not exists public.mission_runs (
  id            bigint generated always as identity primary key,
  player_id     uuid        not null references public.players (id) on delete cascade,
  mission_id    text        not null,

  -- Graded outcome. Written by the server only.
  score         smallint    not null check (score between 0 and 100),
  xp_earned     integer     not null check (xp_earned >= 0),
  resolved      boolean     not null,
  -- Per-skill award for THIS run, keyed by the skill ids in lib/skills.ts.
  skill_xp      jsonb       not null default '{}'::jsonb,

  -- What the player actually submitted, kept so a regrade after a content fix
  -- is possible and so wrong answers can be analysed.
  root_cause_id text,
  evidence_ids  text[]      not null default '{}',
  fix_id        text,

  -- Run telemetry.
  duration_ms   integer     not null check (duration_ms >= 0),
  hints_used    smallint    not null default 0 check (hints_used >= 0),

  completed_at  timestamptz not null default now(),
  -- The player's local calendar date — the unit the streak counts in, which is
  -- why it is stored rather than derived from completed_at in UTC.
  completed_on  date        not null
);

create index if not exists mission_runs_player_idx
  on public.mission_runs (player_id, mission_id);
create index if not exists mission_runs_completed_idx
  on public.mission_runs (completed_at desc);

/* --------------------------- player_active_days -------------------------- */
-- Opening the app is activity, which is what a streak actually measures — so
-- this is not derivable from mission_runs alone.

create table if not exists public.player_active_days (
  player_id uuid not null references public.players (id) on delete cascade,
  day       date not null,
  primary key (player_id, day)
);

/* --------------------------- player_achievements ------------------------- */
-- Stamped on the crossing, never authored, so "unlocked 3 days ago" is true.

create table if not exists public.player_achievements (
  player_id      uuid        not null references public.players (id) on delete cascade,
  achievement_id text        not null,
  unlocked_at    timestamptz not null default now(),
  primary key (player_id, achievement_id)
);

/* ------------------------------ best_runs ------------------------------- */
-- The ledger's `missions` map: one row per mission, the player's best run.
-- Ties break toward the earlier run, so a later equal score cannot restamp
-- the achievement dates that derive from it.

create or replace view public.best_runs as
select distinct on (player_id, mission_id)
       r.*,
       (select count(*) from public.mission_runs a
         where a.player_id = r.player_id and a.mission_id = r.mission_id) as attempts
  from public.mission_runs r
 order by player_id, mission_id, score desc, completed_at asc;

comment on view public.best_runs is
  'Best run per player per mission — the rows the ledger is summed from.';

/* --------------------------------- RLS ---------------------------------- */
--
-- HOUSE RULE FOR VIEWS — read this before adding another one.
--
-- Enabling RLS on a table does NOT protect a view over that table. A view's
-- queries run as the view's OWNER unless it is declared `security_invoker`, so
-- by default a view is a hole straight through every policy below it. Supabase
-- then grants SELECT on new public relations to `anon` and `authenticated`,
-- which means the hole is reachable with the anon key that ships in the client
-- bundle.
--
-- `best_runs` above was created without it and leaked every player's runs —
-- including `root_cause_id`, `evidence_ids` and `fix_id`, which is the answer
-- key `lib/server/answers.ts` exists to keep out of the browser. Fixed in
-- 0003_lock_best_runs.sql; that file records what was measured.
--
-- So: **every view over an RLS-protected table sets `security_invoker = true`
-- at creation, and grants nothing to `anon` or `authenticated` unless its rows
-- are genuinely public.** Both, not either — `create or replace view` silently
-- drops the setting, and the revoke is what survives that.
--
--   create view public.thing with (security_invoker = true) as select ...;
--   revoke all on public.thing from anon, authenticated;
--
-- `e2e/view-privileges.spec.ts` enforces this from outside the database.
--
-- AND THE COROLLARY, learned the hard way in 0004. `r.*` above is expanded to a
-- fixed column list at creation time, and `create or replace view` may only
-- *append* columns to that list — it cannot reorder or rename one. So once the
-- underlying table gains a column (0002 added `mission_runs.source`), this view
-- can no longer be replaced at all; the star re-expands with the new column in
-- the middle and Postgres refuses with `42P16`. A later migration that needs to
-- change the definition must `drop view` and recreate it.
--
-- Which makes the revoke load-bearing a second time, for a second reason: a
-- recreated view is a **new relation**, so Supabase's default privileges grant
-- `SELECT` on it to `anon` and `authenticated` all over again. Recreating this
-- view without the revoke reopens the hole 0003 closed.

alter table public.players            enable row level security;
alter table public.mission_runs       enable row level security;
alter table public.player_active_days enable row level security;
alter table public.player_achievements enable row level security;

-- Read your own everything.
create policy players_select_own on public.players
  for select to authenticated using (auth.uid() = id);

create policy runs_select_own on public.mission_runs
  for select to authenticated using (auth.uid() = player_id);

create policy active_days_select_own on public.player_active_days
  for select to authenticated using (auth.uid() = player_id);

create policy achievements_select_own on public.player_achievements
  for select to authenticated using (auth.uid() = player_id);

-- Write your own PROFILE, and nothing else. There is deliberately no insert,
-- update or delete policy on mission_runs, player_achievements or
-- player_active_days: the service-role key bypasses RLS, so the route handlers
-- remain the only writer of anything scored. RLS decides which ROW you may
-- touch, never which VALUES — which is exactly why grading cannot live here.
create policy players_update_own on public.players
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

revoke update on public.players from authenticated;
grant  update (display_name, avatar_id, slogan, path_id, experience_id, onboarding_completed)
  on public.players to authenticated;

/* -------------------------- new-user provisioning ------------------------ */
-- A players row is created by the database on sign-up, so no code path can
-- leave an authenticated user without one. GitHub gives us a name and avatar;
-- the onboarding wizard overwrites them if the player wants.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.players (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'user_name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(coalesce(new.email, 'Operative'), '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
