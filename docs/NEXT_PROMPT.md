# CodeRaid — close the `/api/runs` oracle, then grow the content

Project: **`c:\Users\DoC\Desktop\sis`** (Windows; the repo is `ArsenDev96/coderaid`). Next.js 14 App
Router, TypeScript strict, Tailwind, Supabase. A Node.js backend-debugging simulator: 14 playable
missions, 6 stages each (Briefing → Investigation → Diagnosis → Fix → Verification → Complete).

Read `docs/CURRENT_STATE.md` first. It was updated 2026-07-29 and is **accurate** — §16 is the
server architecture (§16.7 is new), §17 the verification replay, §12 the real debt. Trust it, and
**keep it that way: if you change behaviour, change the doc in the same pass.**

## Where things stand

`main` carries the profile pass (merged as PR #3). Branch `real-verification-replay` carries the
docs catch-up and the `best_runs` lock. The suite is **571 tests across 22 files** plus **30
Playwright specs**, and all six gates are green.

**`supabase/migrations/` is not applied automatically.** There is no linked Supabase CLI project and
no database password in `.env.local` — only the URL, the anon key and the service-role key, none of
which can run DDL. Migrations are applied by hand in the Supabase dashboard's SQL editor. Check that
a migration in the tree is actually live before trusting a spec that depends on it; running
`e2e/view-privileges.spec.ts` is the fastest way to confirm 0003 is in place.

### Done in the profile pass (2026-07-29) — do not re-plan these

**§12 item 17 is closed: the profile reaches the server.**

- `POST /api/profile` writes the six columns `0001_init.sql` has granted to `authenticated` since
  the first migration and which nothing had ever used. `lib/server/profile.ts` bounds the update;
  `lib/profile-client.ts` holds the wire shape both halves import.
- **It is the only route in the app that runs as the signed-in user rather than as service-role.**
  That is deliberate and is the interesting part — see §16.7. The column grant means Postgres
  refuses `claimed_at` and every scored table *even if the handler is wrong*; with the admin client
  it would not.
- The read path closes the loop: `hasClaimed()` became `playerRecord()`, `/api/ledger` answers
  `{ ledger, claimed, profile }` on both verbs, and `ProgressProvider` layers the server profile
  over the local draft field by field. A device that has never seen this player's `localStorage`
  now shows their real name instead of "Operative".
- Three ornaments went with it: the landing page's preview tabs switch and its CTA opens
  `user-signup-latency-spike`; the top bar's account menu opens.

**Still open from item 17: display-name moderation.** `sanitizeDisplayName` is a *rendering* guard —
it strips control characters, zero-width characters and bidi overrides so one player's name cannot
break or reorder the leaderboard row beside it. It is not a word list and there is no review queue.
Whether CodeRaid needs moderation, and of what kind, is a product decision. **Ask before building
it.**

### Done in the `best_runs` lock (2026-07-29) — do not re-plan this

**§12 item 20, the most serious defect found on this project, is closed.** `public.best_runs` is a
view over an RLS-protected table, and a Postgres view does not enforce that RLS unless declared
`security_invoker`. Supabase grants `SELECT` on public relations to `anon` by default, so the view
served every player's runs — **including `root_cause_id`, `evidence_ids` and `fix_id`, the answer
key** — to anyone with the anon key that ships in the client bundle, no session. The tables held
(`mission_runs` and `players` both returned `[]`); only the view was open, and it was open to
`authenticated` as well.

`0003_lock_best_runs.sql` sets `security_invoker` **and** revokes from both roles — two guards,
because `create or replace view` silently drops the setting. The alarm is
`e2e/view-privileges.spec.ts` (§15.6), which was proven to fail by the vulnerability itself rather
than by a mutation. The house rule for future views is written beside the RLS block in
`0001_init.sql`. Read §12 item 20 before adding any view.

## Do this first — `/api/runs` is an enumerable answer oracle

**§12 item 19.** The remaining hole in the trust model, and the same shape of mistake as item 20:
each individual guard is sound and the composition is not. Three properties combine:

- **No server-side stage gating.** `StageGate` is client-side, so a submission is accepted whether or
  not the player ever opened the investigation.
- **No rate limit.** Nothing bounds how many submissions a player may make.
- **Best-run-wins makes a wrong guess free.** A worse replay is recorded and changes nothing, so a
  wrong answer costs only a row in `mission_runs`.

And the response carries the full breakdown — root cause 45, evidence 25, fix 30 — so each attempt
says *which part* was right. A caller can separate the three answers instead of searching their
product, and reach 100 by enumeration. §16.3 argues that grading at the commit point avoids an
oracle; it removed the *free* oracle, not the oracle.

**Cheapest fix: return the full breakdown only when a run improves on the player's best.** The score
still comes back, so the results screen works and an honest replay sees its gain; a run that beat
nothing gets the score and no component split. That removes the signal the search needs without a
rate limit, a stage-state table, or anything else the server would have to keep. `POST /api/runs`
already reads the ledger before the insert (to measure `creditBetween`), so it knows whether the run
improved anything without an extra round trip.

Whatever you do here, **add the guard first and prove it fails** — assert that a non-improving run's
response carries no per-component breakdown, and watch it go red against today's handler.

## Also open

- **§12 item 7 — there is no server-side reset.** Runs are append-only, so "Reset Progress" cannot
  erase earned XP; the copy already says what it actually does. Whether an account should be able to
  wipe its own history, and whether that is coherent with an append-only ledger, remains undecided.
- **Content scale is the product bottleneck** (§12 item 3): the whole catalogue is worth 1,830 XP
  against a 10,000 XP Backend Engineer rank. **This is the highest-value work once the above is
  done.** Chapters 4 and 5 hold the next 6 missions; every system already built scales with content.
- **A dedicated CI Supabase project** (§12 item 2). The e2e specs write to the live project, so every
  push to `main` creates and deletes real users in production.
- 13 of 14 missions still use the 1,400ms timer. §17 names the three honest candidates for a real
  replay: `promise-all-cascade`, `async-map-trap`, `overlapping-scheduler-runs`. Most of the
  catalogue cannot have one honestly, and faking it would be the same theatre in a better costume.
- CI builds twice per run; `/api/ledger` costs 3 Postgres round trips; the leaderboard reads all of
  `best_runs`. All still "honest at this scale".
- No component tests; browser coverage is one mission deep. `/demo` is still a `PlaceholderPage`,
  still linked from the landing page.

## How to work

- **Six gates, all green, in this order:**
  `npm run typecheck | lint | validate:missions | build | test`, then `npx playwright test`.
- **`build` MUST run before `test`.** `tests/bundle-secrecy.test.ts` greps `.next` and skips itself
  when it is absent. Two silent traps, in opposite directions:
  - a **stale** `.next` reports phantom leaks — delete and rebuild before believing a failure;
  - **no** `.next` makes it skip entirely, which is how it did nothing in CI for weeks.
  A third face of the same problem, seen 2026-07-29: a stale `.next` can fail **the build itself**
  with `ENOENT` naming a route you never touched. An immediate re-run fixed it with no source
  change. Treat that shape of error as a stale artifact until a clean rebuild says otherwise.
- **Verify empirically — run the thing, don't assert it works.** Every pass on this project has
  caught real problems that way, including the two documented under §12 item 16 and the fact that
  `best_runs` leaks to `authenticated` and not only to `anon`.
- **When you add a guard, prove it can fail.** Mutate the thing it protects, watch it go red, revert.
  Several checks in this repo have at some point done nothing while reporting success.
- **Never print secrets.** `.env.local` holds `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` — read variable NAMES, never
  values.
- **Do not put invisible characters in source as literals.** `lib/server/profile.ts` and
  `tests/profile.test.ts` both use numeric code points on purpose: a literal zero-width character
  silently vanishes when a tool touches the file, and an escaped character class is a line nobody
  can proofread.
- **The e2e specs write to the live Supabase project**; there is no local stack. Users are
  namespaced `coderaid-e2e+…@example.com` and torn down in the fixture. A dedicated CI project is
  the right fix and is recorded under §12 item 2.
- CI has the three GitHub Actions secrets, so the thirteen authenticated specs can run. **Confirm in
  the job log that they *ran* rather than skipped** — `hasCredentials()` skips them silently, and a
  skipped run is the same colour as a passing one. Repository secrets are not exposed to **fork**
  pull requests, so those still skip by design.
- If `node_modules` looks incomplete (missing vitest/eslint/tsx/`@supabase/*`), run `npm install`.
  Restore `package-lock.json` afterwards if npm only churns line endings.
- **Flag design decisions rather than making them silently**, especially anything that changes
  gameplay or moves the sign-in wall.
