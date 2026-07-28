# CodeRaid — decide about the profile, then grow the content

Project: **`c:\Users\DoC\Desktop\sis`** (Windows; the repo is `ArsenDev96/coderaid`). Next.js 14 App
Router, TypeScript strict, Tailwind, Supabase. A Node.js backend-debugging simulator: 14 playable
missions, 6 stages each (Briefing → Investigation → Diagnosis → Fix → Verification → Complete).

Read `docs/CURRENT_STATE.md` first. It was updated 2026-07-22 and is **accurate** — §16 is the
server architecture, §17 the verification replay, §12 the real debt. Trust it, and **keep it that
way: if you change behaviour, change the doc in the same pass.**

## Where things stand

`main` has both previously-pending branches merged (`authenticated-ci-specs` and
`real-verification-replay`, merged as PR #1), plus the decoration pass described below.

**The three GitHub Actions secrets are now set** — `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. CI can therefore run the eleven
authenticated specs for the first time. **Confirm in the job log that they *ran* rather than
skipped** before trusting a green check: `hasCredentials()` skips them silently, and a skipped run
is the same colour as a passing one. Note also that repository secrets are not exposed to **fork**
pull requests, so those still skip by design.

### Done in the decoration pass (2026-07-22) — do not re-plan these

§12 items 13–16 and 18 are closed. Six-gate green; the suite is 480 tests across 18 files plus 13
Playwright specs.

- **Logout was a live defect and is fixed.** It was `<Link href="/">` — navigated home, session
  fully intact. Now a form POSTing to the POST-only `/auth/sign-out`. Two specs assert the *server*
  stops answering (`/api/ledger` → 401), plus that a `GET` returns 405 **without** ending the
  session. Both proven to fail before being kept.
- **Deleted:** the Premium block, `RESPONSE_SERIES`, and the footer's five `/demo` links (Privacy
  Policy, Terms of Service, GitHub, Twitter, Discord — removed rather than written, on your call).
- **The Next Action sparkline is derived** from each mission's own `metrics.latency.series`.
- **The 80 objective `done` flags are gone — and the audit was wrong that they were dead.**
  `MissionBrowser` read `o.done`; six were authored `true`, so players saw pre-ticked objectives in
  missions they had never opened. Type + `validate:missions` now both refuse the field.

## The decision to make first

**§12 item 17 — the profile never reaches the server.** This is the one decoration-audit item still
open, and it is a product decision, not a cleanup.

`players` carries `display_name`, `avatar_id`, `slogan`, `path_id`, `experience_id` and
`onboarding_completed`, and `0001_init.sql` grants `UPDATE` on exactly those six columns to
`authenticated` — the only write a player is allowed. **Nothing writes any of them.** Settings and
onboarding persist to `coderaid:profile` in `localStorage`, while the leaderboard renders the
GitHub-derived `display_name` written once by the sign-up trigger. So renaming yourself in Settings
changes nothing anyone else sees.

The schema was built for this, so it is a feature gap rather than clutter — but wiring it changes
what other players see on the leaderboard, which brings a display-name moderation question with it.
**Ask before building it.**

Also still undecided: **§12 item 7 — there is no server-side reset.** Runs are append-only, so
"Reset Progress" cannot erase earned XP; the copy already says what it actually does. Whether an
account should be able to wipe its own history, and whether that is coherent with an append-only
ledger, remains open.

## Also open, lower priority

- **13 of 14 missions still use the 1,400ms timer.** §17 names the three honest candidates for a
  real replay: `promise-all-cascade`, `async-map-trap`, `overlapping-scheduler-runs` — all pure
  JavaScript-runtime behaviours a browser genuinely exhibits. Most of the catalogue cannot have one
  honestly, and faking it would be the same theatre in a better costume.
- **Content scale is the product bottleneck** (§12 item 3): the whole catalogue is worth 1,830 XP
  against a 10,000 XP Backend Engineer rank. This is probably the highest-value work left.
- **A dedicated CI Supabase project** (§12 item 2). The e2e specs write to the live project; now
  that CI has the secrets, every push to `main` creates and deletes real users in production.
- CI builds twice per run; `/api/ledger` costs 3 Postgres round trips; the leaderboard reads all of
  `best_runs`. All still "honest at this scale".
- No component tests; browser coverage is one mission deep.
- `/demo` is still a `PlaceholderPage`. Nothing in the footer points at it any more, but the
  landing page still does.

## How to work

- **Six gates, all green, in this order:**
  `npm run typecheck | lint | validate:missions | build | test`, then `npx playwright test`.
- **`build` MUST run before `test`.** `tests/bundle-secrecy.test.ts` greps `.next` and skips itself
  when it is absent. Two silent traps, in opposite directions:
  - a **stale** `.next` reports phantom leaks — delete and rebuild before believing a failure;
  - **no** `.next` makes it skip entirely, which is how it did nothing in CI for weeks.
- **Verify empirically — run the thing, don't assert it works.** Every pass on this project has
  caught real problems that way. The decoration pass alone caught two: a `const` declared below the
  module-level `NEXT_ACTION` that built fine and then threw `Cannot access 'b' before
  initialization` at prerender, and an audit claim that 80 flags were unrendered when the mission
  browser was rendering six of them as completed checkmarks.
- **When you add a guard, prove it can fail.** Mutate the thing it protects, watch it go red, revert.
  Four separate checks in this repo have at some point done nothing while reporting success.
- **Never print secrets.** `.env.local` holds the Supabase keys — read variable NAMES, never values.
- **The e2e specs write to the live Supabase project**; there is no local stack. Users are
  namespaced `coderaid-e2e+…@example.com` and torn down in the fixture. A dedicated CI project is
  the right fix and is recorded under §12 item 2.
- If `node_modules` looks incomplete (missing vitest/eslint/tsx/`@supabase/*`), run `npm install`.
  Restore `package-lock.json` afterwards if npm only churns line endings.
- **Flag design decisions rather than making them silently**, especially anything that changes
  gameplay or moves the sign-in wall.
