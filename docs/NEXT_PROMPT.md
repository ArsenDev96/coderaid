# CodeRaid — the MVP is scope-complete and the debt list has no undecided items left; harden

Project: **`d:\coderaid`** on this machine (there is also a checkout at
`c:\Users\DoC\Desktop\sis` — both are real, do not "fix" either path). The repo is
`ArsenDev96/coderaid`. Next.js 14 App Router, TypeScript strict, Tailwind, Supabase. A Node.js
backend-debugging simulator: 14 playable missions, 6 stages each (Briefing → Investigation →
Diagnosis → Fix → Verification → Complete).

Read `docs/CURRENT_STATE.md` first. It was updated 2026-07-31 and is **accurate** — §16 is the
server architecture, §17 the verification replay, §12 the real debt. Trust it, and **keep it that
way: if you change behaviour, change the doc in the same pass.**

## Where things stand

**The MVP is scope-complete.** The catalogue is deliberately frozen at **14 missions and 1,830 XP** —
§12 item 3 is closed as a *decision*, not as work. Chapters 4 and 5 stay Coming Soon. Do not plan
content growth unless the product owner reopens it.

The suite is **646 tests across 26 files** plus **37 Playwright specs**, and all six gates are green.

**`supabase/migrations/` is still not applied to the HOSTED project automatically.** There is no
linked Supabase CLI project and no database password in `.env.local` — only the URL, the anon key and
the service-role key, none of which can run DDL. Hosted migrations are applied by hand in the
dashboard's SQL editor. Check a migration is actually live before trusting a spec that depends on it:
`e2e/view-privileges.spec.ts` confirms 0003, and the four reset specs in `authenticated.spec.ts`
confirm 0004. **All five are live as of 2026-07-31** — 0001–0004 verified by reading
`players.reset_at` and `best_runs.source` with the service key and confirming anon still gets `42501`
on the view. **0005 cannot be verified from outside** (§12 item 21): it is additive over an
already-permissive baseline, so it has no observable signature the way a new column does. What was
verified is that all 37 specs still pass against the hosted project after it.

**CI is a different story now, and this is the important change.** `supabase/config.toml` is
committed and CI runs `npx supabase start` — a full stack in Docker, **every migration applied from
an empty database, on every run**. So the hand-application gap above is a hosted-project problem
only: a migration that cannot be applied now fails CI. That is not hypothetical, it is why the gap
mattered — 0004 was a file in the tree that the database refused. **You can run the same stack
locally** (Docker required): `npx supabase start`, then point the three env vars at what
`npx supabase status -o env` prints.

### Done in the MVP-ceiling pass (2026-07-30) — do not re-plan these

Freezing the catalogue turned three "true statements about an unfinished catalogue" into permanent
promises the product cannot keep, which §4 principle 11 forbids. The rule now in force is **anything
beyond the derived XP ceiling is rendered as roadmap and excluded from progress counts.**

- **`lib/reach.ts` is new** and measures the catalogue: XP ceiling, per-skill XP and level ceilings,
  playable and per-chapter counts. Every figure derived, nothing written down.
- **Four of six career ranks** (Node.js Developer and up) and **two achievements**
  (`backend-engineer-rank` at 10,000 XP, `event-loop-master` at skill level 7 against a ceiling of 2)
  are out of reach and now render as roadmap: muted, badged Coming Soon, no progress bar, no CTA,
  sorted last, and **excluded from both halves of the unlocked-of-total figure**.
- **`Achievement.roadmap` is derived, not authored.** Writing Chapter 4 lifts the treatment with no
  threshold edited anywhere, and `tests/reach.test.ts` has two forward-looking cases that **go red on
  purpose** to tell that pass what to stop badging.
- **A real defect went with it.** `streams` and `validation` have no authored mission, and their two
  permanent zeros were averaged into `skillsSummary().overall` and two radar axes — scoring the player
  against content that does not exist. A flawless playthrough read **63%** where it should have read
  70%. Planned skills are excluded from every aggregate now; still rendered, badged Coming Soon.
- **`rankBand()` takes a ceiling.** When the next rank is beyond it, the dashboard bar measures
  progress toward *exhausting the catalogue* — 600 of 1,830, not 600 of 3,000.
- **Left alone deliberately:** 100% overall mastery is still unreachable, because `masteryPct`
  measures the climb to level 10 and most skills cannot get there at 14 missions. It is a progress
  figure, not a goal or a locked card, so nothing promises it. Pinned by a test so it does not get
  re-read as a bug.

### Done in the replay-limit pass (2026-07-30) — do not re-plan this

**The open work on §12 item 19 is finished.** `lib/replay-limit.ts`: **8 graded attempts per mission
per rolling hour, per mission rather than per account.** Past the limit the run is **still graded and
recorded**, and the response carries `{ limited }` with **no `grade`, no `ledger` and no `credit`** —
the ledger names the best run's `resolved` and `score`, so returning it would disclose by the back
door exactly what the withheld grade protects. Recorded rather than rejected because the row is what
makes the limit self-enforcing, and a 429 would tell the caller where the boundary is. Counted on
`completed_at` (the database's `now()`), never on the attacker-controlled `completed_on`. The
verification screen has a non-error state for it that says the score still counts.

**Item 19 is still labelled "narrowed", not "closed", and that is correct.** A player can always read
their own best run through `GET /api/ledger` — that is their earned result and the dashboard is built
from it — so the limit bounds how *fast* an enumerator learns, not what a determined one eventually
can. It is a cost control. Don't "finish" it without a product decision about what players may see of
their own history.

### Done in the reset pass (2026-07-31) — do not re-plan this

**§12 item 7 is closed, as a TOMBSTONE rather than a delete.** `players.reset_at` marks the moment a
player started over; every derivation reads past it and **nothing leaves `mission_runs`**. A delete
was rejected because append-only is load-bearing in three places — it is what makes best-run-wins a
query, what makes a replay an upgrade rather than a second award, and what makes the replay limit
self-enforcing. That last one is the sharp edge: the limit **counts rows**, so deleting them would
have turned Reset Progress into a rate-limit bypass. There is a spec pinning exactly that.

`best_runs` applies the filter in SQL (0004), so the ledger *and* the leaderboard reset together.
`lib/reset.ts` covers only what the view cannot reach: **active days are filtered** (streak restarts,
visit history survives, and the reset day itself counts) and **achievement stamps are deleted**,
because an unlock time is a derived conclusion rather than evidence. `POST /api/reset` holds the
service-role key — the opposite of `/api/profile`, and §16.8 says why: a browser-writable `reset_at`
could be set to the **future**, silently voiding every future run. A reset does **not** refill the
replay limit, re-open the one-time claim, touch the profile, or delete the account.

**Two real defects were found by running it, not by reading it. Both are worth remembering:**

- **The tombstone was stamped from the wrong clock.** The route wrote `new Date().toISOString()` —
  the app server's time — into a column compared against `mission_runs.completed_at`, which is the
  *database's* `now()`. The two differed by ~2 seconds, enough for a just-finished run to survive its
  own tombstone. `/api/runs` already states this rule about the *browser's* clock; the server's own
  clock is where it did not look like it applied. Now writes Postgres's `'now'` (§16.8).
- **`best_runs` could no longer be replaced.** 0003 changed the view's *options* with `alter view`,
  so the live view still carried the column list 0001 expanded from `mission_runs.*` — from before
  0002 added `source`. `create or replace view` may only append columns, so re-expanding the star
  failed with `42P16`. 0004 drops and recreates, which makes its `revoke` load-bearing a second time:
  a recreated view is a **new relation** and Supabase re-grants `SELECT` on those to `anon`. The
  corollary is now written beside the house rule in `0001_init.sql`.

**If you touch any of this, the mutation log in §15.5 is the thing to re-run.** One of the five
mutations initially *passed* — the claim guard asserted a 409 that a partial unique index produces
whether or not `claimed_at` was cleared, so it could not see the decision being reversed. The spec
now asserts the column directly.

### Done in the CI-isolation pass (2026-07-31) — do not re-plan this

**§12 item 2's infrastructure half is closed with an ephemeral local Supabase stack**, not a second
hosted project. CI runs `supabase start`, applies all five migrations from an empty database, runs
the suite, and tears it down. No CI traffic in production; migrations verified by machine on every
run; fork PRs no longer skip the twenty authenticated specs.

**It found a dated defect — §12 item 21, and this one has a deadline.** The schema **never granted a
privilege to `service_role` or `authenticated`**. It worked only because the hosted project was
created under Supabase's old auto-expose default, which is being withdrawn; `supabase/config.toml`
names **2026-10-30**. On a fresh stack, `service_role` — the only writer of anything scored — got
`401 permission denied for table players`. `0005_explicit_grants.sql` declares what the app actually
uses. It is additive, changed nothing in production, and is applied.

Two things to carry forward:

- **Never widen `0005` into `grant … on all tables in schema public`.** It would re-grant `best_runs`
  and silently reopen §12 item 20 — the answer-key leak. The file re-asserts the revoke last for
  exactly this reason, and says so.
- **The `view-privileges` control spec now proves reachability with the service-role key**, because
  under the new default `anon` is refused everywhere and "refused" stopped being able to distinguish
  a locked-down project from an unreachable one. If you touch it, re-prove it the way §15.6 records:
  reintroduce the leak on a local stack rather than mutating the assertion.

## Also open

- **Display-name moderation** — the residue of §12 item 17. `sanitizeDisplayName` is a *rendering*
  guard: it strips control characters, zero-width characters and bidi overrides so one player's name
  cannot break or reorder the leaderboard row beside it. It is not a word list and there is no review
  queue. Whether CodeRaid needs moderation, and of what kind, is a product decision. **Ask first.**
- **~~A dedicated CI Supabase project~~ (§12 item 2). Done 2026-07-31, as an ephemeral local stack
  rather than a second hosted project** — cheaper, applies the migrations itself, and needs no
  secrets. Do not re-plan it. What remains under item 2 is only the *testing* half: still no
  component tests, still one mission deep in the browser.
- **Account deletion does not exist**, and the reset dialog is careful to say so: it tells the player
  their runs "stay recorded, they just stop counting", never that they are deleted. A genuine erasure
  request is a different feature with a different name, and it *should* delete the account. Nothing
  currently promises it, so this is a gap rather than a broken promise — but it is the obvious next
  question a player asks after using Reset Everything. **Ask before building it.**
- **No component tests; browser coverage is one mission deep** (rest of §12 item 2).
- **Next 16 migration** (§12 item 12) — 1 high + 1 moderate production advisory, unfixable in the
  14.x line. Every remaining advisory needs a feature CodeRaid does not use (no `middleware.ts`, no
  `next/image`, no i18n, no rewrites, no server actions), so this is low urgency but genuinely open.
  **Re-measure with `npm audit --omit=dev`** rather than trusting the headline count.
- 13 of 14 missions still use the 1,400ms timer. §17 names the three honest candidates for a real
  replay: `promise-all-cascade`, `async-map-trap`, `overlapping-scheduler-runs`. Most of the
  catalogue cannot have one honestly, and faking it would be the same theatre in a better costume.
- CI builds twice per run; `/api/ledger` costs 3 Postgres round trips; the leaderboard reads all of
  `best_runs`; `POST /api/runs` now costs one more read for the attempt count. All still "honest at
  this scale".
- `/demo` is still a `PlaceholderPage`, still linked from the landing page.

## How to work

- **Six gates, all green, in this order:**
  `npm run typecheck | lint | validate:missions | build | test`, then `npx playwright test`.
- **`build` MUST run before `test`.** `tests/bundle-secrecy.test.ts` greps `.next` and skips itself
  when it is absent. Two silent traps, in opposite directions:
  - a **stale** `.next` reports phantom leaks — delete and rebuild before believing a failure;
  - **no** `.next` makes it skip entirely, which is how it did nothing in CI for weeks.
  Two more faces of the same problem, both seen 2026-07-29:
  - a stale `.next` can fail **the build itself** with `ENOENT` naming a route you never touched. An
    immediate re-run fixed it with no source change.
  - **if anyone has run `npm run dev`, `bundle-secrecy` reports leaks that are not there.** The dev
    server writes unminified `hot-update.js` files into `.next/static/webpack/`, and unminified
    output keeps local variable names — `correctEvidenceIds` is a local in `lib/grading.ts`, so it
    surfaces as a "leak" in a file `next build` never produced. `rm -rf .next && npm run build` is
    the fix. **Check the reported paths before believing the failure**: `hot-update` in a path means
    dev artifacts, not a real leak.
- **Verify empirically — run the thing, don't assert it works.** Every pass on this project has
  caught real problems that way, including the 63%-mastery defect above, which was found by asserting
  what a *flawless* playthrough should score and watching the number come back wrong.
- **When you add a guard, prove it can fail.** Mutate the thing it protects, watch it go red, revert.
  Several checks in this repo have at some point done nothing while reporting success — including, in
  the ceiling pass, a first draft of `reach.test.ts` that passed against a mutated `categoryAverage`
  because it never covered the radar, and in the reset pass a claim spec that asserted a 409 two
  independent mechanisms produce, so removing one of them changed nothing it could see. **When an
  outcome is defended twice, assert the specific thing you meant, not the outcome.**
- **Beware `git checkout -- <file>` to revert a mutation when your own work on that file is still
  uncommitted** — it takes your changes with it. Copy the file aside first. This cost a re-fix in the
  reset pass.
- **Prefer deriving a figure to authoring one, and prefer a test that re-derives it independently.**
  `tests/reach.test.ts` checks the 1,830 ceiling twice: once as a sum over missions, once by playing
  every mission perfectly through the real grading engine. The second is what makes it evidence.
- **Never print secrets.** `.env.local` holds `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` — read variable NAMES, never
  values.
- **Do not put invisible characters in source as literals.** `lib/server/profile.ts` and
  `tests/profile.test.ts` both use numeric code points on purpose: a literal zero-width character
  silently vanishes when a tool touches the file, and an escaped character class is a line nobody
  can proofread.
- **In CI the e2e specs run against an ephemeral local Supabase stack**, not the live project
  (§12 item 2, closed 2026-07-31). `npx supabase start` applies all five migrations from empty, the
  suite runs, the stack is torn down. Nothing CI does reaches production any more.
- **Running them locally still writes to the live project** — that is what your `.env.local` points
  at. Users are namespaced `coderaid-e2e+…@example.com` and torn down in the fixture.
- **A skip in CI is now a hard error, not a policy.** `credentialsMissing()` throws whenever `CI` is
  set; locally, a missing `.env.local` still skips. You no longer have to confirm in the job log
  that the authenticated specs ran — that was load-bearing manual vigilance, and it failed: the key
  export could return success having exported nothing (§12 item 22). Forks no longer skip either;
  the local stack's keys are published demo values, so there is nothing to withhold.
- If `node_modules` looks incomplete (missing vitest/eslint/tsx/`@supabase/*`), run `npm install`.
  Restore `package-lock.json` afterwards if npm only churns line endings.
- **Flag design decisions rather than making them silently**, especially anything that changes
  gameplay or moves the sign-in wall.
