# CodeRaid — clear the decoration, then decide about the profile

Project: **`d:\coderaid`** (Windows). Next.js 14 App Router, TypeScript strict, Tailwind, Supabase.
A Node.js backend-debugging simulator: 14 playable missions, 6 stages each (Briefing →
Investigation → Diagnosis → Fix → Verification → Complete).

Read `docs/CURRENT_STATE.md` first. It was updated 2026-07-22 and is **accurate** — §16 is the
server architecture, §17 the verification replay, §12 the real debt. Trust it, and **keep it that
way: if you change behaviour, change the doc in the same pass.**

## Where things stand

`main` is at `17cd60a`. Two branches are pushed and **not yet merged** — merge in this order, the
second is stacked on the first:

1. **`authenticated-ci-specs`** (`e9238ca`) — eight Playwright specs that mint a Supabase session
   and cover grading, the ledger, the replay rule, the claim, the leaderboard and RLS. Closes the
   authenticated half of §12 item 2.
2. **`real-verification-replay`** (`b765f53`) — `event-loop-overload` now *executes* its incident:
   12,000 rows of real quadratic work, a 16ms probe, real main-thread measurement (§17). Also
   carries the decoration audit doc (§12 items 13–18).

**Blocking anything CI-related:** the three GitHub Actions secrets are still not set —
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Until an
admin adds them the nine authenticated specs **skip**, and the `smoke` job cannot pass at all:
without the URL, `/api/ledger` throws at runtime, `POST /api/runs` 500s instead of 401ing, and the
sign-in wall `mission-flow.spec.ts` asserts on never renders. **Confirm the secrets exist before
trusting a green CI.**

## Status 2026-07-28 — tasks 1–5 are DONE

All five are complete and on `real-verification-replay`, with §18 of `CURRENT_STATE.md` recording
them. Plus one defect not on this list: **a cached grade could outlive the answers it described**,
so changing a wrong fix to the correct one and verifying again redisplayed the previous unresolved
report — with no Run Verification button on screen to retry with (§18.1).

Two notes on how the tasks below were resolved, where the outcome differs from the instruction:

- **Task 3 (footer)** — the five `/demo` links were **removed**, not repointed. Writing privacy and
  terms copy is not a code decision; the links should return with the pages.
- **Task 5 (`done` flags)** — the premise was wrong. They were **not** dead: `MissionBrowser`
  rendered them and **six were authored `true`**, so five missions showed players objectives ticked
  on their behalf. `Objective` is now `string` and `validate:missions` enforces it.

**What remains** is the two decisions below, plus the profile (§12 item 17), plus everything under
"Also open". `main` is still behind — merge `real-verification-replay` (it contains
`authenticated-ci-specs`) and confirm the three CI secrets exist, or CI stays green for the wrong
reason.

## Tasks, in order (all five done — kept for context)

1. **Fix the logout — this is a live defect, not cleanup.** §12 item 13.
   `components/dashboard/DashboardSidebar.tsx` renders Log out as `<Link href="/">`, which navigates
   home and **leaves the session intact**. A correct route already exists at
   `app/auth/sign-out/route.ts` — deliberately a `POST`, with a comment explaining that a `GET`
   would let any page log the player out with an `<img>` tag — and **nothing calls it.** Wire a form
   or button that POSTs to it. Then add an e2e spec: sign in, log out, assert `/api/ledger` 401s
   afterwards. The fixture in `e2e/support/` already mints sessions.

2. **Delete the Premium block.** §12 item 14. The sidebar's "Go Premium / Upgrade Now" is a
   `<button type="button">` with no handler, selling "premium incidents, exclusive rewards and
   advanced analytics" that do not exist and cannot be bought. Remove `PREMIUM` from
   `lib/dashboard.ts` and the block from the sidebar — the same reasoning that removed the theme
   toggle, `defaultLanguage`, `soundEffects` and the three fake leaderboard scopes.

3. **Fix the footer links.** §12 item 15. `components/Footer.tsx` points **Privacy Policy** and
   **Terms of Service** at `/demo`, a placeholder reading "Watch the demo"; GitHub, Twitter and
   Discord too. Either write real pages or remove the links — do not leave a Terms link that is not
   terms now that real accounts and a database exist. **Ask which:** writing legal copy is not your
   call.

4. **Delete `RESPONSE_SERIES`.** §12 item 16. A hardcoded 21-point "noisy, elevated latency series"
   in `lib/dashboard.ts`, rendered on the Next Action card beside a **real** headline metric and
   identical for every mission. Either derive it from that mission's own authored investigation
   series or drop the chart.

5. **Delete the 80 objective `done` flags.** §12 item 18. `MissionObjectives` takes
   `steps: string[]` and never reads them, so nothing renders — but they are 80 authored assertions
   about a player's progress, which §4.10 forbids. Consider a `validate:missions` rule so they
   cannot come back; that is where authored player-state is already caught.

## Decisions to bring back, not to make silently

- **§12 item 17 — the profile never reaches the server.** `players` carries `display_name`,
  `avatar_id`, `slogan`, `path_id`, `experience_id` and `onboarding_completed`, and `0001_init.sql`
  grants `UPDATE` on exactly those six columns to `authenticated` — the only write a player is
  allowed. **Nothing writes any of them.** Settings and onboarding persist to `coderaid:profile` in
  `localStorage`, while the leaderboard renders the GitHub-derived `display_name` written once by
  the sign-up trigger. So renaming yourself in Settings changes nothing anyone else sees. This is a
  feature gap rather than clutter — the schema was built for it — but wiring it changes what other
  players see, so **ask before building it.**

- **§12 item 7 — there is still no server-side reset.** Runs are append-only, so "Reset Progress"
  cannot erase earned XP; the copy already says what it actually does. Whether an account should be
  able to wipe its own history, and whether that is even coherent with an append-only ledger,
  remains undecided.

## Also open, lower priority

- **13 of 14 missions still use the 1,400ms timer.** §17 names the three honest candidates for a
  real replay: `promise-all-cascade`, `async-map-trap`, `overlapping-scheduler-runs` — all pure
  JavaScript-runtime behaviours a browser genuinely exhibits. Most of the catalogue cannot have one
  honestly, and faking it would be the same theatre in a better costume.
- **Content scale is the product bottleneck** (§12 item 3): the whole catalogue is worth 1,830 XP
  against a 10,000 XP Backend Engineer rank.
- CI builds twice per run; `/api/ledger` costs 3 Postgres round trips; the leaderboard reads all of
  `best_runs`. All still "honest at this scale".
- No component tests; browser coverage is one mission deep.

## How to work

- **Six gates, all green, in this order:**
  `npm run typecheck | lint | validate:missions | build | test`, then `npx playwright test`.
- **`build` MUST run before `test`.** `tests/bundle-secrecy.test.ts` greps `.next` and skips itself
  when it is absent. Two silent traps, in opposite directions:
  - a **stale** `.next` reports phantom leaks — delete and rebuild before believing a failure;
  - **no** `.next` makes it skip entirely, which is how it did nothing in CI for weeks.
- **Verify empirically — run the thing, don't assert it works.** Every pass on this project has
  caught real problems that way: a leaked answer compiled into the client bundle, a "quadratic"
  workload that was not quadratic, a flaky timing assertion, and a Playwright fixture that ran
  signed out in silence.
- **When you add a guard, prove it can fail.** Mutate the thing it protects, watch it go red, revert.
  Three separate checks in this repo have at some point done nothing while reporting success.
- **Never print secrets.** `.env.local` holds the Supabase keys — read variable NAMES, never values.
- **The e2e specs write to the live Supabase project**; there is no local stack. Users are
  namespaced `coderaid-e2e+…@example.com` and torn down in the fixture. A dedicated CI project is
  the right fix and is recorded under §12 item 2.
- If `node_modules` looks incomplete (missing vitest/eslint/tsx/`@supabase/*`), run `npm install`.
  Restore `package-lock.json` afterwards if npm only churns line endings.
- **Flag design decisions rather than making them silently**, especially anything that changes
  gameplay or moves the sign-in wall.
