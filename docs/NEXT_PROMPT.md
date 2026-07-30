# CodeRaid — the MVP is scope-complete; decide the reset, then harden

Project: **`d:\coderaid`** on this machine (there is also a checkout at
`c:\Users\DoC\Desktop\sis` — both are real, do not "fix" either path). The repo is
`ArsenDev96/coderaid`. Next.js 14 App Router, TypeScript strict, Tailwind, Supabase. A Node.js
backend-debugging simulator: 14 playable missions, 6 stages each (Briefing → Investigation →
Diagnosis → Fix → Verification → Complete).

Read `docs/CURRENT_STATE.md` first. It was updated 2026-07-30 and is **accurate** — §16 is the
server architecture, §17 the verification replay, §12 the real debt. Trust it, and **keep it that
way: if you change behaviour, change the doc in the same pass.**

## Where things stand

**The MVP is scope-complete.** The catalogue is deliberately frozen at **14 missions and 1,830 XP** —
§12 item 3 is closed as a *decision*, not as work. Chapters 4 and 5 stay Coming Soon. Do not plan
content growth unless the product owner reopens it.

The suite is **623 tests across 25 files** plus **33 Playwright specs**, and all six gates are green.

**`supabase/migrations/` is not applied automatically.** There is no linked Supabase CLI project and
no database password in `.env.local` — only the URL, the anon key and the service-role key, none of
which can run DDL. Migrations are applied by hand in the Supabase dashboard's SQL editor. Check that
a migration in the tree is actually live before trusting a spec that depends on it; running
`e2e/view-privileges.spec.ts` is the fastest way to confirm 0003 is in place.

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

## Do this first — decide the server-side reset (§12 item 7)

The last undecided item on the list, and like the rate limit it needs a decision before it needs code.

Runs are append-only, so "Reset Progress" cannot erase earned XP for a signed-in player; the copy
already says what it actually does. What is undecided:

- Should an account be able to wipe its own history at all?
- If yes, is that a **delete** (which breaks the append-only guarantee that makes best-run-wins a
  query rather than a mutation, and makes the replay limit self-enforcing) or a **tombstone** — a
  `reset_at` on `players` that every derivation reads past?
- What happens to achievements already stamped, and to the leaderboard row?

The tombstone is the shape that keeps every existing invariant, and it is worth saying so when you
raise it. **Ask before building it.**

## Also open

- **Display-name moderation** — the residue of §12 item 17. `sanitizeDisplayName` is a *rendering*
  guard: it strips control characters, zero-width characters and bidi overrides so one player's name
  cannot break or reorder the leaderboard row beside it. It is not a word list and there is no review
  queue. Whether CodeRaid needs moderation, and of what kind, is a product decision. **Ask first.**
- **A dedicated CI Supabase project** (§12 item 2). The e2e specs write to the live project, so every
  push to `main` creates and deletes real users in production. This is now the largest piece of
  infrastructure debt. Note the replay-limit specs each insert 9 rows per run.
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
  because it never covered the radar.
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
- **The e2e specs write to the live Supabase project**; there is no local stack. Users are
  namespaced `coderaid-e2e+…@example.com` and torn down in the fixture. A dedicated CI project is
  the right fix and is recorded under §12 item 2.
- CI has the three GitHub Actions secrets, so the authenticated specs can run. **Confirm in the job
  log that they *ran* rather than skipped** — `hasCredentials()` skips them silently, and a skipped
  run is the same colour as a passing one. Repository secrets are not exposed to **fork** pull
  requests, so those still skip by design.
- If `node_modules` looks incomplete (missing vitest/eslint/tsx/`@supabase/*`), run `npm install`.
  Restore `package-lock.json` afterwards if npm only churns line endings.
- **Flag design decisions rather than making them silently**, especially anything that changes
  gameplay or moves the sign-in wall.
