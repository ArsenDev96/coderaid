# CodeRaid — close the `best_runs` leak, then grow the content

Project: **`c:\Users\DoC\Desktop\sis`** (Windows; the repo is `ArsenDev96/coderaid`). Next.js 14 App
Router, TypeScript strict, Tailwind, Supabase. A Node.js backend-debugging simulator: 14 playable
missions, 6 stages each (Briefing → Investigation → Diagnosis → Fix → Verification → Complete).

Read `docs/CURRENT_STATE.md` first. It was updated 2026-07-29 and is **accurate** — §16 is the
server architecture (§16.7 is new), §17 the verification replay, §12 the real debt. Trust it, and
**keep it that way: if you change behaviour, change the doc in the same pass.**

## Where things stand

`main` carries everything. The profile pass is merged (PR #3); there is no unmerged branch and no
pending working-tree work. The suite is **571 tests across 22 files** plus **27 Playwright specs**,
and all six gates are green.

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

## Do this first — `best_runs` bypasses RLS

A Postgres view over an RLS-protected table does **not** enforce that RLS unless it is declared
`security_invoker`, and Supabase's default privileges grant `SELECT` on public relations to `anon`.
`public.best_runs` is such a view. Proven with the anon key that ships in the client bundle, no
session:

```
GET /rest/v1/mission_runs -> []          RLS holds
GET /rest/v1/players      -> []          RLS holds
GET /rest/v1/best_runs    -> every row   RLS bypassed
```

Each row carries `root_cause_id`, `evidence_ids`, `fix_id`, `score` and `resolved` — **the answer
key**, plus every player's run detail, to the open internet. It defeats the point of
`lib/server/answers.ts` and `tests/bundle-secrecy.test.ts`, which guard the bundle while the database
API is wide open, and it contradicts the privacy boundary `app/api/leaderboard/route.ts` documents.
It leaks to `authenticated` as well as `anon`, so the revoke must name both.

```sql
-- supabase/migrations/0003_lock_best_runs.sql
alter view public.best_runs set (security_invoker = true);
revoke all on public.best_runs from anon, authenticated;
```

`service_role` has `bypassrls`, so `ledgerFor()` and `standings()` are unaffected — **prove that
rather than assuming it.** Run the suite and the Playwright specs after applying it.

Then add the guard that would have caught it: a test hitting `/rest/v1/best_runs` with the anon key
and asserting `[]`. Without it this is a fix with no alarm behind it. **Mutate it and watch it go
red.** And make `security_invoker = true` the documented house rule for any future view, next to the
RLS comment block in `0001_init.sql`.

## Also open

- **§12 item 19 — `/api/runs` is an enumerable answer oracle.** New, recorded 2026-07-29. No
  server-side stage gating (`StageGate` is client-side), no rate limit, and best-run-wins makes a
  wrong guess free — while the response carries the full breakdown, so each attempt says *which*
  of the three answers was right and they can be searched separately. §16.3's argument that grading
  at the commit point avoids an oracle is only half right. **Cheapest fix: return the full breakdown
  only when a run improves on the player's best** — the score still comes back, so the results screen
  works and an honest replay sees its gain.
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
