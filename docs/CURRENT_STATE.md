# CodeRaid — Current State of the Codebase

> **Purpose of this document.** A complete, self-contained snapshot of what exists in the CodeRaid
> repository as of 2026-07-29. It is written to be handed to a planning model (ChatGPT) that has
> **no access to the code**, so it can plan next steps without re-deriving anything. Everything
> below is verified against the source, not aspirational.
>
> **TL;DR:** CodeRaid is a Next.js 14 **Node.js backend debugging and interview-preparation
> simulator**, backed by Supabase (Postgres + GitHub OAuth). The MVP scope is *Node.js and
> JavaScript-runtime problems inside backend services only*. Databases, caching, system design and
> cloud reliability are visible as clearly marked **future tracks** — not playable, CTAs disabled,
> excluded from progress. The full UI surface exists (landing, onboarding, dashboard, mission browser
> + map, a 6-stage mission flow, skills, achievements, leaderboards, settings).
>
> **Progress is server-authoritative.** The mission answers live behind `import "server-only"`, the
> grading runs in a route handler holding the service-role key, and the progression ledger — XP,
> level, rank, streak, skills, achievements — is *derived in Postgres from the runs the player
> actually finished*. The browser cannot compute a score, assert an unlock, or add to a total. See
> §16 for the whole architecture.
>
> **What is still `localStorage`:** the in-progress state of a mission you are playing (which
> evidence you marked, which root cause you picked, run telemetry) and your local preferences. None
> of it is scored. It is working state, and it is why a mission can be played without an account.
>
> **14 of 20 missions are now playable end to end** — all of Chapter 1, Chapter 2 and Chapter 3,
> which is the entire Node.js MVP — and
> every one is a real simulation: **answers are graded** against the
> authored correct root cause, evidence and fix, and **all progression is earned** — XP, level, rank,
> streak, per-skill XP, completed missions and achievement unlock times all derive from runs the
> player actually finished. A new player starts at zero. See §14 for the progression and grading
> model.
>
> **New in the quality-gates pass (2026-07-20):** the repo has working `typecheck`, `lint`, `test`
> and `validate:missions` commands (§2, §15); a Vitest suite covering the pure domain logic and the
> full mission flows; an automated **mission content validator** that reads the live catalogue and
> stage registries and fails on authoring mistakes the type system can't see (§15.2); and
> **client-side stage prerequisite guards** so a directly typed later-stage URL can't earn a graded
> run (§15.3).
>
> **New in the Chapter 1 pass (2026-07-20):** the four remaining Chapter 1 missions —
> `promise-all-cascade`, `async-map-trap`, `overlapping-scheduler-runs` and
> `unhandled-rejection-storm` — are fully authored and playable, making **Chapter 1 the first
> complete chapter**. The suite grew to 267 tests, including a parameterised flow suite that puts
> *every* playable mission through the perfect / wrong / hint / replay contract (§15.1).
>
> **New in the Chapter 2 pass (2026-07-20):** the four remaining Chapter 2 missions —
> `jwt-session-expiry`, `health-check-flapping`, `graceful-shutdown-bug` and `rate-limiter-race` —
> are fully authored and playable, making **Chapter 2 the second complete chapter** and taking the
> playable count to 10. The pre-existing `user-signup-latency-spike` evidence warning is fixed, so
> the validator's only remaining warning is the intentionally partial `slow-api-incident`. The suite
> grew to **338 tests across 12 files**, including a new `tests/chapter-two.test.ts` that asserts the
> chapter's ordering and the engineering correctness of each incident. CI now runs all five commands
> on `main` and on pull requests (§15.4).
>
> **New in the Chapter 3 pass (2026-07-20):** the four Chapter 3 missions — `memory-leak-worker`,
> `worker-queue-backlog`, `connection-pool-exhaustion` and `slow-api-incident` — are fully authored
> and playable, making **Chapter 3 the third complete chapter and closing the Node.js MVP at 14
> playable missions**. `slow-api-incident` kept its original investigation content, gained a trace
> tool and four more evidence items, and had its remaining four stages written; its primary skill
> moved from `performance-debugging` to the more precise `request-performance`, and its authored
> `done: true` objectives — the last player state left in the catalogue — were removed. The
> validator's final warning is gone: **0 errors, 0 warnings, 14 fully playable**. The suite grew to
> **425 tests across 13 files**, including a new `tests/chapter-three.test.ts` covering each
> incident's engineering correctness (a forced GC does not fix a leak, more workers do not fix a
> backlog, a bigger pool does not fix a leak, unrestricted `Promise.all()` does not fix an N+1) plus
> a documented progression-and-achievement audit. A **Playwright** Chromium smoke test was added
> (`e2e/`) that plays `event-loop-overload` through the real UI and checks the results-URL guard;
> it runs as a separate CI job. **Chapters 4 and 5 remain Coming Soon and non-playable.**
>
> **New in the settings pass (2026-07-21):** every preference the Settings page still offers is now
> **read by something**. `codeEditorTheme` and `showLineNumbers` were stored and consumed by nothing;
> they now drive both code surfaces through a new pure module `lib/code-theme.ts` and the shared
> `components/ui/CodeText.tsx`, which also absorbed the private highlighter that used to live inside
> `FixExplanationPanel`. `defaultLanguage`, `soundEffects` and `theme` were **removed** — nothing
> consumed any of them and none could be honoured (mission code is authored in one language per
> mission; there are no audio cues; there is no light palette), so the page no longer offers a
> control that does nothing. `SettingsEffects` went with the theme, since
> `:root { color-scheme: dark }` in `app/globals.css` already stated the same thing statically.
> A test pins the key set of `DEFAULT_SETTINGS`. The suite is **432 tests across 13 files**.
> See §8 → Settings.
>
> Also in that pass: **`next` was upgraded 14.2.5 → 14.2.35**, an in-range patch that clears the
> critical production advisories the old §12 item 11 wrongly described as dev-only; that item now
> records what `npm audit --omit=dev` actually reports and why the remainder is unreachable here.
> §12 item 3 ("6 of 14 missions playable") was left stale by the Chapter 2 and 3 passes and is
> corrected.
>
> **New in the Supabase migration (2026-07-21) — the largest change since the catalogue was
> written.** CodeRaid stopped being a front-end prototype. Every claim in this document about "no
> backend", client-side grading or a `localStorage` ledger was true before this pass and is not now;
> the affected sections have been rewritten and §16 is new.
>
> - **Auth.** Supabase project live, GitHub OAuth only. `players`, `mission_runs` (append-only),
>   `player_active_days`, `player_achievements`, and a `best_runs` view. RLS grants SELECT on your
>   own rows and UPDATE on your own *profile columns only*; there is deliberately **no insert policy
>   on anything scored**, so route handlers holding the service-role key are the only writer.
> - **The answers left the bundle.** `correctRootCauseId`, `correctEvidenceIds`, `correctFixId` and
>   the 79 per-option `resolvesRootCause` flags were **deleted** from the stage configs and now live
>   in `lib/server/answers.ts` behind `import "server-only"`. The generator proved the
>   `resolvesRootCause` flags were redundant: exactly one fix resolved, and it always equalled
>   `correctFixId`. `tests/bundle-secrecy.test.ts` greps the real build output to keep them out.
> - **Grading moved to `POST /api/runs`**, at the moment the player clicks **Run Verification** —
>   the commit point. Grading on the results screen instead, or exposing a "does fix X resolve?"
>   endpoint that recorded nothing, would have been an answer oracle anyone could enumerate.
> - **The ledger moved to Postgres (step D).** `GET/POST /api/ledger` derives it from `best_runs` +
>   `player_active_days` + `player_achievements`. `Ledger` is unchanged as a wire shape, so no
>   consumer of `useProgress()` changed. Achievements are stamped server-side; the results screen no
>   longer credits anything, and shows gains the server **measured** by diffing the ledger around
>   the insert.
> - **Phase 4:** `POST /api/claim` imports a pre-account `localStorage` ledger, once, as ordinary
>   `mission_runs` rows marked `source = 'claimed'`.
> - **Phase 5:** the leaderboard is real. The **30 hand-written fictional players and
>   `TOTAL_PLAYERS = 12480` are deleted**, along with the Friends, Country and Company scopes that
>   nothing could filter on.
> - **Removed rather than kept**, on the principle that a control nothing can honour is worse than
>   no control: the light theme, `defaultLanguage`, `soundEffects`, the three dead leaderboard
>   scopes, and the promise that "Reset Progress" erases earned XP.
>
> **New in the decoration pass (2026-07-22).** Five of the six items the decoration audit found are
> now closed (§12 items 13–16 and 18):
>
> - **Log out actually logs out.** It was `<Link href="/">` — it navigated home and left the session
>   completely intact, which *looked* signed out because the dashboard redirects client-side. It is
>   now a form POSTing to the existing POST-only `/auth/sign-out` route. Two specs assert the server
>   stops answering afterwards rather than asserting the UI changed, and a second pins that a `GET`
>   returns 405 **without** ending the session — the `<img>`-tag logout the route was written to
>   prevent. This was the one live defect on the list.
> - **The Premium block, `RESPONSE_SERIES` and the footer's `/demo` links are deleted.** The
>   sparkline is now derived from each mission's own authored latency series, so the chart and the
>   headline metric beside it describe the same incident instead of being one shared squiggle.
> - **The 80 objective `done` flags are gone — and they were not dead, as the audit claimed.** The
>   mission browser read them; six were authored `true`, so players saw objectives pre-ticked in
>   missions they had never opened. The type no longer allows the field and `validate:missions`
>   fails a catalogue that reintroduces it.
>
> §12 item 17 — the profile never reaching the server — was the one audit item left open at the time.
> It was closed on 2026-07-29; see the profile pass below.
>
> **New in the onboarding-completion pass (2026-07-22).** `/start` is now one route with three
> states rather than a wizard that turns into a permanent "You''re all set" card. The completion
> state is a compact, centred, **one-time** success card whose single goal is starting the
> recommended first incident; the marketing column, the header''s duplicate "Already have progress?
> Continue" action and the dashboard-as-primary-button are gone from it. A player who completed
> onboarding on an earlier visit is now **redirected** into the mission they should be playing
> instead of being congratulated again. The storage copy follows the real auth state, so a signed-in
> player is no longer told their progress lives in this browser. Rules live in `lib/start.ts`; local
> mission work is untouched. See §8 → Onboarding.
>
> **New in the investigation-state pass (2026-07-28).** Two defects in how the investigation stage
> handled evidence and its own saved state:
>
> - **The UI was answering the question.** A row is selectable only when it carries an `evidenceId`,
>   and in practice only the findings a mission is built around had one. The plus buttons therefore
>   named the correct evidence before the player had read anything, and `EvidenceCard` stamped a
>   violet **Key** badge on collected key findings, confirming it. All 14 missions were audited
>   across all five tools: every meaningful observation — negative evidence, plausible distractors,
>   ruled-out alternatives, duplicate rows whose siblings were already selectable — now carries a
>   stable id, and the Key badge is gone. Non-key evidence roughly doubled. No answer data moved into
>   the client, the precision/recall grading is unchanged, and `validate:missions` now **fails** a
>   mission whose selectable set is an answer key (§6 → Stage 2, §15.2).
> - **Restored state appeared without explanation, and a replay reused it.** Reopening a mission
>   silently restored collected evidence; the workspace now says so, with the real count, and offers
>   a confirmed Restart. "Run It Again" was a plain link to the briefing, so a replay inherited the
>   previous attempt's evidence, diagnosis, fix and running clock — it now clears all eight of the
>   mission's local slots first (§6 → Stage 2 and Stage 6, and the sweep table in §12).
>
> **New in the profile pass (2026-07-29).** §12 item 17 is closed: **the profile now reaches the
> server.** `POST /api/profile` writes the six granted columns of `players`, Settings and onboarding
> both call it, and the ledger response carries the stored profile back so a device that has never
> seen this player's `localStorage` still renders their real name. It is the **only route in the app
> that uses the user-scoped Supabase client rather than the service-role one**, and §16.7 explains
> why that is the safer choice here specifically. Three decoration defects went with it: the landing
> page's preview tabs now switch and its CTA opens the mission it quotes, and the top bar's account
> menu opens. What is **not** solved is display-name moderation — `sanitizeDisplayName` is a
> rendering guard, not a word list (§12 item 17).
>
> **New in the view-privileges fix (2026-07-29) — the most serious defect found on this project.**
> `best_runs` is a view over an RLS-protected table, and **a Postgres view does not enforce the RLS
> underneath it** unless declared `security_invoker`. Supabase grants `SELECT` on public relations to
> `anon` by default, so the view served **every player's runs — including `root_cause_id`,
> `evidence_ids` and `fix_id`, the answer key — to anyone holding the anon key that ships in the
> client bundle**, with no session. `mission_runs` and `players` returned `[]` throughout; only the
> view was open. It leaked to `authenticated` as well, so `0003_lock_best_runs.sql` both sets
> `security_invoker` and revokes the grant from both roles. `service_role` has `bypassrls`, so the
> ledger and the leaderboard are unaffected — verified, not assumed. The house rule now lives beside
> the RLS block in `0001_init.sql`, and `e2e/view-privileges.spec.ts` is the alarm (§12 item 20,
> §15.6).
>
> **New in the grade-disclosure pass (2026-07-29).** §12 item 19 is **narrowed, not closed.**
> `POST /api/runs` had no rate limit and no server-side stage gating, and best-run-wins makes a wrong
> guess free — so the full breakdown in every response, which names *which component* was right, let
> the three answers be searched one at a time instead of as a product. The component detail is now
> disclosed only when a run improves on the player's best; the run is still graded and recorded in
> full, so nothing about progression changes. Withheld fields are **absent, never falsified**. What
> remains open, and is stated in the module itself: `resolved` must always be sent because the
> verification stage renders from it, so the fix answer still leaks one bit per attempt, and the
> score is partly decomposable arithmetic. **The real closure is a rate limit** — a product decision
> about how often a player may replay, left open deliberately (§12 item 19, §16.3).
>
> **New in the MVP-ceiling pass (2026-07-30).** The catalogue is **deliberately frozen at 14 missions
> and 1,830 XP** — §12 item 3 is closed as a *decision* rather than as work. That turned three items
> that were "true statements about an unfinished catalogue" into permanent promises the product cannot
> keep, so the rule now in force is: **anything beyond the derived XP ceiling is rendered as roadmap
> and excluded from progress counts**, the treatment the future tracks already had.
>
> - **`lib/reach.ts` is new and measures the catalogue** — XP ceiling, per-skill XP and level
>   ceilings, playable counts, per-chapter counts. Every figure is derived; nothing is written down.
>   Four of the six career ranks and two achievements (`backend-engineer-rank`, `event-loop-master`)
>   are out of reach and are badged rather than shown as goals. `Achievement.roadmap` is derived too,
>   so writing Chapter 4 lifts the treatment with **no threshold edited anywhere** — and
>   `tests/reach.test.ts` goes red on purpose to say so.
> - **A real defect underneath it:** `streams` and `validation` have no authored mission, and their
>   two permanent zeros were averaged into overall mastery and two radar axes — scoring the player
>   against content that does not exist. A flawless playthrough read **63%** where it should have read
>   70%. Planned skills are excluded from every aggregate now; still rendered, badged Coming Soon.
> - **The dashboard bar no longer targets an unreachable rank.** `rankBand()` takes the ceiling and
>   measures progress toward *exhausting the catalogue* when the next rank is past it — 600 of 1,830,
>   not 600 of 3,000.
>
> **Also new: the replay limit (`lib/replay-limit.ts`), which closes the open work on §12 item 19.**
> **8 graded attempts per mission per rolling hour; past it the run is still graded and recorded but
> the response carries no verdict at all** — no `grade`, and no `ledger` or `credit` either, since the
> ledger names the best run's `resolved` and `score`. Recorded rather than rejected: the row is what
> makes the limit self-enforcing, and a 429 would tell the caller exactly where the boundary is. The
> verification screen has a state for it that says the score still counts. It bounds how *fast* an
> enumerator learns, not what a determined one eventually can — a player can always read their own
> best run — so item 19 stays **narrowed**; what is finished is the open work.
>
> **New in the reset pass (2026-07-31). §12 item 7 is closed** — the last undecided item on the list.
> "Reset Progress" could not erase earned XP for a signed-in player, because runs are append-only and
> best-run-wins is a query over them rather than a mutation. The decision was a **tombstone, not a
> delete**: `players.reset_at` marks the moment a player started over, and every derivation reads past
> it. **Nothing leaves `mission_runs`.**
>
> - **A delete was rejected because append-only is load-bearing in three separate places** — it is
>   what makes best-run-wins a query, what makes a replay an upgrade rather than a second award, and
>   what makes the replay limit self-enforcing. That last one is the sharp edge: the limit *counts
>   rows*, so deleting them would have turned Reset Progress into a rate-limit bypass.
>   `e2e/authenticated.spec.ts` pins that invariant directly.
> - **`best_runs` filters on the tombstone in SQL** (`0004_player_reset.sql`), which is what makes one
>   reset apply to the ledger and the leaderboard at once rather than in two places that can drift.
>   `lib/reset.ts` covers the two sources the view cannot reach: **active days are filtered** (the
>   streak restarts, the visit history survives) and **achievement stamps are deleted** by the route,
>   because an unlock time is a derived conclusion rather than evidence (§4 principle 12).
> - **`POST /api/reset` holds the service-role key, unlike `POST /api/profile`**, and §16.8 says why
>   the two routes go opposite ways. `reset_at` is deliberately *not* one of the six player-writable
>   columns: a browser-writable tombstone could be set to the **future**, silently voiding every run
>   the player went on to record.
> - **What a reset deliberately does not do:** refill the replay limit, re-open the one-time claim,
>   touch the profile, or delete the account. A genuine erasure request is a different feature with a
>   different name, and it should remove the account itself.
> - **A real defect in the route, found by running the spec.** The tombstone was stamped from the
>   *application server's* clock into a column compared against `mission_runs.completed_at`, which is
>   the **database's** `now()`. The two differ — ~2 seconds here — so a run finished moments before a
>   reset survived it, and the ledger read 80 XP straight after a reset that returned 200. It now
>   writes the Postgres `'now'` value. The codebase already had this rule, stated in `/api/runs`
>   about the browser's clock; the server's own clock is where it did not look like it applied
>   (§16.8).
> - **A real defect in the migration, found by running it.** `0003` set the view's options with
>   `alter view` rather than recreating it, so the live view still carried the column list `0001`
>   expanded from `mission_runs.*` — from before `0002` added `source`. `create or replace view` may
>   only *append* columns, so re-expanding the star failed with `42P16`. `0004` now drops and
>   recreates, which makes its `revoke` load-bearing for a second reason: a recreated view is a **new
>   relation**, and Supabase re-grants `SELECT` on those to `anon` and `authenticated`. The corollary
>   is recorded beside the house rule in `0001_init.sql`.
>
> **New in the CI-isolation pass (2026-07-31). §12 item 2's infrastructure half is closed, and it
> uncovered a dated defect.** CI no longer runs against the live Supabase project: it starts an
> **ephemeral local stack** on the runner (`supabase start`), applies every migration from an empty
> database, and tears it down. No CI traffic reaches production, a migration that cannot be applied
> is now a red build rather than a surprise in the SQL editor, and fork pull requests stop silently
> skipping the twenty authenticated specs.
>
> - **The defect it found (§12 item 21).** The schema **never granted a privilege to `service_role`
>   or `authenticated`**. It worked only because the hosted project was created under Supabase's old
>   default, which auto-granted every new `public` table to all three API roles — a default now
>   withdrawn, with `config.toml` naming **2026-10-30** as the date it is removed for good. On a
>   fresh stack, `service_role` — *the only writer of anything scored* — got
>   `401 permission denied for table players`. A new project for CI would not have run the app
>   either, and the live project breaks when the old behaviour goes.
>   `0005_explicit_grants.sql` declares exactly what the app uses, and re-asserts the `best_runs`
>   revoke last, because a grants file is the file someone later widens into `on all tables`.
> - **The `view-privileges` control spec was asserting the old world.** It required `anon` to get
>   `200 []` from the tables; under the new default the answer is `401`, which is *stronger*. Both
>   are accepted now — but since "refused everywhere" would make the control unable to tell a
>   locked-down project from an unreachable one, reachability is established with the service-role
>   key instead. Re-proven by reintroducing the original leak on a local stack and watching the right
>   two specs go red.
>
> The suite is **669 tests across 27 files**, plus **37 Playwright specs** — which now pass against
> **both** a from-scratch local stack and the hosted project. All six gates green: `typecheck`,
> `lint`, `test`, `validate:missions`, `build`, `playwright`.

---

## 1. Product positioning and MVP scope

The player is a backend engineer. A production Node.js incident fires. They investigate with
realistic tools (logs, metrics, code, database, distributed trace), collect evidence, pick a root
cause, choose a fix, run verification, and see before/after impact plus XP and skill gains.

Positioning (landing page): *"Not another coding quiz."* Traditional platforms give isolated
questions with one correct answer and a syntax focus; CodeRaid gives a loop —
**Incident Occurs → Investigate Evidence → Diagnose Root Cause → Apply a Fix → Verify the Result.**
The paired marketing arrays are `TRADITIONAL_TRAITS` vs. `CODERAID_TRAITS` (`lib/data.ts`).

**In scope for the MVP (the `nodejs` track):** async JavaScript and the event loop, promises and
error handling, Node.js APIs (request handling, auth, health, shutdown), workers/background jobs,
memory and connection pressure, and production debugging (logs, metrics, traces).

**Out of scope, shown as roadmap only (the `future` track):** databases/SQL, Redis and caching,
system design, cloud reliability. These are rendered muted with a Coming Soon badge everywhere —
mission map, mission browser, skills page, landing skills grid — and never counted toward progress,
filters, radar axes, recommendations or "what to play next".

The README (`README.md`) has been rewritten to match this positioning and is no longer stale.

---

## 2. Tech stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js **16.2.12**, App Router (upgraded from 14.2.35 on 2026-07-31 — §12 item 12) |
| Language | TypeScript 5.5, `strict: true`, path alias `@/*` → repo root |
| UI | React **19.2**, Tailwind CSS 3.4 |
| Icons | `lucide-react` |
| Animation | `framer-motion` (reduced-motion aware) |
| Fonts | `next/font/google` — Inter (`--font-inter`), JetBrains Mono (`--font-jetbrains`) |
| Backend | **Supabase** — Postgres + GitHub OAuth. Six route handlers under `app/api/`; no server actions |
| Auth | `@supabase/ssr` 0.12 + `@supabase/supabase-js` 2 — GitHub OAuth only, cookie sessions |
| Tests | **Vitest 2** — `tests/`, 27 files, 669 tests, Node environment, `@/*` alias |
| Browser smoke | **Playwright 1.61** — `e2e/`, 37 Chromium tests against the production build: 14 signed-out, 20 authenticated (§15.5, §17.4), 3 database-privilege checks that use no browser at all (§15.6) |
| Lint | **ESLint 9 + `eslint-config-next` 16**, flat config in `eslint.config.mjs`. `next lint` no longer exists, so `npm run lint` is plain `eslint .` |
| Content validation | `tsx scripts/validate-missions.ts` over `lib/mission-validation.ts` |

Scripts: `npm run dev | build | start | lint | typecheck | test | test:watch | validate:missions`,
plus `npx playwright test`.

Runtime dependencies added by the migration: `@supabase/ssr`, `@supabase/supabase-js`.

### Environment

`.env.local` holds three variables — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
and `SUPABASE_SERVICE_ROLE_KEY`. The service-role key is read only inside `lib/supabase/admin.ts`,
which begins with `import "server-only"`, so no import path can pull it toward the browser bundle.
It must never be given a `NEXT_PUBLIC_` prefix.

### Verified command results (re-run 2026-07-31, after the Next 16 migration)

| Command | Result |
| --- | --- |
| `npm run typecheck` | **passes clean**, no errors |
| `npm run lint` | **0 errors, 14 warnings** — all 14 are `react-hooks/set-state-in-effect`, new in this ESLint config and deliberately demoted (§12 item 23) |
| `npm run test` | **669 passed** across 27 files |
| `npm run validate:missions` | **0 errors, 0 warnings** — 20 missions checked, 14 fully playable |
| `npm run build` | **succeeds** — see the stale-`.next` note below |
| `npx playwright test` | **37 passed** against the hosted project |
| `npm audit --omit=dev` | **0 vulnerabilities** (was 2 high before the migration) |

**A dev server poisons `bundle-secrecy`.** If anyone has run `npm run dev`, `.next/static/webpack/`
holds unminified `hot-update.js` files, and unminified output keeps local variable names.
`correctEvidenceIds` is a local in `lib/grading.ts`, so it surfaces as a leak in a file `next build`
never produced — seen on 2026-07-29, with seven reported "leaks", all phantom. `rm -rf .next &&
npm run build` clears it. **Read the reported paths before believing the failure:** `hot-update` in
a path means dev artifacts. This is the third documented face of the stale-`.next` trap and the most
convincing-looking one, because the test is right that those strings are in `.next`.

**A stale `.next` can fail the build itself, not just the secrecy test.** On 2026-07-29 the first
`npm run build` of the pass died with `ENOENT` inside `loadComponentsImpl` and
`Failed to collect page data for /leaderboards` — nothing to do with the source, which had just
typechecked and linted clean. The immediate re-run succeeded with no change. The existing warning
about `.next` (§15.1) is about `bundle-secrecy` reporting phantom leaks; this is the same root cause
wearing a different face. **Treat a build error that names a route you did not touch as a stale
artifact until a clean rebuild says otherwise.**

All Playwright tests must **run** rather than skip, which is the thing to check: the sixteen
authenticated ones skip themselves without the Supabase keys, and a run where they skip reports the
same green as a run where they pass. The GitHub Actions secrets were set on 2026-07-22, so CI can
now run them too — but confirm they executed in the job log before trusting it (§12 item 2).

> **A note on `npm run test` and the build.** `tests/bundle-secrecy.test.ts` greps `.next` for the
> removed answer fields, and **skips itself when `.next` is absent**. That makes the suite work on a
> clean checkout, but it also means a *stale* `.next` produces phantom failures: a build predating
> the migration still contains `correctRootCauseId` in its chunks. If that test fails, delete
> `.next` and rebuild before believing it. **CI now runs `build` before `test` for this reason** —
> it did not until 2026-07-21, which meant the guard skipped on every CI run since it was written.

The build does **not** require the Supabase environment variables. Verified by moving `.env.local`
aside and building clean: the keys are only read when a route handler or the browser client actually
runs, so a deploy that forgets them fails at request time rather than at build time. That is worth
knowing before trusting a green build.

Static generation is unchanged for the mission routes: 20 missions × 6 stage routes are still
prerendered. `/missions/map`, `/sign-in` and the four `app/api/*` routes are dynamic.

---

## 3. Repository layout

```
app/
  layout.tsx                 Root layout: fonts, metadata, <ProgressProvider/>
  globals.css                Tailwind layers + .surface / .chip / .text-gradient utilities
  page.tsx                   Marketing landing page
  start/                     Onboarding: wizard (4 steps) · one-time success card · resume redirect
  sign-in/                   Real GitHub OAuth sign-in (SignInCard)
  demo/                      Placeholder route (PlaceholderPage)
  auth/callback/route.ts     OAuth code exchange → session cookie
  auth/sign-out/route.ts     POST only — reached by the sidebar's sign-out form
  api/runs/route.ts          THE TRUST BOUNDARY — grade a run and record it
  api/ledger/route.ts        GET the derived ledger · POST an active day
  api/claim/route.ts         One-time import of a pre-account local ledger
  api/leaderboard/route.ts   Real standings, signed-in players only
  api/profile/route.ts       The player's own six profile columns — the ONLY route that runs as
                             the user rather than as service-role (§16.7)
  api/reset/route.ts         Starting over: stamps the players.reset_at tombstone and drops the
                             player's achievement stamps. Deletes no run (§16.8)
  dashboard/                 Player home
  missions/                  Mission browser
  missions/map/              Mission map (chapter rail + details panel)
  missions/[missionId]/briefing|investigation|diagnosis|fix|verification|results/
  skills/  achievements/  leaderboards/  settings/

components/
  <landing sections>         Header, HeroSection, GamePreview, ComparisonSection, HowItWorks,
                             MissionPreview, SkillsGrid, CareerPath, FinalCTA, Footer,
                             PlaceholderPage
  ui/                        Logo, Reveal, AvailabilityBadge (+ AvailabilityNote),
                             CodeText (+ useCodePreferences)
  progress/                  ProgressProvider — fetches the server ledger, useProgress();
                             ClaimProgressBanner (phase-4 import offer)
  auth/                      SignInCard
  dashboard/                 DashboardShell, DashboardSidebar, DashboardTopBar, AccountMenu,
                             DashboardGreeting,
                             NextAction, DailyRaid, CareerProgress, RecommendedMissions,
                             SkillsSummary, usePlayer
  onboarding/                StartExperience (owns the draft + the three states),
  missions/                  MissionBrowser, MissionsHeader, MissionsNextAction, StageGate
  missions/map/              MissionMapView, MissionDetailsPanel, useMissionResume
  missions/briefing|investigation|diagnosis|fix|verification|results/
  skills/                    SkillsExplorer, SkillCard, SkillDetailDrawer, SkillFilters,
                             SkillRadar, SkillSummaryBar, SkillsAside, FutureTracks
  achievements/ leaderboards/ settings/

lib/
  types.ts data.ts           Landing-page types + marketing content
  missions.ts                Mission catalogue, chapters, tracks, flow, briefing resolution
  availability.ts            CANONICAL gating model (playability, CTAs, progress, PlayerView)
  progress.ts                CANONICAL ledger SHAPE + pure maths: XP curve, levels, ranks,
                             skill XP, streak, creditBetween (what a run added)
  grading.ts                 CANONICAL grading engine. Takes `answers` as an INPUT, so the
                             server module depends on the public contract, not the reverse
  grade-submission.ts        Client: submit a run, cache the returned grade + credit
  ledger-client.ts           Client: fetch the ledger, record an active day, claim a local one
  profile-client.ts          Client: the ServerProfile wire shape, saveProfile(), coerceProfile(),
                             draftFromProfile() — declared here so lib/server/profile.ts depends
                             on the public contract, not the reverse
  run.ts                     Per-mission run telemetry: timing, stages completed, hints used
  skills.ts                  CANONICAL Node.js skill taxonomy
  reach.ts                   What the CATALOGUE can ever award: XP ceiling, per-skill ceilings,
                             which ranks and achievements are reachable at all. The mirror of
                             availability.ts — that asks what THIS PLAYER may do next
  replay-limit.ts            Pure replay-rate policy: 8 graded runs per mission per hour (§12 item 19)
  reset.ts                   Pure reset-tombstone semantics: resetInstant(), countsAfterReset() —
                             which recorded facts still count after players.reset_at (§12 item 7)
  stage-access.ts            Pure stage-prerequisite rules (what StageGate enforces)
  mission-validation.ts      Pure content-validation rules (what validate:missions runs)
  code-theme.ts              Pure code tokenizer + editor-theme palettes (what CodeText renders)
  start.ts                   Pure /start rules: which state, which mission, which storage copy
  mission-storage.ts         CANONICAL per-mission localStorage keys (all eight) + clearVerdict()
                             + clearInvestigationOnward() + clearMissionWorkingState()
  verification-runtime.ts    The replay that actually executes: workload, probe, measurement (§17)
  verification-offload.ts    The browser's Worker offloader for that replay
  server/replay.ts           server-only: which fix moves the work off the thread
  investigation.ts diagnosis.ts fix.ts verification.ts results.ts   Per-stage content + state
  dashboard.ts achievements.ts leaderboards.ts onboarding.ts settings.ts

lib/server/                  ALL of these begin with `import "server-only"`
  answers.ts                 THE SECRET: every mission's correct root cause, evidence and fix
  submission.ts              Parses untrusted submissions; bounds lists, clamps duration,
                             validates the player's local date to ±1 day
  ledger.ts                  Derives the Ledger from Postgres; stamps achievements;
                             playerRecord() reads the claim flag and the profile together
  grade-disclosure.ts        How much of a grade the response may carry — the component
                             detail only when the run beat the player's best (§12 item 19)
  profile.ts                 Bounds a profile update to the six granted columns;
                             sanitizeDisplayName() strips what a name may not render
  claim.ts                   Validates a pre-account ledger; re-derives every XP figure
  standings.ts               Derives the leaderboard from best_runs + players

lib/supabase/                env.ts · client.ts (browser) · server.ts (session) ·
                             admin.ts (service-role — the only writer of anything scored)

supabase/migrations/
  0001_init.sql              Tables, best_runs view, RLS, handle_new_user trigger
  0002_claim_local_progress.sql  players.claimed_at, mission_runs.source, claim uniqueness
  0003_lock_best_runs.sql    security_invoker + revoke on best_runs — the view bypassed RLS
  0004_player_reset.sql      players.reset_at; best_runs DROPPED and recreated filtering on it,
                             re-asserting security_invoker AND the revoke (0001's house rule)
  0005_explicit_grants.sql   The privileges the app always relied on, declared. Supabase's old
                             auto-expose default is being withdrawn (§12 item 21)
  config.toml                Committed so `supabase start` reproduces the project locally and in CI

scripts/
  validate-missions.ts       CLI wrapper: grouped output, non-zero exit on errors
  tsconfig.json              Stubs `server-only` so the CLI can import lib/server/answers.ts

tests/                       Vitest — pure domain logic + end-to-end mission flows
  grading  progress  availability  verification  skills  achievements  dashboard  start
  leaderboards  mission-validation  settings  mission-flow
  bundle-secrecy  ledger-derivation  claim  stale-verdict  profile
  investigation-restore-and-replay   which localStorage slots each reset clears and keeps
  reach          what the frozen catalogue can and cannot award (§12 items 3, 4)
  replay-limit   the replay-rate policy (§12 item 19)
  reset          the reset tombstone's semantics (§12 item 7)
  stubs/server-only.ts       Aliased by vitest.config.ts so server modules import in Node

e2e/                         Playwright — mission-flow.spec.ts + onboarding.spec.ts +
                             investigation-state.spec.ts (signed out),
                             authenticated.spec.ts (session-backed, §15.5),
                             view-privileges.spec.ts (no browser, no session — what the
                             anon key can read straight from the database API, §15.6)
  support/                   session.ts (mint a session, readAsAnon), fixtures.ts (player
                             lifecycle), mission.ts (play a mission well or badly)
.eslintrc.json               next/core-web-vitals
vitest.config.ts             Node environment, @/* alias, `server-only` → tests/stubs
```

---

## 4. Architecture principles currently in force

0. **The browser may state what the player *chose*; the server decides what it was *worth*.** This
   is the principle the migration exists to establish, and it subsumes several below. The client
   sends a root cause, an evidence list and a fix; a route handler pairs those with answers the
   browser has never seen, grades them, and records the result. Every number the app displays —
   score, XP, level, rank, streak, skill level, achievement, leaderboard position — is derived from
   those recorded runs. See §16.
0b. **RLS decides which *row* you may touch, never which *values* you may put in it.** That is
   precisely why grading cannot live in the database policy layer, and why there is no insert
   policy on `mission_runs`, `player_achievements` or `player_active_days` at all. The service-role
   key in a route handler is the only writer of anything scored.
1. **Server components render, client components hold state.** Each mission stage route is a server
   component that looks up static config and renders a `"use client"` `*Workspace` component.
2. **Static generation for everything.** Mission stage routes export `generateStaticParams()` over
   all 20 mission ids, so all 6 × 20 = 120 stage URLs are pre-rendered and directly navigable.
3. **Icons cross the server→client boundary as string keys.** `ROOT_CAUSE_ICONS`, `FIX_ICONS`,
   `METRIC_ICONS` map ids → `LucideIcon`, because component functions aren't serializable as props.
   (`lib/missions.ts`, `lib/skills.ts` and `lib/investigation.ts` embed `LucideIcon` values directly
   and are therefore only consumable inside client components or server render paths.)
4. **The hydration-safe persistence pattern** — used identically in every stateful component:
   ```
   const [state, setState] = useState(<SSR-safe default>)
   const [hydrated, setHydrated] = useState(false)
   useEffect(() => { setState(loadX()); setHydrated(true) }, [])          // read AFTER mount
   useEffect(() => { if (hydrated) saveX(state) }, [state, hydrated])     // never write defaults
   ```
   No component reads `localStorage` during render. Date formatting avoids server/client divergence
   (`formatUnlockDate` parses `YYYY-MM-DD` by hand instead of using `Date`).
   **This still governs mission working state — but not the ledger**, which is fetched rather than
   read, and never written by the browser at all.
5. **Defensive load validation.** Every loader re-validates persisted ids against the current config
   and drops stale/derived flags, wrapped in `try/catch`, guarded by `typeof window === "undefined"`.
6. **Namespaced storage.** All keys start with `coderaid:` so reset can sweep the namespace.
7. **Three canonical data sources, no duplicates.** `lib/missions.ts` (what exists),
   `lib/availability.ts` (what you can do with it), `lib/skills.ts` (what it trains). Every other
   module reads from these by **stable id** rather than keeping its own copy. The previously
   conflicting duplicate skill datasets (`DASHBOARD_SKILLS`, the old `SKILLS` array in `lib/data.ts`)
   were **deleted**.
8. **No CTA may land on unwritten content.** Every "start / continue / practice / next mission"
   affordance in the app routes through `lib/availability.ts`.
9. **Rules are pure, effects are components.** `lib/stage-access.ts` and `lib/mission-validation.ts`
   both hold only pure functions over plain data; the component (`StageGate`) and the CLI
   (`scripts/validate-missions.ts`) supply the `localStorage` reads and the process exit. That is
   what makes both directly testable in a Node environment.
10. **Nothing about a player may be authored.** No fixture score, XP total, streak, rank, skill
    level or completion history exists anywhere. The validator actively fails a results config that
    reintroduces a `score`, `xpEarned`, `duration` or `steps` field. **This rule took the
    leaderboard's thirty fictional players with it in phase 5** — they were the last authored
    people in the repo, and `tests/leaderboards.test.ts` now fails if any of them come back.
11. **A control nothing can honour is worse than no control.** The light theme, `defaultLanguage`
    and `soundEffects` were deleted for this reason; so were the Friends, Country and Company
    leaderboard scopes, which had no data model behind them. When Reset Progress could no longer
    erase earned XP — runs are append-only — its copy changed to say what it actually does rather
    than keep a promise it could not keep. **As of 2026-07-31 there is a second control that does
    honour it** (§12 item 7), and the same principle governs its wording: it says the runs *stop
    counting*, not that they are deleted, because they are not.
12. **The evidence is stored; the conclusion is derived.** There is deliberately no `total_xp`
    column, no stored rank and no stored streak. A stored total is a second source of truth that
    starts disagreeing with the runs behind it the moment anybody plays.

---

## 5. The availability model — single source of truth for gating

`lib/availability.ts` is the one vocabulary for "can the player do this yet?", shared by the mission
browser, the map, the detail panel, the briefing page, the dashboard, the onboarding wizard and the
skills page. It deliberately lives **outside** `lib/missions.ts`: deciding whether a mission is
playable means reading the per-stage content modules, and importing those from the catalogue would
create an import cycle.

Availability has **two halves, and they are now cleanly separated**:

- the **catalogue** decides whether a mission exists to be played — `mission.status`
  (`available | locked | in-development | coming-soon`, authored *content* state only) plus whether
  its stage content is written;
- the **player's ledger** decides whether *they* have played it — completed, in progress, or not.

`mission.status` can no longer say `completed` or `current`. Those are facts about a person, not a
mission, so they were removed from `MissionStatus` and are derived here instead. The four missions
that used to be authored `completed` (advertising a badge and a review CTA that never worked) are
now `in-development` or, once their content was written, `available`.

**Audited 2026-07-20:** a repo-wide search found no remaining authored `"current"` or `"completed"`
mission status. `tests/availability.test.ts` now pins the invariant by asserting every entry in
`MISSIONS` carries one of the four content states, and `validate:missions` fails a Node.js mission
marked `coming-soon` or a fully authored mission whose status still hides it.

### Player view

```ts
type PlayerView = { ledger: Ledger; startedMissionIds: string[] }
const EMPTY_VIEW: PlayerView   // a brand-new player — a valid, server-renderable state
```

Every function below takes `view` and defaults to `EMPTY_VIEW`, which is what keeps these pages
server-renderable: the server renders the un-played state and the client re-renders after the
provider hydrates. `startedMissionIds` comes from `startedMissionIds()` in `lib/run.ts`, which scans
for run telemetry rather than keeping a second list that could drift.

### Exported API

| Export | Kind | Meaning |
| --- | --- | --- |
| `Availability` | type | `"completed" \| "current" \| "available" \| "locked" \| "in-development" \| "coming-soon"` |
| `AVAILABILITY_META` | const | `Record<Availability, { label, note?, cls, interactive }>` |
| `IN_DEVELOPMENT_NOTE` / `COMING_SOON_NOTE` | const | Copy for the two "not yet" states |
| `hasFullContent(missionId)` | fn | **The content derivation.** True only when the id appears in *all five* stage registries (`INVESTIGATABLE_`, `DIAGNOSABLE_`, `FIXABLE_`, `VERIFIABLE_`, `RESULT_MISSION_IDS`). Each is `Object.keys(<stage>Configs)`, so **authoring a mission's stage configs is the single act that makes it startable.** |
| `PLAYABLE_MISSION_IDS` | const | `NODE_MISSIONS.filter(hasFullContent)` → currently the five Chapter 1 missions plus `user-signup-latency-spike`, in catalogue order |
| `missionAvailability(mission, view?)` | fn | future-track chapter → `coming-soon`; authored `coming-soon` / `locked` → as authored; **lacking full content → `in-development`**; **in the ledger → `completed`**; **started but unfinished → `current`**; otherwise `available`. |
| `canStart(mission, view?)` | fn | Not coming-soon, locked or in-development, **and** `hasFullContent`. |
| `canReview(mission, view?)` | fn | Completed *and* content exists — which now always holds, since completion can only come from a real run. |
| `blockedReason(mission, view?)` | fn | Copy for a CTA that must stay disabled, or `null`. The old "Mission review is being prepared." special case is gone with the fake completions. |
| `recommendedMission(view?)` | fn | The mission to open next: Node.js track, fully playable, preferring one the player has **started**, then one they haven't finished. Can never dead-end. |
| `nextMissionId(currentId, view?)` | fn | Next mission by index that `canStart` and the player hasn't completed; `undefined` when nothing playable remains. |
| `playableSummary()` | fn | `{ playable, inDevelopment, total }` over `NODE_MISSIONS` → currently `{ 6, 8, 14 }`. Player-independent, and **derived** — no component hardcodes the count. |
| `overallProgress(view?, list?)` | fn | **Moved here from `lib/missions.ts`** and counted from the ledger. `{ done, total, pct }` over `NODE_MISSIONS`. |
| `chapterProgress(chapterId, view?)` | fn | **Moved here.** Counted from the ledger. |
| `chapterState(chapterId, view?)` | fn | **Moved here.** `complete` only when the player has finished every mission in it. |

The three progress helpers moved out of `lib/missions.ts` for the same reason the rest of this
module exists: they describe a player, not a catalogue.

### The shared status component

`components/ui/AvailabilityBadge.tsx` exports two pieces, used everywhere so the same state never
reads as two different things in two places:

- **`AvailabilityBadge({ status, size?, className? })`** — chip using `AVAILABILITY_META[status]`
  label + classes, with a leading icon for the "not yet" states (`locked` → `Lock`,
  `in-development` → `Hammer`, `coming-soon` → `Clock`). Sizes `sm` (list rows) and `md`.
- **`AvailabilityNote({ status, note?, className? })`** — the explanatory line beside a disabled CTA,
  `role="note"`, defaulting to `AVAILABILITY_META[status].note` and overridable.

### How components gate

Every one of these now reads `view` from `useProgress()` and passes it through, so a badge, a CTA
and a recommendation can't disagree about what the player has done:

- `app/missions/[missionId]/briefing/page.tsx` — `missionAvailability` + `canStart`, passed into
  `MissionOverview` and `MissionActions`. A blocked mission renders a disabled button with a
  state-specific label plus an `AvailabilityNote`.
- `components/missions/MissionBrowser.tsx` — badges every row, mutes locked/coming-soon rows,
  disables the detail CTA via `blockedReason`, renders a separate roadmap section for future
  chapters, and takes chapter counts from `chapterProgress(id, view)`.
- `components/missions/map/MissionMapView.tsx` / `MissionDetailsPanel.tsx` — badges per row and in
  the panel, mutes future chapters behind a Coming Soon block, seeds selection from
  `recommendedMission()`, shows `playableSummary()`.
- `components/missions/MissionsHeader.tsx` — the progress bar is `overallProgress(view)`.
- `components/dashboard/RecommendedMissions.tsx` — `NODE_MISSIONS.filter((m) => canStart(m, view))`
  plus an "N more in development" line. `NextAction.tsx` resolves its mission from
  `recommendedMission(view)`, never a hardcoded id.
- `components/skills/SkillDetailDrawer.tsx` / `SkillsAside.tsx` — practice CTAs only link when
  `canStart(m, view)`, otherwise render a badge / "being prepared" tooltip.
- `components/onboarding/OnboardingSuccess.tsx` — the completion card only links into a mission that
  `canStart`, via `firstIncident()`, falling back to `recommendedMission()` then `/missions`.
- `components/missions/results/ResultsWorkspace.tsx` — the Next Mission link uses the authored
  `config.nextMissionId` only if `canStart`, else `nextMissionId(mission.id, view)`.

---

## 6. The mission gameplay flow

`MISSION_FLOW = ["Briefing", "Investigation", "Diagnosis", "Fix", "Verification", "Complete"]`
(the `Complete` stage lives at the `/results` route). `missionStep(stage)` drives the
"Step N of 6" header on every stage.

Every stage now also writes **run telemetry** (`lib/run.ts`, `coderaid:{id}:run`): `touchRun()` on
mount starts the clock on first contact and keeps it warm afterwards — never restarting it, so the
elapsed time spans the whole mission rather than its last stage — and `completeStage()` records
which stages were finished. This is what the results screen grades against.

### Stage 1 — Briefing `/missions/[id]/briefing`
`resolveBriefing(mission)` merges authored briefing fields over derived defaults, so **all 20
missions have a briefing**. Renders overview, objectives, metadata, skill tags, an illustration, and
a collapsible "View Mission Details" context list, plus an `AvailabilityBadge`. The CTA becomes a
disabled, labelled button with an `AvailabilityNote` whenever `canStart` is false — today 18 of 20.
"Start Investigation" calls `touchRun()` + `completeStage("Briefing")`: this is where the clock starts.

### Stage 2 — Investigation `/missions/[id]/investigation`
Five tools (`logs`, `metrics`, `code`, `database`, `trace`); each mission enables a subset. Rows that
carry an `evidenceId` are selectable; "Mark as Evidence" batches, de-duplicates, and commits the
selection to the collected-evidence rail. A key-clue counter gates progression:
`keyCollected >= min(requiredKeyClues, #keyEvidence)` — 3 on both playable missions — before
"Continue to Diagnosis" appears; following it records `completeStage("Investigation")`. The same
threshold now also gates the diagnosis *route*, not just the button (§15.3).
State: `{ activeTool, collectedEvidenceIds[] }`.

**Selectability must not leak the answer (2026-07-28).** "Rows that carry an `evidenceId` are
selectable" is a rendering rule, but it was also a *disclosure*: only the findings the author
considered decisive carried one, so the plus buttons named the answer before the player had read a
single row. Two things changed, and neither moved any answer data into the client:

- **The content was audited across all 14 missions and every tool.** Every log line, metric card,
  database stat, code line and trace span that a reasonable engineer would note during the incident
  now has a stable evidence id — healthy subsystems, plausible alternate failures, ruled-out causes,
  duplicate rows whose siblings were already selectable, and ordinary observations alike. What
  stayed unselectable is genuinely structural: blank lines, function signatures, closing braces,
  request-start markers and one methodology stat. Non-key evidence roughly doubled, from 2–4 items
  per mission to 6–9. **`requiredKeyClues` and the grading weights are untouched**, and selecting an
  irrelevant finding is still allowed and still costs evidence precision (§14.2).
- **The `Key` badge was deleted from `EvidenceCard`.** It stamped `isKeyEvidence` on collected
  findings, which told the player whether a row mattered after one click and before any reasoning.
  Every card now renders identically; the only thing that varies is which tool it came from.

`isKeyEvidence` itself stays in the public config because the clue gate counts it — moving that gate
server-side would make it an answer oracle. It is no longer rendered anywhere, and the validator now
fails any *other* field on public evidence (§15.2).

**Restored progress is now explained (2026-07-28).** Reopening a mission with saved work restored
the collected evidence silently, so the player saw green borders and "Collected" tags they had not
produced in this visit. `RestoredProgressNotice` states it — *"Investigation progress restored — N
evidence items already collected"*, with the real filtered count — as a `role="status"` strip above
the workspace. It appears only when state came back from a previous visit, and disappears the moment
the player collects anything now, since there is then nothing left to explain. Its secondary action
opens `RestartInvestigationDialog` (`role="alertdialog"`, Escape closes, focus on Cancel), which
spells out that collected evidence and all later choices go and that **earned server progress and
previous attempts do not**. Confirming calls `clearInvestigationOnward()`; `…:run` is deliberately
kept, because re-reading the logs is part of the mission rather than a second attempt.

### Stage 3 — Diagnosis `/missions/[id]/diagnosis`
Single-select root cause + multi-select supporting evidence + a collapsible hint.
`canConfirm = rootCauseId != null && evidenceIds.length >= minimumEvidenceRequired` (2 on
`user-signup-latency-spike`, 3 on `event-loop-overload`). The confirm bar names the single missing
blocker. Opening the hint calls `recordHint(missionId, "diagnosis")` —
once, no matter how often it is toggled — and costs 5 points at grading time.
State: `{ rootCauseId, evidenceIds[], confirmed }`.
**The correct root cause and evidence are no longer in this config at all** — they live in
`lib/server/answers.ts` and are read only by `gradeMission()` inside `POST /api/runs` (§14.2, §16). The
gate is still permissive on purpose: the player commits to an answer here and finds out later,
which is how an incident actually works.

### Stage 4 — Fix `/missions/[id]/fix`
Single-select from 5–6 fix options; selecting one swaps in an explanation panel with bullets and a
code example. The gate is still `Boolean(fixId)` — any option can be applied — but which one is
applied decides everything downstream. Reaching the stage at all requires a confirmed diagnosis
(§15.3).

**The panel shows a description and code, and no verdict.** It has none to show: the per-option
`resolvesRootCause` flag it used to read was deleted with the rest of the answers, so nothing on
this screen can tell the player whether the fix they are looking at is the right one. That was the
last place the correct answer was visible before committing to it.
State: `{ fixId, applied }`.
The "Confirmed Root Cause" card shows **the player's own diagnosis**, read back from the saved
diagnosis state, falling back to the authored line only when nothing was saved. Choosing a fix for
a cause you didn't pick would be incoherent.

### Stage 5 — Verification `/missions/[id]/verification` — **the commit point**
This is where the run is graded and recorded, and it is the only stage that requires an account.

"Run Verification" POSTs the player's diagnosis, evidence, fix, telemetry and local date to
`/api/runs`, which grades against answers the browser has never seen, writes the row, stamps any
achievement crossed, and returns `{ grade, ledger, credit }`. The client caches the grade and the
credit for the results screen and `adopt()`s the ledger, so the dashboard updates immediately
without the browser deriving any of it.

**`fixResolves` is the server's verdict, never the browser's.** It stays `false` until a run comes
back graded — which is what makes the verification a measurement rather than a formality. Grading
*here* rather than on the results screen is deliberate: verification is the point where diagnosis
and fix are both locked, and the obvious alternative — an endpoint answering "does fix X resolve
this?" without recording anything — would be an answer oracle anyone could enumerate.

A signed-out player gets an inline prompt to sign in, and **their work is preserved**: the run,
diagnosis and fix stay in `localStorage`, and the `?next=` parameter returns them to this exact
stage. Nothing is graded and nothing is cached, so they lose no progress by not having an account
until this moment.

Phase machine `idle → running → done`. For `event-loop-overload` the replay **actually executes** —
12,000 rows of real quadratic work, with the main thread's responsiveness really measured (§17). For
the other thirteen it remains a `setTimeout(1400ms)`, because there is no service to replay traffic
against and their incidents are not reproducible in a browser. Either way **what it reports is
derived**:
`resolveVerification(config, fixResolves)` reads the server's verdict, and when the fix doesn't
resolve the root cause the metrics hold at their "before" values, the chart's after-line matches its
before-line, the request breakdown still shows the slow span on the critical path, the logs are the
pre-fix logs, and every check with `dependsOnFix !== false` fails. Checks about unrelated subsystems
stay true either way. Reaching `done` records `completeStage("Verification")`.
State: `{ run, completed }` — and "done" now requires a cached grade, not just the local flag:
without one there is nothing truthful to render, so the player runs verification again.

### Stage 6 — Results `/missions/[id]/results`
On mount: `completeStage("Complete")`, then it **reads** the grade the server returned at
verification (cached under `coderaid:{id}:grade`) and the credit it measured
(`coderaid:{id}:credit`). It no longer grades and no longer credits: the run was recorded one stage
earlier, so **there is nothing here for a refresh to repeat**. If no grade is cached the screen says
so and links back to verification rather than inventing a score.

Shows the real score with its **full breakdown**, the real XP earned, the real elapsed time, the
real stage count, per-skill XP gains with before/after levels (`levelAfter` from the live ledger,
`levelBefore` from that total minus what this run added — both server-derived figures), and a
narrative chosen by the verdict
(`config.resolved` vs `config.unresolved`). An unresolved run gets a "Run It Again" action and its
impact panel is relabelled "Impact you missed" rather than crediting improvements that never
happened. The Next Mission link resolves through `canStart` / `nextMissionId` against the player's
own progress.
State: `{ claimed, score }`.

**"Run It Again" now actually resets (2026-07-28).** It was a `<Link>` to the briefing, so the second
attempt opened on the first one's state: the investigation restored its selections, the diagnosis was
still confirmed, the fix was still applied, and the run clock had been ticking since the first
attempt — meaning the replay's elapsed time and hint count were inherited rather than earned. It is
now a button that calls `clearMissionWorkingState(missionId)` before routing, sweeping **all eight**
of this mission's local slots — `investigation`, `diagnosis`, `fix`, `verification`, `results`,
`grade`, `credit` and `run`. Unlike the investigation's Restart action it *does* clear `…:run`,
because a replay is a fresh attempt and must be timed from zero. The `mission_runs` rows in Postgres
are untouched, which is the point: a replay adds an attempt, it does not erase one.

### Missing-content behaviour
Investigation / diagnosis / fix / verification / results routes for missions with no config render a
polite "this step is still being written" placeholder with back-links. Because pages are statically
generated for all 20 missions, these URLs remain directly reachable even though no in-app CTA links
to them.

### Stage prerequisites (new 2026-07-20)
For missions that *do* have content, the four later stage routes now wrap their workspace in
`components/missions/StageGate.tsx`, which enforces the rules in `lib/stage-access.ts` (§15.3).
Diagnosis needs the investigation's key-clue threshold met, Fix needs a confirmed diagnosis,
Verification needs an applied fix, Results needs a completed verification. A mission already in the
ledger passes through at every stage, so review and replay are untouched. See §15.3.

### Resume logic
`useMissionResume(missionId)` is the only cross-stage state reader. Precedence:
`results.claimed` → Complete · `verification.completed` → Complete · `fix.applied` → Verification ·
`diagnosis.confirmed` → Fix · key-clue count ≥ required → Diagnosis · run telemetry exists →
Investigation · **else Briefing**. It also returns `started`, the real `cluesFound / cluesTotal`,
and `timeLeftLabel` (the mission estimate minus real time spent), which is what the dashboard and
mission-list "next action" cards render — they used to show the literals `2`, `"Investigate"` and
`"12 min"` to a player who had never opened the mission, and now say "Start" until one is opened.

---

## 7. Mission catalogue — 20 missions, 5 chapters, 2 tracks

`Chapter` now carries `track: "nodejs" | "future"`. Exports: `CHAPTERS`, `NODE_CHAPTERS`,
`FUTURE_CHAPTERS`, `NODE_MISSIONS`, `isNodeMission(mission)`, `chapterTrack(chapterId)`.

| Ch | Name | Track | Missions |
| --- | --- | --- | --- |
| 1 | Async JavaScript | `nodejs` | 5 |
| 2 | Node.js APIs | `nodejs` | 5 |
| 3 | Workers and Performance | `nodejs` | 4 |
| 4 | Databases | `future` | 4 |
| 5 | Caching and Distributed Systems | `future` | 2 |

`Category` union (mission-level): `"Async JavaScript" | "Node.js APIs" | "Workers & Performance" |
"Databases" | "Distributed Systems"`. The filter list `CATEGORIES` only ever offers the first three.
`MissionStatus` is now **authored content state only** — `available | locked | in-development |
coming-soon`. `completed` and `current` were removed from it: they describe a player, and are
derived from the ledger by `missionAvailability(mission, view)` (§5).

### The catalogue

`Availability` is the **derived** value the UI actually renders (`missionAvailability`); `status` is
the authored literal in the catalogue.

| # | id | title | diff | min | xp | authored status | **availability** | CTA |
|---|---|---|---|---|---|---|---|---|
| 1 | **`event-loop-overload`** | Event Loop Overload | Easy | 20 | 80 | available | **Available** | **playable end to end** |
| 2 | **`promise-all-cascade`** | Promise.all Failure Cascade | Easy | 25 | 100 | available | **Available** | **playable end to end** |
| 3 | **`async-map-trap`** | The Async Map Trap | Easy | 25 | 100 | available | **Available** | **playable end to end** |
| 4 | **`overlapping-scheduler-runs`** | Overlapping Scheduler Runs | Medium | 30 | 120 | available | **Available** | **playable end to end** |
| 5 | **`unhandled-rejection-storm`** | Unhandled Rejection Storm | Hard | 35 | 140 | available | **Available** | **playable end to end** |
| 6 | **`user-signup-latency-spike`** | User Signup Latency Spike | Medium | 35 | 140 | available | **Available** | **playable end to end** |
| 7 | **`jwt-session-expiry`** | JWT Session Expiry Bug | Easy | 25 | 100 | available | **Available** | **playable end to end** |
| 8 | **`health-check-flapping`** | Health Check Flapping | Medium | 30 | 120 | available | **Available** | **playable end to end** |
| 9 | **`graceful-shutdown-bug`** | Graceful Shutdown Bug | Medium | 35 | 130 | available | **Available** | **playable end to end** |
| 10 | **`rate-limiter-race`** | Rate Limiter Race Condition | Hard | 35 | 140 | available | **Available** | **playable end to end** |
| 11 | **`memory-leak-worker`** | Memory Leak in Worker Pool | Hard | 40 | 160 | available | **Available** | **playable end to end** |
| 12 | **`worker-queue-backlog`** | Worker Queue Backlog | Hard | 40 | 160 | available | **Available** | **playable end to end** |
| 13 | **`connection-pool-exhaustion`** | Connection Pool Exhaustion | Hard | 40 | 160 | available | **Available** | **playable end to end** |
| 14 | **`slow-api-incident`** | The Slow API Incident | Medium | 25 | 180 | available | **Available** | **playable end to end** |
| 15 | `n-plus-one-carnage` | N+1 Query Carnage | Medium | 35 | 140 | coming-soon | **Coming Soon** | disabled |
| 16 | `index-miss-investigation` | Index Miss Investigation | Medium | 30 | 120 | coming-soon | **Coming Soon** | disabled |
| 17 | `db-deadlocks-checkout` | Database Deadlocks in Checkout | Hard | 50 | 200 | coming-soon | **Coming Soon** | disabled |
| 18 | `read-replica-lag` | Read Replica Lag | Hard | 45 | 180 | coming-soon | **Coming Soon** | disabled |
| 19 | `redis-cache-meltdown` | Redis Cache Meltdown | Hard | 40 | 160 | coming-soon | **Coming Soon** | disabled |
| 20 | `payment-service-meltdown` | Payment Service Meltdown | Expert | 90 | 500 | coming-soon | **Coming Soon** | disabled |

Missions 1–5 are chapter 1, 6–10 chapter 2, 11–14 chapter 3, 15–18 chapter 4, 19–20 chapter 5.
Every mission has 4 objectives, tags, an XP value and a `rewardSkill` string. The authored status is
a **content** state only; the derived `Availability` column is what the UI renders, and for every
playable mission it moves Available → In Progress → Completed as *this* player plays them. Objective
`done` flags remain static literals and are decorative. There are currently **no missions in the
`locked` state**; the value remains supported by the type and the UI.

### Playability, precisely

- **Playable end to end (14):** the whole Node.js MVP. Chapter 1 — `event-loop-overload`,
  `promise-all-cascade`, `async-map-trap`, `overlapping-scheduler-runs`,
  `unhandled-rejection-storm`; Chapter 2 — `user-signup-latency-spike`, `jwt-session-expiry`,
  `health-check-flapping`, `graceful-shutdown-bug`, `rate-limiter-race`; Chapter 3 —
  `memory-leak-worker`, `worker-queue-backlog`, `connection-pool-exhaustion`, `slow-api-incident`.
  Every one of them is present in all five stage registries.
- **In development (0):** none. `slow-api-incident` was the last partially authored mission — it
  had an investigation stage only — and its diagnosis, fix, verification and results are now
  written, which closed the validator's final warning. (Two missions, `jwt-session-expiry` and
  `slow-api-incident`, used to be authored `status: "completed"` — a demo player's fake history that
  inflated skills, achievements and chapter progress for someone who had never played them. Both are
  now genuinely playable, and `slow-api-incident`'s objective `done: true` literals — the last
  authored player state in the catalogue — are gone with it.)
- **Coming soon (6):** every mission in chapters 4 and 5 — the entire Databases and
  Caching/Distributed Systems tracks. `n-plus-one-carnage` stays non-playable and is deliberately
  scoped away from `slow-api-incident`: the Chapter 3 mission is about request shape and query
  *count* in service code, the Chapter 4 one will be about ORM loading strategies, query planning
  and indexes against production-sized data.

**Completion is now only ever earned.** A mission reads as Completed when — and only when — there is
a record of the player finishing it in the ledger, which means the dead "review unavailable" state
cannot occur: you cannot have completed a mission that has no content to complete.

### Progress arithmetic

All three progress helpers moved to `lib/availability.ts` and count the **ledger**, not the
catalogue (§5):

- `overallProgress(view)` over `NODE_MISSIONS` — **0 of 14 (0%) for a new player**, rising by one
  per mission actually finished. It used to report a flat 4 of 14 (29%) to everyone, including
  someone opening the app for the first time.
- `chapterProgress(chapterId, view)` — 0/5, 0/5, 0/4, 0/4, 0/2 until missions are completed.
- `chapterState(chapterId, view)` returns `"coming-soon"` for any future-track chapter before
  looking at rows, and `"complete"` only when the player has finished every mission in it. Note the
  consequence, still pinned by a test: a chapter containing in-development missions can never read
  `complete`, because those resolve to `in-development` rather than `completed` whatever the ledger
  says. No catalogued chapter is in that state any more, so the test now injects a fixture chapter
  to keep the rule covered for the next mission someone starts writing.
- `playableSummary()` → `{ playable: 14, inDevelopment: 0, total: 14 }`. Player-independent: it
  describes the catalogue, so it stays a module-level function. **The map's "N of M playable" copy
  has moved 1 → 2 → 6 → 10 → 14 with no component change** — the count is derived, never written
  down.
- `chapterState(n, view)` can now return `"complete"` for chapters 1, 2 **and** 3 — the whole
  Node.js MVP is finishable. Chapters 4 and 5 return `"coming-soon"` before they look at any rows.

### The content cliff

| Stage | Missions with authored content |
| --- | --- |
| Briefing | **20** (derived by `resolveBriefing`) |
| Investigation | **14** — every Node.js mission |
| Diagnosis | **14** |
| Fix | **14** |
| Verification | **14** |
| Results | **14** |

There is no content cliff left inside the Node.js MVP: chapters 1, 2 and 3 are all complete, the
validator reports **0 errors and 0 warnings**, and the next cliff is the chapter-4 boundary, which
is a deliberate roadmap edge rather than unfinished work.

### The beginner mission — `event-loop-overload` (authored 2026-07-20)

**Scenario.** After the `api-service v3.8.0` deploy, a new reporting endpoint
`GET /api/reports/weekly` aggregates ~480,000 analytics events **synchronously inside the request
handler**. Because the work runs on the main JavaScript thread, the event loop is blocked for seconds
at a time and *unrelated* endpoints (`/api/health`, `/api/users/me`, `/api/products`) go slow with it.
The database and heap stay healthy throughout — deliberate negative evidence.

Difficulty Easy · severity **high** · 20 min · 80 XP · `rewardSkillId: "event-loop"` · chapter 1.

- **Investigation** — 5 tools (logs, metrics, code, trace, database); **8 evidence items, 5 key**,
  `requiredKeyClues: 3`. 10 `api-service` log lines (deploy, `records=480000`, a health check
  answered 4,955ms late, a `/api/users/me` timeout, `event_loop_lag_ms=6840`); 7 metric cards (lag
  p95 4ms→6.8s, CPU 31%→96%, API p95 240ms→5.2s, DB 42ms flat, heap flat, timeouts 8.4%, throughput
  85 req/min); a latency series with a deploy marker at index 4 ("Deploy v3.8.0"); 21 lines of
  `src/modules/reports/report.controller.ts` where an O(n²) `rows.find()` inside the event loop is
  the key selection; a trace of `GET /api/reports/weekly` (7,420ms) with spans auth 8 / db fetch 128
  / **report aggregation 7,190** / serialization 62, plus the queued health check at 4,955ms; 5 DB
  stats that all read healthy.
- **Diagnosis** — 5 root causes (correct: `synchronous-cpu-work-blocking-event-loop`; distractors are
  pool exhaustion, GC pauses, a slow external analytics API, oversized JSON), 7 evidence options of
  which **5 are correct**, `minimumEvidenceRequired: 3`, one hint that points at the reasoning
  ("why do *unrelated* requests slow down at the same time?") without naming the cause.
- **Fix** — 5 options. Correct: `move-report-generation-to-worker-thread`, with a real
  `node:worker_threads` example that creates the worker, handles both `message` and `error`, and
  returns `202 Accepted` with a job id. The other four are deliberately plausible:
  `Promise.resolve()` (explained as *not* moving work off the thread), a bigger connection pool, a
  longer HTTP timeout, and more PM2 processes — the last presented as genuine but partial mitigation
  and still wrong, since only the id named by `answers.fixId` resolves.
- **Verification** — 6 metrics (lag 6.8s→35ms, API p95 5.2s→240ms, report request 7.4s→120ms as an
  accepted job, throughput 85→210 req/min, timeouts 8.4%→0.3%, DB stable), an 8-point before/after
  chart, a 3-span 120ms breakdown against a 7,388ms unresolved one, 6 success logs, 5 checks — of
  which the database check is `dependsOnFix: false` and stays green on a failed run.
- **Results** — resolved and unresolved narratives, a fix recap, 4 metrics (one with a sparkline),
  4 lessons (async ≠ non-blocking; the loop is for short work; worker threads for CPU-bound JS;
  healthy DB metrics eliminate false leads) and `skillImprovement.skillId: "event-loop"`.
  **No score, XP, elapsed time or step count** — those come from grading and run telemetry.

Supporting skill credit: `event-loop-overload` was added to the `missionIds` of `nodejs-runtime`,
`worker-threads`, `performance-debugging`, `metrics-analysis` and `root-cause-analysis`, so a
completed run credits all five at the 40% supporting rate alongside the full `event-loop` award.

Two additive icon-key extensions were needed and made: `RootCauseIconId` gained `cpu | memory |
payload`, `FixIconId` gained `worker | timer`.

### The rest of Chapter 1 (authored 2026-07-20)

Four missions, each following the same five-stage schema. Every one enables all five investigation
tools, authors 8 evidence items (4–5 key) with `requiredKeyClues: 3`, offers 5 root causes and 5
fixes with exactly one resolving, and requires evidence from at least three tools to reach the
diagnosis — a single log line is never enough.

| Mission | Incident | Correct root cause | Correct fix |
| --- | --- | --- | --- |
| `promise-all-cascade` (Easy, 100 XP, `promises`) | A nightly vendor-enrichment run persists 0 of 48 profiles because one vendor returns 503 | `Promise.all` rejects on the first rejection and the 47 fulfilled values are unreachable | Settle every call with `Promise.allSettled`, persist the fulfilled results, record the rejected one by vendor and reason |
| `async-map-trap` (Easy, 100 XP, `async-javascript`) | A media worker reports 500 uploads processed in 14ms; 187 have no thumbnail | `files.map(async …)` returns an array of promises that is discarded, so the job returns before any work finishes | Await the mapped promises with a concurrency limit before completing the batch |
| `overlapping-scheduler-runs` (Medium, 120 XP, `background-jobs`) | A billing sync on a 60s interval now takes 95s, so runs overlap and 38 invoices are charged twice | `setInterval` schedules on the clock and does not wait for the async callback; the second run re-reads a pending list the first hasn't finished marking | A self-scheduling `setTimeout` set in a `finally`, plus an in-flight guard |
| `unhandled-rejection-storm` (Hard, 140 XP, `error-handling`) | `notification-service` exits 41 times an hour, stranding 214 messages each time | An async listener passed to `emitter.on` has no caller, so a provider failure becomes an unhandled rejection — which Node 20 terminates the process for | Handle the error at the async boundary: catch, log against the message id, mark it failed so the outbox retries |

The distractors are the ones an engineer would actually reach for, and several are *partially*
right — which is the point:

- `promise-all-cascade` offers catching each promise and returning `null`. It genuinely stops the
  cascade, and is wrong because the mission's brief is resilience **without losing error
  visibility**: it converts a loud wrong failure into a quiet wrong success.
- `async-map-trap` offers swapping `map` for `forEach`. Factually, that is strictly worse — `forEach`
  discards the promise outright, leaving nothing to await.
- `overlapping-scheduler-runs` offers an idempotency key on the charge. That is real mitigation and
  worth shipping, but the second run still happens and still duplicates every side effect that
  lacks a key. Two other distractors — a second replica and duplicate provider webhooks — are ruled
  out by evidence (a shared instance id in the logs; zero duplicate webhooks in the metrics) rather
  than by assertion.
- `unhandled-rejection-storm` offers a process-level `unhandledRejection` handler and
  `--unhandled-rejections=warn`. Both stop the crash; neither handles the failure, so the message is
  still stranded and the process continues from an unknown state. The mission is explicit that the
  Node 15 default exists for a reason.

`LogLevel` gained an `ERROR` member (with a rose badge in `LOG_LEVEL_BADGE`) for the crash and
failure narratives these missions needed.

### Chapter 2 — Node.js APIs (authored 2026-07-20)

Four missions completing the chapter, following the same five-stage schema. Each enables all five
investigation tools, authors 8–9 evidence items (5 key, 3–4 negative) with `requiredKeyClues: 3`,
offers 6 root causes and 6 fixes with exactly one resolving, and spreads key evidence across four or
five tools — no mission can be solved from a single log line.

| Mission | Incident | Correct root cause | Correct fix |
| --- | --- | --- | --- |
| `jwt-session-expiry` (Easy, 100 XP, `authentication`) | Users are logged out of valid sessions, mostly on pages that fire several API calls at once | `concurrent-refresh-token-rotation-race` — parallel requests expire together and each refreshes independently; the first rotates the refresh token, the rest present the old one and reuse detection revokes the family | `single-flight-refresh-with-safe-token-rotation` — share one in-flight refresh promise across concurrent 401s, cleared in a `finally`, leaving rotation and reuse detection untouched |
| `health-check-flapping` (Medium, 120 XP, `api-design`) | A third-party analytics slowdown restarts 37 containers in 30 minutes and pushes order errors to 11.4% | `liveness-probe-coupled-to-transient-dependencies` — one endpoint answers both probes and awaits every dependency unbounded, so 5s of third-party latency reads as a dead process | `separate-liveness-readiness-and-bounded-dependency-checks` — liveness answers from the process alone; readiness checks only what serving needs, each behind a short timeout |
| `graceful-shutdown-bug` (Medium, 130 XP, `process-lifecycle`) | Every deploy drops ~23 in-flight requests, rolls back checkout transactions and redelivers 31 acknowledged jobs | `immediate-process-exit-without-draining-work` — the SIGTERM handler closes the pool and exits within 4ms of a 30s grace period, without closing the server or waiting on anything | `bounded-graceful-shutdown-with-draining` — fail readiness, stop consumers, close the server, wait for in-flight work against a deadline, close resources last, then exit |
| `rate-limiter-race` (Hard, 140 XP, `api-design`) | Clients are allowed 147 requests against a limit of 100, and the overshoot grows with every replica | `non-atomic-distributed-rate-limit-counter` — `get()`, `+1` in Node, `set()`; concurrent instances read the same value and overwrite each other's increments | `atomic-shared-rate-limit-operation` — one atomic increment-and-expire performed by the shared store, so correctness no longer depends on replica count |

The distractors are again the moves an engineer actually reaches for, and several are genuinely
useful without being the fix:

- `jwt-session-expiry` offers disabling rotation and accepting a superseded token. Both make the
  logouts stop instantly, and both are marked wrong for the same reason: a server cannot distinguish
  a racing tab from a replayed stolen token, so either one trades a client-side coordination bug for
  a permanent loss of theft detection. Raising the access-token lifetime is wrong the other way —
  it makes the race rarer without touching it, at a real security cost. **The mission never teaches
  an insecure JWT practice as a solution.**
- `health-check-flapping` offers raising the liveness timeout and raising the restart threshold.
  Both are named as reasonable *mitigations* and neither resolves: liveness still means "every
  dependency answered", so the next slower dependency restarts the fleet again. Scaling out is
  explicitly counter-productive — every new instance runs the same handler.
- `graceful-shutdown-bug` offers a fixed `delay()` before `process.exit()`. It is the most dangerous
  distractor in the chapter because it visibly improves the error rate while waiting on nothing in
  particular, and the server keeps accepting new work throughout the sleep. Closing the database
  first and *then* waiting is offered too, to make the ordering constraint concrete.
- `rate-limiter-race` offers an in-process mutex. It makes the counter exactly correct on one
  instance — which is why it passes a local load test — and is invisible to the other seven. The
  evidence rules it out before the fix stage: overshoot is 0% at one instance and 47% at eight.
  Re-reading the counter before writing narrows the window without closing it.

`user-signup-latency-spike` gained one selectable investigation evidence item, `no-errors-in-logs`
(a logs-sourced summary line showing 1,284 requests, 1,284 × 201, zero errors, zero retries). It
matches the diagnosis evidence option of the same id, which had no investigation counterpart before,
and clears the validator's long-standing warning. Nothing existing was removed or weakened.

### The reference mission's authored content (the template to replicate)

`user-signup-latency-spike` — a welcome email sent synchronously inside the signup request path.

- **Investigation** — 5 tools; 6 evidence items, 4 key, `requiredKeyClues: 3`. 7 `auth-service` log
  lines; 6 metric cards (p95 3.2s critical, email 2.7s warning, insert 31ms, hash 154ms, CPU 38%,
  errors 0.3%); a latency series `[412,428,405,431,419,3140,3208,3172,3241,3186]` with a deploy
  marker at index 5 ("Release 4.2.0"); 12 lines of
  `src/modules/auth/registration.service.ts` where the awaited `sendWelcomeEmail` is the key line;
  5 DB stats; a trace of `POST /api/signup` (2916ms) with spans validate 12 / hash 154 / insert 31 /
  **send welcome email 2671**.
- **Diagnosis** — 5 root causes (correct: `synchronous-welcome-email`), 5 evidence options,
  `minimumEvidenceRequired: 2`, one hint.
- **Fix** — 5 options each with 3–4 explanation bullets and a code example
  (correct: `async-welcome-email`, a queue-based snippet).
- **Verification** — 5 metrics all passing (p95 3.2s→412ms ↓87%, throughput 110→152 req/min ↑38%),
  a 7-point before/after chart, a 4-span request breakdown totalling 215ms, 6 canned logs, 5 checks.
- **Results** — resolved and unresolved narratives, a fix recap, 4 metrics (one with a sparkline),
  4 lessons, `skillImprovement.skillId: "request-performance"`. The authored score / XP / "14m 32s" /
  step-count literals were removed when the grading engine landed; those now come from the run.

`slow-api-incident` is the parallel case, and is now complete. Its original investigation (an N+1
query loop in `order.service.js`) was preserved and extended rather than replaced: a fifth tool
(trace) and four more evidence items — per-query cost, the repeated trace spans, latency scaling
with page size, and database health — took it from 5 evidence items to 9, of which 7 are key across
5 tools. Its diagnosis, fix, verification and results were then written, so `validate:missions`
emits no warnings at all.

---

## 8. Meta / progression systems

### Skills — `lib/skills.ts` (canonical, rebuilt)

The single source of truth for the skill taxonomy. Every reference elsewhere uses a **stable skill
`id`**, never a display name.

**4 categories** (`SkillCategoryId`): `runtime` (JavaScript Runtime) · `node-core` (Node.js Core) ·
`apis` (Backend APIs) · `debugging` (Production Debugging).

**20 skill *definitions*** (`SKILL_DEFS: SkillDef[]`), each
`{ id, name, category, tier: "core" | "advanced", description, missionIds[], icon, accent }`.

**No level or XP is authored anywhere.** `Skill = SkillDef & { level, progress, currentXp,
nextLevelXp, totalXp }` is produced by `resolveSkill(def, ledger)`, and `skillsFor(ledger)` returns
the whole set as *this player* has it. A new player sees all 20 at level 0, "Not Started", because
that is the truth.

| Category | Skill ids |
| --- | --- |
| runtime | `async-javascript` · `promises` · `event-loop` · `closures-memory` · `error-handling` |
| node-core | `nodejs-runtime` · `streams` · `event-emitter` · `process-lifecycle` · `worker-threads` |
| apis | `api-design` · `authentication` · `validation` · `request-performance` · `background-jobs` |
| debugging | `log-analysis` · `metrics-analysis` · `distributed-tracing` · `root-cause-analysis` · `performance-debugging` |

Skill XP is credited by the grading engine (§14.2) at 40 XP per level, capped at level 10. A skill
rises only when a mission that lists it — or names it as its `rewardSkillId` — is completed. A skill
definition referencing a mission id that doesn't exist is now a **validation error**, so a renamed
mission can't silently stop crediting a skill.

Helpers, all ledger-aware and all defaulting to `EMPTY_LEDGER`: `getSkillDef(id)`,
`getSkill(id, ledger)`, `skillLevel(id, ledger)`, `skillsFor(ledger)`, `resolveSkill`,
`levelLabel(level)`, `LEVEL_LABELS`, `strengthFor(progress)`, `STRENGTH_BADGE`, `categoryName`,
`skillsInCategory`, `masteryPct(skill)`, `categoryAverage`, `skillsSummary(ledger)`,
`skillsToImprove(ledger, view, limit)`, `relatedMissions`, `completedMissions(skill, view)`,
`recommendedMission(skill, view)` (filtered through `canStart`, so the Skills page can't hand out a
dead CTA), `radarData(ledger)`, and `recentSkillActivity(ledger)`.

Two subtleties worth keeping:

- **`masteryPct` is not `skill.progress`.** `progress` measures progress *within* the current
  level, so a level-8 skill one point past its threshold would read 2% and drag the radar down.
  Category averages and the radar use mastery — the whole climb — instead.
- **`skillsToImprove` only suggests skills a playable mission can actually improve.** Advice the
  player cannot act on is not advice.

`levelLabel` thresholds: ≥9 Expert · ≥7 Advanced · ≥4 Intermediate · ≥1 Beginner · **0 → "Not
Started"**.

`FUTURE_TRACKS` — 4 roadmap-only entries (`sql-databases`, `redis-caching`, `system-design`,
`cloud-reliability`), rendered muted with a Coming Soon badge and **no detail drawer**. They are
deliberately *not* `Skill`s, so nothing can count them toward progress, radar axes or
recommendations. Rendered by `components/skills/FutureTracks.tsx`.

`RECENT_ACHIEVEMENTS` (2 authored display items) and `skillsSummary().progressDelta: 12` ("vs last
month") are **gone**. The Skills aside now renders `recentSkillActivity(ledger)` — real completions,
newest first, with real relative timestamps and an empty state — and the summary reports
`started` (skills with any XP) instead of a fabricated month-over-month delta.

### Landing / marketing content — `lib/data.ts`

- `CAREER_RANKS` — renamed to a Node.js ladder with an **authoritative numeric `minXp`**; `xpRange`
  is display-only, so nothing parses a label to get a number:
  Node.js Explorer `0` · Backend Apprentice `500` · Node.js Developer `3000` ·
  Backend Engineer `10000` · Production Debugger `25000` · Node.js Specialist `50000`.
- `rankMinXp(name)` — minimum XP for a rank by name, `0` when unknown.
- `LANDING_SKILLS` — 8 marketing tiles for live Node.js tracks; `FUTURE_SKILL_TRACKS` — 4 muted
  roadmap tiles, a separate array so nothing can render them as available or clickable
  (`components/SkillsGrid.tsx`).
- `CODERAID_TRAITS` — the 4-item counterpart to `TRADITIONAL_TRAITS` in the comparison section.
- `HERO_HIGHLIGHTS`, `CODERAID_FLOW`, `HOW_IT_WORKS`, `BENEFITS`, `NAV_LINKS`,
  `SKILL_COLORS`, `RANK_ACCENTS` — all reworded for Node.js.
- **The old `SKILLS` array is gone.**

### Player identity and rank — `lib/dashboard.ts`

**`DEMO_PLAYER` is gone.** There is no authored player any more. Two things remain, and they are
disjoint on purpose:

- **Identity** — `ProfileDraft` (persisted at `coderaid:profile`): name, avatar, slogan, path,
  experience, step, completed. Only name/avatar/slogan are consumed elsewhere; **never XP or rank.**
- **Progress** — the ledger (`lib/progress.ts`). `playerFrom(ledger, name)` composes the two into
  `{ name, rank, level, totalXp, streakDays }`, every field of which is derived. A new player is
  **level 1, 0 XP, Node.js Explorer, no streak** — because that is what they have earned.

`rankBand()` moved to `lib/progress.ts` alongside the XP curve it belongs with. `CAREER` (a
module-level constant) became `careerFor(ledger)`, returning `{ xp, currentRank, nextRank, xpMax,
atTopRank, rankPct, level, levelInto, levelNeeded, levelPct, blurb }`. **There is now an XP→level
formula** — `xpForLevel` / `levelFromXp` — so nothing is a free-standing literal (see §14.1).

Also in `lib/dashboard.ts`: `SIDEBAR_ITEMS`, `nextActionFor(mission)` / `buildNextAction(view)`
(derived from `recommendedMission(view)`, with the code preview pulled from that mission's
investigation config), `RESPONSE_SERIES`, `DAILY_RAID` (copy only — no route, no XP figure, a
disabled CTA and a note saying so), `PREMIUM`.

`nextActionFor` deliberately carries **no** progress figures. Step, phase, clues found and time
left used to be the literals `2`, `"Investigate"`, `2` and `"12 min"`; they now come from
`useMissionResume(missionId)`, which reads that mission's saved state and reports the real stage,
the real key-clue count and the mission estimate minus real time spent. When nothing is saved it
reports the *un-started* position — the briefing — and both "next action" cards say "Start" rather
than "Continue".

**`DASHBOARD_SKILLS` and `RECOMMENDED_MISSIONS` were deleted** — `SkillsSummary` reads
`lib/skills.ts` by id (`async-javascript`, `nodejs-runtime`, `root-cause-analysis`,
`error-handling`, `request-performance`) resolved against the ledger, and `RecommendedMissions`
derives its list from `NODE_MISSIONS.filter((m) => canStart(m, view))`.

### Achievements — `lib/achievements.ts`

**12 achievements** in 5 categories (mission-progress 3, technical-skills 3, consistency 2,
quality 2, special 2). They store no state: `getAchievements(sources, unlockTimes)` is a pure
function over

```
AchievementSources = { completedMissions, resolvedMissions, hintFreeResolved,
                       streakDays, totalXp, bestScore, skillLevel(skillId) }
```

and `achievementSources(ledger)` builds every field of that from the progression ledger. Nothing is
authored: `completedMissions` are runs the player finished, `resolvedMissions` are the ones whose
fix actually worked, and `hintFreeResolved` counts resolved runs where no hint was opened.

| id | title | measures |
| --- | --- | --- |
| `first-mission` | First Incident Resolved | **resolved** count ≥ 1 |
| `ten-missions` | 10 Incidents Resolved | **resolved** count ≥ 10 |
| `chapter-one-cleared` | Async JavaScript Cleared | resolved in chapter 1 ≥ chapter 1 size (5) |
| `debugging-specialist` | Root-Cause Specialist | `skillLevel("root-cause-analysis")` ≥ 7 |
| `event-loop-master` | Event Loop Master | `skillLevel("event-loop")` ≥ 7 |
| `async-expert` | Async Expert | `skillLevel("async-javascript")` ≥ 7 |
| `seven-day-streak` | 7-Day Streak | real streak ≥ 7 |
| `thirty-day-streak` | 30-Day Streak | real streak ≥ 30 |
| `perfect-diagnosis` | Perfect Diagnosis | best graded score ≥ 100 |
| `zero-hints-used` | Unassisted Debugger | **`hintFreeResolved` ≥ 5** — no longer a proxy |
| `production-incident-master` | On-Call Veteran | resolved with briefing severity > low ≥ 10 |
| `backend-engineer-rank` | Backend Engineer Rank | `totalXp ≥ rankMinXp("Backend Engineer")` = 10,000 |

**Unlock times are recorded, not authored — and now stamped by the server.** The authored
`unlockedAt` literals are gone. `useAchievements()` is a **pure read**: it derives the set from the
ledger and writes nothing. The stamping happens in `syncAchievements()` on the server, inside the
same request that recorded the run or the active day which crossed the threshold, and an id already
stamped keeps its original time. That was the last place the browser still asserted something it
had earned — and `player_achievements` has no insert policy, so the claim could only ever have been
advisory. UI: hexagon SVG badges, category tabs with counts, a summary with
a 7-dot streak strip fed by the real streak, and "latest" / "next to unlock" aside.

Note the honest consequence: three skill-level achievements need level 7, and some skills have only
one authored mission behind them. Those stay locked until more content exists — which is a true
statement about the catalogue rather than something to paper over.

### Leaderboards — `lib/leaderboards.ts` + `lib/server/standings.ts` (rewritten, phase 5)

**Every row is a real player.** The 30-entry hardcoded roster of fictional players, the
`TOTAL_PLAYERS = 12,480` constant, `HOME_COUNTRY = "Armenia"` and `HOME_COMPANY = "Koreez"` are all
**deleted**. They were the last authored people in the repo.

`lib/server/standings.ts` reads `best_runs` and `players` and produces one `StandingsRow` per player
who has finished at least one incident:

- `xp` and `missions` **per period** (week / month / all), counted from each run's `completed_on` —
  the player's own calendar date, so the periods line up with what the streak counts;
- `level` from the XP curve, `successRate` from the share of their best runs that resolved;
- `focus` from where their skill XP actually went, resolved through the skill taxonomy;
- `difficulty` from the band they mostly clear, ties breaking toward the harder one.

`lib/leaderboards.ts` is now **pure ranking over that data** — `getStandings`, `getLeaderboard`,
`getCurrentUser`, `getRankSummary` — which is what keeps it testable in Node. Ties break by
incidents cleared, then name, so standings are stable across refetches rather than depending on row
order.

**Privacy.** `GET /api/leaderboard` requires a session and returns 401 otherwise: the standings
carry other players' GitHub-derived display names, and nobody opted into publishing those. The page
renders a sign-in explanation rather than an empty board. The projection is the whole window onto
another player — name, avatar, level, XP, incidents, success rate, focus, difficulty. **No email**
(there is no email column, deliberately) and **no run detail**, so the board cannot leak which
answers anyone chose. `isCurrentUser` is stamped per request in the route, not in the shared
derivation, so one player's view cannot be returned to another.

**Scopes: Global only.** Friends, Country and Company were removed with the roster — there is no
friends graph, and a player has no country or company. They would have been tabs that filtered
nothing. Periods (week / month / all) and the category, difficulty and "similar level ±5" filters
survive, because all four are derivable from real play. Filters apply **after** ranking, so a
displayed rank means a true position; the podium is always the unfiltered top 3.

**The percentile is measured against the real population**, and only shown once there are ≥ 20
ranked players — below that the plain count says more ("2nd of 3" beats "Top 67%"). The seeded
12,480 made every percentile a compliment nobody had earned.

**`RANK_CHANGE` was deleted.** Nothing records what the player's rank was last week, so the arrow
could only ever have been decoration. The panel shows incidents cleared in the period instead.

### Onboarding — `/start`

4 steps: `STEPS = ["Your Identity", "Learning Goal", "Experience Level", "Confirm"]`.

1. **Your Identity** — name ≤ 20 chars required, 1 of 5 avatars, 1 of 5 slogans (reworded:
   "I debug before I guess", "Async problems fear me", "Logs tell the truth", …).
2. **Learning Goal** — step 2 was rebuilt. `PATHS: LearningGoal[]` now offers **4 Node.js goals**:
   `fundamentals` (Node.js Fundamentals), `apis` (Backend APIs), `debugging` (Production Debugging),
   `interview` (Node.js Interview Prep). Each carries a `focus` line. Stored as `pathId`; still read
   by nothing else.
3. **Experience Level** — `beginner` / `junior` / `mid`, each with a `personalization` line.
   **Starting ranks were removed** — the type comment states experience "is not a rank", it only
   tunes which incident is suggested first.
4. **Confirm.**

`recommendedStartingMission(experienceId)`: `beginner` → `event-loop-overload`,
`junior` → `promise-all-cascade`, `mid` → `user-signup-latency-spike`, with an unknown-id fallback to
the beginner entry. The completion card runs that suggestion through `canStart` and swaps in
`recommendedMission()` when it isn't playable, with copy explaining that more incidents are being
written.

**As of 2026-07-20 the beginner suggestion is genuinely playable**, so the onboarding CTA now opens
`event-loop-overload` directly instead of falling back — and `recommendedMission(EMPTY_VIEW)` returns
the same mission, so the wizard, the dashboard and the mission map all point a new player at one
place. A test asserts the two agree. **All three suggestions are now fully authored** — `beginner` →
`event-loop-overload`, `junior` → `promise-all-cascade`, `mid` → `user-signup-latency-spike` — so
none of them falls back, and `tests/chapter-two.test.ts` pins each one against its catalogue entry.
Persists to `coderaid:profile`, and — since 2026-07-29 — to `players` as well for a signed-in
player, via `saveProfile()` → `POST /api/profile`. The local write is not conditional on the remote
one succeeding: a signed-out player and a server hiccup produce the same behaviour the wizard had
before the route existed, which is why onboarding still works before there is an account.

#### The completion state (rebuilt 2026-07-22)

`/start` is **one route with three states**, decided by `startDestination()` in `lib/start.ts` and
rendered by `components/onboarding/StartExperience.tsx`. There is deliberately no second route.

| State | When | What renders |
| --- | --- | --- |
| `onboarding` | `completed` is false | the four-step wizard beside `OnboardingAside` |
| `success` | completed **in this interaction** | a compact, centred, one-time card |
| `resume` / `dashboard` | completed on an earlier visit | a `router.replace()` into training |

**`justCompleted` is React state and is never persisted.** That is the load-bearing part: it is the
whole difference between "you just set up your profile" and "you set it up last week". Persisting it
would recreate the problem it exists to solve — `/start` greeting a returning player with a success
screen for something they did days ago, every single visit.

**What the success card replaced.** The old completion state offered four competing actions at once:
a full marketing column, an "Already have progress? Continue" link still in the header, **"Enter
Dashboard" as the primary button** and "Start <mission>" as the secondary one. The mission was the
entire point of the screen and was the least prominent thing on it. The card now has one goal — start
the recommended first incident — with `Start Mission` as a full-width gradient button and `View
Dashboard` as a plain text link beneath it. The marketing column and the header action are gone in
this state only; the header action still appears during onboarding, where jumping to the wizard is
useful.

**The recommendation is derived, never hardcoded.** `firstIncident(experienceId, view)` runs
`recommendedStartingMission()` through `canStart()` and falls through to `recommendedMission(view)`
when the suggestion is not playable, so the CTA can only ever open a mission that plays end to end.

**Where a returning player is sent** — `returningMission(view, experienceId)`, in priority order:
a mission they have started and not finished, then the incident their onboarding answers
recommended if unfinished, then any other unfinished playable mission, then nothing, which the
component renders as `/dashboard`. Rule two is why this does not simply call `recommendedMission()`:
that helper ranks by catalogue order once nothing is in progress, so a Junior player told to start
Promise.all Failure Cascade would have been redirected into Event Loop Overload on their next visit,
contradicting the only instruction the app had given them. The redirect waits for **both** the local
draft and the ledger to hydrate, because a player who has completed everything belongs on the
dashboard and an unhydrated ledger looks identical to an empty one. The stage comes from `resumeFor`,
exported from `useMissionResume.ts` so the destination is known before navigating rather than after a
render.

**The storage copy is authentication-aware** (`storageNote(authenticated)`). It used to read "Your
profile is saved in this browser" to everyone, which is misleading by omission for a signed-in
player: their scores, XP, skills, achievements and rank are derived in Postgres from graded runs
(§16), and only their profile *preferences* are local. Signed out, it now explains what an account
is actually for — "Sign in when you run verification to save your score and progress" — which is the
one thing a player needs to know before reaching the wall. The footer suppresses the same sentence in
the success state rather than printing it twice on one screen.

**Local mission work is untouched by any of this.** The wizard writes only `coderaid:profile`;
investigation evidence, the diagnosis and fix picks, run telemetry and cached grades all keep their
own keys, and a Playwright spec re-runs onboarding with evidence already collected and asserts the
investigation state is byte-identical afterwards.

`OnboardingWizard` is now **controlled** — `StartExperience` owns the draft and its persistence,
because whether onboarding is complete decides the whole page's layout, and two components reading
the same `localStorage` key independently could not stay in step. The individual wizard steps are
unchanged.

### Settings — `/settings`

- **Profile** — name + avatar, written into `coderaid:profile` while preserving onboarding fields;
  explicit Save button with a transient confirmation. **Since 2026-07-29 it also reaches the
  server** for a signed-in player (`POST /api/profile`), so the leaderboard shows the name you just
  chose rather than the one GitHub supplied. The confirmation reflects what actually happened —
  saving locally and saving everywhere are different outcomes and are not reported as the same one.
- **Experience** — auto-saving, and as of 2026-07-21 it holds **exactly two preferences, both of
  which something reads**: `codeEditorTheme` (5 options) and `showLineNumbers`, consumed by both
  code surfaces via `lib/code-theme.ts` (below). Three controls were **removed** in that pass
  because nothing consumed them and none could be wired:
  - `defaultLanguage` — mission code is authored in one language per mission, so a preference could
    never change what the panel shows. `LANGUAGE_OPTIONS` went with it.
  - `soundEffects` — there are no audio cues anywhere in the app.
  - `theme` — CodeRaid has no light palette and every surface is hand-tuned dark, so the option
    could only ever save a value nothing rendered. `Theme`, `THEME_OPTIONS`, `isTheme` and the
    inline "light is still in progress" notice went with it, and **`SettingsEffects` was deleted
    outright** — it existed only to stamp `data-theme` / `color-scheme`, and
    `:root { color-scheme: dark }` in `app/globals.css` already says the same thing statically.
    The root layout no longer mounts it.

  A test pins the whole key set of `DEFAULT_SETTINGS`, so a preference nothing reads cannot be
  reintroduced silently. Stored JSON from any earlier shape degrades cleanly — `loadSettings`
  rebuilds the record field by field and ignores keys it no longer knows. Cross-tab sync via a
  custom `coderaid:settings-changed` event **and** the native `storage` event.
#### Code presentation — `lib/code-theme.ts` (new 2026-07-21)

The one place mission code is coloured, and the reason the two Experience preferences below the
theme row now do something. Pure, like `lib/stage-access.ts` and `lib/mission-validation.ts`:

- `tokenizeCode(line)` → `CodeToken[]` of `plain | keyword | string | comment | number`. It replaces
  a highlighter that lived privately inside `FixExplanationPanel`, and gained numbers and the
  remaining JS keywords on the way out. A test pins that concatenating the tokens reproduces the
  input exactly — silently dropping a character of mission code would be worse than not colouring it.
- `CODE_PALETTES` — one Tailwind colour set per `EDITOR_THEME_OPTIONS` entry, with
  `codePalette(id)` falling back to `one-dark-pro` for an id that no longer exists. `one-dark-pro`
  reproduces the exact colours both panels used before the preference was wired, so a player who
  never opens Settings sees no change. A test asserts every offered theme has a palette and that no
  palette reuses one colour for two token kinds.
- `components/ui/CodeText.tsx` supplies the React half: `useCodePreferences()` reads the settings
  and `CodeText` renders the tokens. Both `CodeInspectionPanel` (investigation) and the fix stage's
  implementation example use it, so the two surfaces cannot disagree. Hiding the line-number gutter
  costs no accessibility — the number is already in each selectable line's `aria-label`, and the fix
  example is an `<ol>`.

- **Progress** — `resetMissionProgress(storage?)` behind an `alertdialog`. It sweeps every
  `coderaid:` key **except** `coderaid:profile` and `coderaid:user-settings`, collecting first and
  deleting after the loop (deleting mid-loop would reindex and skip entries), returns the number of
  keys removed, and the caller then `router.refresh()`es. The storage handle is injectable so the
  sweep is testable.

  **Two controls when signed in, as of 2026-07-31 (§12 item 7).** For a signed-out player the local
  sweep genuinely resets everything, because the ledger is local. For a signed-in player it can only
  clear saved *stage* state, so `ProgressSection` offers that as **Clear Saved State** and adds a
  separate, more destructive **Reset Everything** that calls `POST /api/reset`. They are deliberately
  two controls rather than one: collapsing them would make the safe action feel dangerous and the
  dangerous one easy to reach by habit. The account reset clears the local state too — leaving a
  confirmed diagnosis behind for a mission the server now considers unplayed is exactly the stale
  mismatch the rest of the app works to avoid.

  `ResetProgressDialog` takes a `ResetVariant` of `"progress" | "saved-state" | "account"` rather
  than the boolean it used to, because a boolean could not express the case that matters most: a
  signed-in player has *two* destructive actions and confusing them is what the dialog exists to
  prevent. Each variant spells out what is cleared **and what is kept**; the `account` copy says the
  runs "stay recorded, they just stop counting", never that they are deleted. The dialog stays open
  on failure with a `role="alert"` message, since closing it would read as success.

---

## 9. Persistence — the complete storage contract

Storage is now split by a single question: **is it scored?** Anything scored lives in Postgres and
is written only by a route handler. Everything below is *working state* — what you have done so far
in a mission you are playing, and how you like the app configured. None of it decides a number, and
that is exactly why a mission can be played without an account.

| Key | Written by | Shape |
| --- | --- | --- |
| `coderaid:profile` | onboarding, settings profile | `{ name, avatarId, slogan, pathId, experienceId, step, completed }`. **Since 2026-07-29 this is no longer the only copy for a signed-in player** — everything except `step` is mirrored to `players` through `POST /api/profile`. It stays the whole truth signed out, which is what lets onboarding run before there is an account to attach it to |
| `coderaid:user-settings` | settings experience | `{ codeEditorTheme, showLineNumbers }` — stored values from a previous shape are dropped by the loader |
| `coderaid:player:progress` | **nothing, any more** | The pre-migration ledger. Read-only: shown to a signed-out player who earned it before accounts existed, and cleared once phase 4 imports it. No code path writes this key. |
| `coderaid:{missionId}:grade` | verification | The grade **the server returned** — cached so the results screen renders the same verdict without a second round trip or a second run row |
| `coderaid:{missionId}:credit` | verification | What the run added, as the server measured it: `{ xpAdded, skillXpAdded, firstCompletion }` |
| `coderaid:{missionId}:run` | every stage | `{ startedAt, lastActiveAt, stagesCompleted: MissionStage[], hintsUsed: string[] }` — the run telemetry the grade is computed from |
| `coderaid:{missionId}:investigation` | investigation | `{ activeTool, collectedEvidenceIds: string[] }` |
| `coderaid:{missionId}:diagnosis` | diagnosis | `{ rootCauseId, evidenceIds: string[], confirmed }` |
| `coderaid:{missionId}:fix` | fix | `{ fixId, applied }` |
| `coderaid:{missionId}:verification` | verification | `{ run, completed }` |
| `coderaid:{missionId}:results` | results | `{ claimed, score }` |

`MissionRecord` is `{ missionId, completedAt, completedOn, score, xpEarned, durationMs, hintsUsed,
resolved, attempts }` — still the ledger's wire shape, now produced by `lib/server/ledger.ts` from
`best_runs` rather than written by the browser.

**The ledger response carries a third field as of 2026-07-29.** `GET` and `POST /api/ledger` both
answer `{ ledger, claimed, profile }`, where `profile` is `ServerProfile`
(`{ name, avatarId, slogan, pathId, experienceId, completed }`) or `null`. `hasClaimed()` became
`playerRecord()` for this: the claim flag and the profile live in the same `players` row, so reading
them together costs one wider `select` rather than a second round trip. Both halves **fail closed in
the same direction** — a failed read answers `claimed: true` (never offer an import that cannot
succeed) and `profile: null`, which `ProgressProvider` reads as *keep what you have* rather than as a
blank name. That distinction matters: `null` and `{ name: "" }` would otherwise both wipe the local
draft, and only one of them is a fact.

Two invariants are enforced on read (`coerceLedger`), not trusted — and they apply to the **server's
response** as much as to stored JSON, because both are values this tick did not construct:

- `totalXp` is recomputed as the sum of the mission records, so nothing can leave the headline XP
  disagreeing with the history behind it.
- Anything without `version: 2` — corrupt JSON, or the old
  `{ xpFromMissions, skillPoints, claimedMissions }` shape — resets to `EMPTY_LEDGER` rather than
  throwing or half-loading.

Events, not storage keys: `coderaid:settings-changed` (settings sync) and `coderaid:progress-changed`
(fired after a local write, so every mounted view re-reads; the ledger itself is refetched rather
than re-read, and the native `storage` event covers other tabs).

`resetMissionProgress()` sweeps the whole `coderaid:` namespace except `coderaid:profile` and
`coderaid:user-settings`. **What that means now depends on whether you are signed in**, and the UI
says so rather than promising more than it can do:

- **Signed out** — it genuinely resets you to zero. The ledger is local.
- **Signed in** — it clears saved stage state so every mission replays from its briefing, and
  nothing else. Runs are append-only by design, so earned XP survives. The dialog lists exactly
  that. Replaying can only improve a score; a worse attempt is recorded and changes nothing.

**Zeroing a signed-in player's earned progress is a separate, server-side action** as of 2026-07-31:
`POST /api/reset` stamps `players.reset_at` and every derivation reads past it (§12 item 7, §16.8).
It is not a `localStorage` operation at all, which is why it is not in the table above — the only
thing it does to storage is call `resetMissionProgress()` afterwards, so the local stage state cannot
be left describing missions the server now considers unplayed.

---

## 10. Design system

- **Palette** — near-black navy surfaces `base.950 #05060d` → `base.600 #161b38`; accents
  `electric` (sky-blue `#38bdf8/#0ea5e9/#0284c7`) and `violet` (`#a78bfa/#8b5cf6/#7c3aed`).
- **Utilities** in `globals.css` — `.surface`, `.surface-strong`, `.chip`, `.text-gradient`,
  `.thin-scroll`. Body carries two fixed radial gradient glows. `scroll-padding-top: 5.5rem` clears
  the sticky header.
- **Tailwind extras** — shadows `neon` / `neon-blue` / `card`; background images `grid-fade` and
  `radial-glow`; animations `pulse-soft` (2.4s), `float` (6s), `scan` (4s).
- **Primitives** — `ui/Logo.tsx`, `ui/Reveal.tsx` (framer-motion `whileInView` fade+lift),
  `ui/AvailabilityBadge.tsx` (`AvailabilityBadge` + `AvailabilityNote`).
- **Availability treatment** — Completed emerald · In Progress violet · Available electric ·
  Locked / Coming Soon muted white/slate · In Development amber. Unavailable rows are additionally
  dimmed, and disabled CTAs always pair a state label with an `AvailabilityNote`.
- **Recurring patterns** — hexagon badges via `clip-path` polygon or inline SVG; progress bars are
  `rounded-full bg-white/[0.08]` with an inline-width gradient fill; dialogs and filter panels are
  bottom sheets on small screens and slide-overs/centred dialogs above, all closing on Escape; tab
  strips use `role="tablist"` + `aria-selected`.
- **App shell** — `DashboardShell` = sticky sidebar (Dashboard / Missions / Skills / Leaderboards /
  Achievements / Settings + a Go-Premium card) plus a sticky top bar with streak / XP / rank pills.
- **Responsiveness** — multi-column grids collapse to single columns; the career rail and log/code
  panels scroll horizontally inside their own containers so the page body never scrolls sideways.

---

## 11. What is genuinely interactive vs. mocked

**Real behaviour (state, gating, persistence, derivation):**
tool tab switching · evidence selection, batching and de-duplication · the key-clue gate ·
root-cause and evidence selection with a blocker-aware confirm gate · fix selection driving the
explanation panel · mission resume deep-linking · settings auto-save with cross-tab sync ·
namespace-scoped progress reset · leaderboard scope/period/filter/pagination · skills search +
filter + detail drawer · **availability gating** (badges, disabled CTAs, notes, recommendations
and next-mission links, derived from which stage configs exist) — plus, new in this pass:

- **Grading, server-side.** `lib/grading.ts` scores the run: root cause 45, evidence 25 (a balanced
  F-score, so padding the case with irrelevant findings costs precision), fix 30, minus 5 per hint
  opened. A wrong diagnosis with a wrong fix scores 0 and resolves nothing. XP earned is
  `mission.xp × score / 100`. **The answers are an input, not something the module knows**, and only
  `POST /api/runs` ever pairs them with a submission. The formula is deliberately public — knowing
  the root cause is worth 45 points tells you nothing about *which* root cause is right — which is
  what lets the results screen render a breakdown the server computed.
- **Verification measures something.** `resolveVerification()` branches on whether the applied fix
  actually resolves the root cause. A wrong fix reports unchanged metrics, the slow span still on
  the critical path, the pre-fix logs and failed checks — except checks about unrelated subsystems
  (`dependsOnFix: false`), which stay true either way.
- **Progression, derived in Postgres.** The ledger holds total XP, per-skill XP, one record per
  completed mission, active days and achievement unlock times — all derived from `best_runs`,
  `player_active_days` and `player_achievements`. XP → level → rank are still formulas over it:
  `xpForLevel(L) = 50·L·(L−1)`, rank from `CAREER_RANKS.minXp`. Best-run-wins is now a **query**
  rather than a mutation, so a refresh cannot farm XP and a worse replay cannot reduce progress —
  properties that fall out of the schema rather than being enforced by client code.
- **Run telemetry.** `lib/run.ts` records when a mission was started, which stages were completed
  and which hints were opened — so score, elapsed time and step count are measured, not authored.
- **Skills accumulate.** `lib/skills.ts` authors definitions only (`SKILL_DEFS`); level, XP and
  progress are resolved against the ledger by `skillsFor(ledger)`. 40 XP per skill level, cap 10.
- **Achievements** derive from the ledger and are stamped **by the server** on first crossing.
  "Unassisted Debugger" measures genuinely hint-free runs; the "Resolved" achievements count runs
  that actually resolved.
- **The whole leaderboard is real**, not just the player's row: every entry is a player who has
  finished an incident, ranked by runs this server graded.
- **Auth.** GitHub OAuth, real. Missions play free; the wall is at Run Verification, because that is
  where a score starts being recorded.
- **The profile is persisted** (new 2026-07-29). Settings and the onboarding wizard both `POST
  /api/profile`, which writes the six columns `0001_init.sql` grants. Renaming yourself in Settings
  now changes what the leaderboard shows other people, and the ledger response carries the stored
  profile back so the top bar and the leaderboard cannot disagree about your name (§12 item 17,
  §16.7).
- **The landing page's preview is a working preview** (new 2026-07-29). Its three tabs — Code, Logs,
  Metrics — switch, and its CTA opens `user-signup-latency-spike`, the mission every line in it is
  quoted from. It was three tabs that did not switch and a primary button with no handler, styled
  exactly like the working CTA beside it.
- **The top bar's account menu opens** (new 2026-07-29). Settings, Achievements, and then either Log
  out (a form POSTing to `/auth/sign-out`, matching the sidebar) or Sign in — because missions play
  without an account, so offering a signed-out visitor "Log out" would be one piece of theatre
  swapped for another. It closes on outside `pointerdown` and on Escape. It was a
  `<button aria-label="Account menu">` with a chevron and no handler, which is the worst shape
  decoration can take: the label *announced* a menu that could not be opened.

**Mocked or static:**
- All logs, metrics, traces, code, DB stats and chart series are hand-authored literals. They are
  the *scenario*; what is now dynamic is which of them the verification reports back.
- **The verification "run" executes for one mission and is a `setTimeout(1400ms)` for the other
  thirteen.** `event-loop-overload` runs real quadratic work and measures the real main thread
  (§17); elsewhere nothing executes, though what it reports is still derived from the player's fix
  rather than fixed in advance.
- Availability gating is client-side UI only; all 120 stage URLs are statically generated and
  directly navigable, so a typed URL still reaches the "still being written" placeholder. For
  missions that *do* have content, `StageGate` (§15.3) blocks a later stage whose prerequisite state
  doesn't exist — but that is client-side consistency protection, not security. **It no longer needs
  to be security:** the ledger is not editable from devtools any more, and skipping straight to
  verification submits an empty diagnosis, which the server grades as zero.
- `DAILY_RAID` is copy only — now labelled Coming Soon with a disabled CTA and no XP figure, so it
  no longer advertises a reward the ledger could never credit.
- There is no light palette, and no control offers one — CodeRaid is dark, declared once as
  `:root { color-scheme: dark }` in `app/globals.css`.
- `/demo` is still a placeholder page, and **nothing in the footer points at it any more**: the
  Privacy Policy, Terms of Service, GitHub, Twitter and Discord links that did are removed rather
  than rewritten (§12 item 15). Every remaining footer link goes somewhere real.
- **Log out really logs out.** It is a form POSTing to `/auth/sign-out`; afterwards `/api/ledger`
  and `/api/leaderboard` both 401, and two Playwright specs assert exactly that rather than
  asserting the UI changed (§12 item 13, §15.5). It used to be `<Link href="/">`, which left the
  session entirely intact.
- **The Premium block is gone** — it was a handler-less button selling incidents, rewards and
  analytics that do not exist (§12 item 14).
- **The Next Action sparkline is the mission's own latency series**, projected by
  `sparklinePoints()`, so the chart and the headline metric beside it describe one incident. The
  shared hardcoded `RESPONSE_SERIES` squiggle is deleted (§12 item 16).
- **Objectives no longer carry a `done` flag.** Six of the eighty said `true`, and the mission
  browser rendered those as completed checkmarks for players who had never opened the mission
  (§12 item 18).
- ~~**Profile edits never leave the browser.**~~ **False since 2026-07-29** — moved to the real list
  above. Settings and onboarding now `POST /api/profile`, and `players.display_name` is no longer
  written once by the sign-up trigger and never again (§12 item 17).
- **Display names are not moderated.** `sanitizeDisplayName` strips control characters, zero-width
  characters and bidi overrides — a rendering guard, so one player's name cannot break or reorder
  the row beside it — and bounds the length. It is **not** a word list and there is no review queue,
  so a determined player can still pick a rude handle that everyone on the leaderboard sees. This is
  the part of item 17 that is still open; half a filter implemented here would read as protection
  that is not there.

---

## 12. Known inconsistencies and debt

Fixed in the "real progress and data" pass (do not re-plan these):

- **The grading engine exists** (`lib/grading.ts`). The `correct*` fields are read; wrong answers
  fail. Debt items 1 and 5 are closed.
- **The ledger is no longer orphaned** — it *is* the progression model (`lib/progress.ts`), and XP,
  level, rank, streak, skills, achievements, mission status and the leaderboard row all read it.
  `DEMO_PLAYER` is gone; so is the level-7-versus-level-24 contradiction. Items 3 and 9 closed.
- **Hint usage is tracked** per run, so `zero-hints-used` measures what it claims. Item 4 closed.
- **Step count is real** and comes from `MISSION_FLOW` (6 stages) via run telemetry. Item 5 closed.
- **The fix stage restates the player's own diagnosis**, falling back to the authored line only
  when no diagnosis was saved. Item 6 closed.
- **Reward skills are ids, not free text.** `Mission.rewardSkillId` and
  `skillImprovement.skillId` both reference `lib/skills.ts` by stable id. Item 10 closed.
- **One achievement system.** `RECENT_ACHIEVEMENTS` is gone; the Skills aside now shows real
  recent activity from the ledger (`recentSkillActivity`). Item 11 closed.
- **No mission claims to be completed on the player's behalf.** The four fake "completed" demo
  missions are now `in-development`, which is what they are, so the dead review CTA is gone.
  Item 12 closed.
- **`GAME_STATS` deleted** — an unrendered fixture describing a 4,350 XP player who never existed.

Fixed in the "quality gates and second mission" pass, 2026-07-20 (do not re-plan these):

- **ESLint is installed and wired.** `.eslintrc.json` extends `next/core-web-vitals`;
  `npm run lint` runs non-interactively and reports clean. The one warning the config exposed (an
  `aria-disabled` on a `<li>` in `SkillsGrid`) was fixed rather than suppressed. Old item 6 closed.
- **A test runner is wired up.** Vitest, `npm run test` / `test:watch`, 197 tests in 10 files,
  living **in the repo** this time. Old item 5 closed. §15.1.
- **`npm run typecheck`** exists (`tsc --noEmit`). No TypeScript configuration was changed.
- **Mission content is validated automatically** (`npm run validate:missions`). §15.2.
- **A second mission is playable.** `event-loop-overload` is fully authored, is the beginner
  recommendation, and became playable purely by appearing in the five stage registries — no
  component or count was edited.
- **Stage prerequisites are enforced client-side.** Typing `/results` for a mission you haven't
  played no longer credits a graded run. §15.3.
- **The authored-status audit is closed and pinned by a test.** No mission carries `"current"` or
  `"completed"`; `user-signup-latency-spike` was already `available` before this pass.

Fixed in the Supabase migration, 2026-07-21 (do not re-plan these):

- ~~**No backend, no auth, no server-authoritative state.**~~ **Resolved.** Supabase + GitHub OAuth;
  answers behind `server-only`; grading and every scored write in route handlers holding the
  service-role key; the ledger derived in Postgres. The ledger is no longer editable from devtools,
  and a direct `POST` to `mission_runs` with a player's own token returns **403** — verified.
- ~~**The leaderboard field is fictional.**~~ **Resolved.** The 30 authored players and
  `TOTAL_PLAYERS = 12,480` are deleted; standings come from `best_runs`.
- **Progress survives the browser.** A pre-account local ledger can be imported once (§16.4).

Genuinely outstanding:

1. **The verification run is a 1400ms timer for 13 of the 14 missions.** ~~Nothing executes or
   measures anything — this is the largest remaining piece of theatre.~~ **Partly resolved
   2026-07-22.** `event-loop-overload` now *executes* its incident: real quadratic work over 12,000
   rows, with the main thread's responsiveness really measured (§17). The other thirteen still show
   the derived report behind the timer, because their incidents are not reproducible in a browser
   the way an event-loop stall is. Extending it means writing a scenario per mission, and only some
   missions can have one honestly — see §17 for which and why.
2. **No component tests; browser coverage is one mission deep.** ~~The authenticated round-trip is
   covered by throwaway probes rather than a committed test.~~ **The authenticated half is resolved**
   — `e2e/authenticated.spec.ts` mints a session and covers grading, the ledger, the replay rule, the
   claim, the leaderboard, the replay limit and RLS as committed specs (§15.5). What remains under this item:
   there are still no *component* tests, and the browser coverage is still one mission deep — the
   other thirteen are covered by Vitest rules only.

   **~~The authenticated specs run against the live Supabase project.~~ Resolved 2026-07-31 — with an
   ephemeral local stack rather than a second hosted project.** `supabase/config.toml` is committed,
   CI runs `npx supabase start`, and the whole stack lives and dies inside the run. Nothing touches
   production. Two things fell out of it that a second hosted project would not have given:

   - **Migrations are now applied by a machine, on every run, from scratch.** They are applied *by
     hand* to the hosted project, so one could sit in the tree unapplied — or fail outright, as 0004
     did — while CI stayed green. `supabase start` replays all five from an empty database, so a
     migration that cannot be applied is a red build. **This would have caught the 0004 `42P16`
     failure before it ever reached the dashboard**, verified by re-running the old `create or
     replace` form against a fresh stack.
   - **The authenticated specs no longer skip on forks.** Repository secrets are not exposed to fork
     pull requests, so `hasCredentials()` silently skipped the twenty specs that matter most on
     exactly the contributions least likely to be trusted. The local stack's keys are fixed published
     demo values, so there is nothing to withhold.

   **It also surfaced the defect that made the whole item urgent — see item 21.**
3. **Content scale — CLOSED as a decision, 2026-07-30. The MVP ships at 14 missions and 1,830 XP.**
   This item read "the highest-value work once the rest is done" through several passes. It is no
   longer open work: the catalogue is **deliberately frozen** at the 14 Node.js missions, and
   Chapters 4 and 5 stay Coming Soon. Everything the freeze made permanently unreachable is now
   rendered as roadmap rather than as a goal — see item 4, which was the consequence and is where
   the work went. (This item read "6 of 14 playable" until 2026-07-21 — it was written before the
   Chapter 2 and 3 passes and was left stale by them.)
4. **~~Skill-level achievements may be unreachable at current content volume.~~ Resolved
   2026-07-30 — and it stopped being "may be" the moment the catalogue was frozen.** While more
   missions were expected, an unreachable achievement was a true statement about an unfinished
   catalogue that would resolve itself. Freezing the MVP at 1,830 XP turned it into a permanent
   promise the product cannot keep, which §4 principle 11 forbids: *a control nothing can honour is
   worse than no control.*

   **What was measured**, by `lib/reach.ts` and pinned by `tests/reach.test.ts` — every figure
   derived from the catalogue, none written down:

   | Promise | At a 1,830 XP ceiling |
   | --- | --- |
   | Node.js Explorer (0), Backend Apprentice (500) | reachable |
   | Node.js Developer (3,000) … Node.js Specialist (50,000) | **4 of 6 ranks unreachable** |
   | `backend-engineer-rank` — *"Earn 10,000 XP"* | **unreachable** |
   | `event-loop-master` — `event-loop` level 7 = 280 skill XP | **unreachable**; the skill maxes at 80 XP = level 2 |
   | `debugging-specialist` (732 XP), `async-expert` (356 XP) | reachable |
   | `production-incident-master` — 10 above-low-severity | reachable; all 14 qualify |
   | `streams`, `validation` skills | **no authored mission trains either** — level 0 forever |

   **The rule now in force: anything beyond the derived ceiling is rendered as roadmap and excluded
   from progress counts** — the same treatment future tracks already had. The four ranks are muted
   and badged on the landing rail; the dashboard bar measures progress toward *exhausting the
   catalogue* instead of toward a rank no play can fund, and names the next one as Coming Soon; the
   two achievements get a Coming Soon state with no progress bar and no CTA, sort last, and leave
   both halves of the unlocked-of-total figure. `Achievement.roadmap` is **derived from the
   catalogue, not authored**, so writing Chapter 4 lifts the treatment with no threshold edited
   anywhere — and `tests/reach.test.ts` goes red on purpose to say so.

   **A real defect surfaced underneath it.** `streams` and `validation` were averaged into
   `categoryAverage` and `skillsSummary().overall`, so two permanent zeros were counted as the
   *player's* shortfall: a flawless playthrough read **63%** overall mastery when it should have read
   70%, and dragged the node-core and apis radar axes down with it. Planned skills are now excluded
   from every aggregate. They are still rendered, badged Coming Soon, because the taxonomy naming
   them is honest — what was dishonest was scoring the player against them.

   **Not fixed, and deliberately:** 100% overall mastery is still unreachable, because `masteryPct`
   measures the climb to level 10 (400 skill XP) and most skills cannot get there at 14 missions.
   That is a progress *figure*, not a goal or a locked card — nothing promises it — so it is left
   alone and stated here instead. `tests/reach.test.ts` pins that too, so the distinction does not
   get quietly re-read as a bug.
5. **Every page load costs three Postgres round trips.** `ProgressProvider` POSTs `/api/ledger` on
   mount, which upserts the active day, rebuilds the ledger, syncs achievements and rebuilds it
   again. Honest at this scale; the fix when it isn't is caching, not a stored total.
6. **The leaderboard reads every row of `best_runs` on each request.** Fine at one row per player
   per completed mission; the fix when it isn't is a materialised view refreshed on write.
7. **~~There is no server-side reset.~~ Resolved 2026-07-31 — as a TOMBSTONE, not a delete.**
   Runs are append-only, so "Reset Progress" could not erase earned XP for a signed-in player; the
   copy said so, which was honest but left the control weaker than players expect. It now can, and
   without deleting anything: **`players.reset_at` marks the moment a player started over, and every
   derivation reads past it.**

   **Why not a delete.** Append-only is load-bearing in three separate places, not one:

   | It is what makes… | A delete would… |
   | --- | --- |
   | best-run-wins a *query* over rows rather than a mutation | leave nothing to query |
   | a replay an *upgrade* rather than a second award | let the same mission be farmed again |
   | the replay limit self-enforcing — `lib/replay-limit.ts` **counts rows** | **turn Reset Progress into a rate-limit bypass** |

   That third one is the sharp edge and is the reason the decision went the way it did. A delete is
   still the right answer to a genuine erasure request — but that is a different feature with a
   different name, and it should delete the account.

   **Where the filter lives.** `0004_player_reset.sql` applies it **in SQL, inside `best_runs`**,
   which is what makes one reset reach the ledger and the leaderboard at once instead of two places
   that drift apart. Scores, XP and skill totals therefore need no application code at all.
   `lib/reset.ts` covers only the two sources the view cannot reach, and they are treated
   differently on purpose:

   - **Active days are filtered, not deleted.** The streak restarts; the visit history survives for
     analytics. A day counts if it is the **reset day or later** — someone who reset at 14:00 was
     genuinely here that day, and discarding it would break a streak they actually kept.
   - **Achievement stamps are deleted**, by the route. An unlock time is a *derived conclusion*, not
     evidence (§4 principle 12); a stamp the ledger no longer supports is a second source of truth
     that disagrees with the runs immediately. `ledgerFor()` filters them as well, as belt and
     braces for a reset whose second write failed.
   - **An instant must be strictly after the tombstone; a calendar day need only be on it.** Two
     branches because two columns are stored differently, and comparing a `date` as an instant would
     silently drop the reset day.

   **Both failure directions fall the same way: "not reset".** An unparsable value is kept, and a
   failed `reset_at` read is treated as "never reset" — because that read fails on any deploy where
   0004 has not been applied, and blanking a player's earned progress is a far worse error than
   showing progress a reset should have hidden.

   **What a reset deliberately does *not* do**, recorded because the omissions are decisions:
   it does not refill the replay limit (which counts raw `mission_runs`, unfiltered), does not
   re-open the one-time pre-account claim (`players.claimed_at` — that would make it repeatable),
   does not touch the profile or preferences, and does not delete the account.

   **`POST /api/reset` holds the service-role key**, unlike `POST /api/profile` which deliberately
   runs as the user (§16.7). The asymmetry is the point and §16.8 states it: `reset_at` is not one of
   the six player-writable columns and must not be, because a browser-writable tombstone could be set
   to the **future**, silently voiding every run the player went on to record.

   **Two real defects surfaced while proving this works**, both of which a reasoning-only pass would
   have shipped:

   - **The tombstone was stamped from the wrong clock.** `new Date().toISOString()` in the route is
     the *application server's* time; `mission_runs.completed_at` is the *database's*. The gap
     measured ~2 seconds, which was enough for a just-finished run to sit after its own tombstone and
     survive it — 80 XP still on the ledger after a successful reset. Fixed by writing Postgres's
     `'now'`. §16.8 has the full account, including why the rule the codebase already stated about
     the browser's clock did not look like it applied to the server's own.
   - **A view that could no longer be replaced.** Below.

   **A real defect surfaced on the first attempt to apply 0004.** `0003` had set the view's options
   with `alter view` rather than recreating it, so the live view still carried the column list `0001`
   expanded from `mission_runs.*` — from before `0002` added `source`. `create or replace view` may
   only *append* columns, never reorder or rename one, so re-expanding the star put `source` ahead of
   the trailing `attempts` and Postgres refused with `42P16`. `0004` drops and recreates instead,
   which makes its `revoke` load-bearing for a **second** reason: a recreated view is a new relation,
   and Supabase's default privileges grant `SELECT` on new public relations to `anon` and
   `authenticated` all over again. Recreating the view without the revoke would have silently
   reopened item 20. The corollary is now written beside the house rule in `0001_init.sql`.
8. No error boundaries, no analytics. Loading states now exist on the leaderboard and the ledger.
9. ~~**No CI.**~~ **Resolved.** `.github/workflows/ci.yml` runs
   `typecheck → lint → validate:missions → build → test` on pushes to `main` and pull requests
   targeting it, on Node 20 with npm caching and no deployment step (§15.4).
   **Reordered 2026-07-21:** `build` used to run last, after `test`. Because
   `tests/bundle-secrecy.test.ts` skips itself when `.next` is absent, and a CI checkout is always
   clean, the answer-leak guard skipped on every CI run from the day it was written. It now runs.
   No environment variables are needed — the build does not read the Supabase keys.
10. ~~**`recommendedStartingMission("junior")` points at a mission in development.**~~ **Resolved.**
   All three onboarding suggestions — `event-loop-overload` (beginner), `promise-all-cascade`
   (junior) and `user-signup-latency-spike` (mid) — are fully authored and start without falling
   back. `tests/chapter-two.test.ts` pins all three, including that each suggestion's title matches
   the catalogue entry it names. The map is still a static literal rather than being derived from
   `recommendedMission()`; that remains an option, not a defect.
11. ~~**One known content warning** from the validator.~~ **Resolved.** `slow-api-incident`'s four
    missing stages were authored in the Chapter 3 pass, so the validator now reports **0 errors and
    0 warnings** across all 20 catalogued missions. (The earlier `user-signup-latency-spike` warning
    — a diagnosis evidence option, `no-errors-in-logs`, with no matching investigation evidence —
    had already been fixed by authoring the missing investigation item under the same id.)
12. **npm audit — measured properly on 2026-07-21, and the previous claim here was wrong.** This
    item used to say all 13 findings were "transitive, dev-only… nothing reaches the shipped
    bundle". They are not: `npm audit --omit=dev` reported **2 production findings (1 critical, 1
    moderate)** against `next@14.2.5` itself. **`next` was upgraded to 14.2.35** (an in-range patch;
    no code change was needed and all six gates stayed green), which clears the critical band —
    middleware authorization bypass, the cache-poisoning family, image-optimization content
    injection, request smuggling.
    What remained was unfixable in the 14.x line: the advisory range was
    `9.3.4-canary.0 – 16.3.0-canary.5`, so the fix was Next 16 — a major migration.

    **Done 2026-07-31. `npm audit --omit=dev` now reports 0 vulnerabilities.** By the time it was
    taken on it had grown to **2 high**, both in Next's own code rather than a transitive: SSRF via
    rewrites (`GHSA-p9j2-gv94-2wf4`) and unauthenticated disclosure of internal Server Function
    endpoints (`GHSA-955p-x3mx-jcvp`).

    **`next` 14.2.35 → 16.2.12, `react`/`react-dom` 18.3 → 19.2.** React 19 was not strictly
    required — `next@16` still peers `^18.2.0` — but the codebase had **zero** of the patterns React
    19 breaks: no `forwardRef`, `useFormState`, `defaultProps`, `propTypes`, `ReactDOM.render` or
    `element.ref` access, and no component tests to rewrite. Staying on 18 would have bought nothing
    and left the app on a combination Next will drop.

    What actually had to change, and nothing else did:

    - **`cookies()` is async since Next 15.** One call site, `lib/supabase/server.ts`, so
      `createClient()` became `async` and its three callers now await it. `currentUser()` was
      already async, so every route handler that only uses *it* is untouched.
    - **`params` is a `Promise`** in pages and `generateMetadata`. Six mission stage pages, three
      patterns each, all identical — transformed by a script that aborts without writing unless
      every pattern matches exactly once, rather than by twenty-four hand edits.
    - **`next lint` is gone.** `npm run lint` is now `eslint .`, and `eslint-config-next@16`
      requires ESLint 9, which reads flat config only: `.eslintrc.json` → `eslint.config.mjs`.
    - **`next build` rewrote `tsconfig.json` itself** — `"jsx": "preserve"` → `"react-jsx"`, plus
      `.next/dev/types/**/*.ts` in `include`, plus a reformat of every array. Next manages that file,
      so the rewrite was kept rather than reverted; expect it again on the next major. The two
      semantic changes are Next 16 requirements, not preferences.

    **Two transitives needed pinning, and npm's own advice was wrong.** `next@16.2.12` still bundles
    `postcss@8.4.31` and pulls `sharp@0.34.5`, both with high-severity advisories — and because npm
    attributes them to `next`, `npm audit fix --force` proposes **downgrading to `next@9.3.3`**,
    straight back into the advisories this upgrade closed. The `overrides` block in `package.json`
    pins `postcss@^8.5.25` and `sharp@^0.35.3` instead. `sharp` is only there for image
    optimisation, which this app never invokes — there is still no `next/image` import anywhere —
    but it is in the production tree, so it is pinned rather than argued away. **Re-check the
    overrides on every `next` bump and delete them once Next ships the patched versions itself.**

### Fixed 2026-07-22 — the stale verification verdict

**A real gameplay bug, reported from play.** A player submitted a wrong fix, got an unresolved
verification, went back to the Fix stage and applied the correct one — and Verification kept showing
the **old unresolved result**, with Continue to Results already unlocked. They were never asked to
run verification again, so the correct fix was never graded.

**Root cause, precisely.** Two independent gaps that combined:

1. **Changing a fix invalidated nothing downstream.** `FixWorkspace` passed `setFixId` straight to
   `FixOptionList.onSelect`, so selecting a different option wrote `…:fix` and nothing else. The
   `applied` flag stayed `true` from the previous option, and `…:grade`, `…:credit`,
   `…:verification` and `…:results` all still described the fix the player had just abandoned.
2. **A cached grade did not know what it graded.** It was stored as a bare `MissionGrade` — what the
   server decided, but not what it decided *about*. `VerificationWorkspace` restores "done" from a
   cached grade **plus** `…:verification.completed`, and with both still present from the previous
   attempt it restored the failed verdict as though it were current. Nothing could have detected the
   mismatch, because the grade carried no submission to compare against.

**The fix, in two layers**, because either alone would leave a hole:

- **Eager invalidation.** `clearVerdict(missionId)` in the new `lib/mission-storage.ts` removes
  `…:grade`, `…:credit`, `…:verification` and `…:results`. `FixWorkspace` calls it when the
  selection actually changes (and resets `applied`), and again on Apply; `DiagnosisWorkspace` calls
  it when the root cause or evidence changes, since those are graded too. Re-selecting the option
  already selected is not a change and does not discard a legitimately earned verdict.
- **A submission envelope.** The cache is now `{ missionId, rootCauseId, evidenceIds, fixId, grade }`,
  and `loadGrade()` returns the grade **only** when that submission still matches what the player
  has selected. Evidence is compared as a set, since re-ordering the same findings is not a
  different answer. This catches a cache that survived the clear — a second tab, a devtools edit, a
  future code path that forgets to call it — and it makes the Results screen safe by the same read:
  a mismatched verdict reads as ungraded rather than rendering a score from an abandoned fix.
  Caches written before the envelope existed have no submission to check and are discarded.

**What is deliberately *not* touched.** The server's `mission_runs` rows. A wrong attempt is a real
attempt: both runs stay in Postgres, `best_runs` keeps the better one, and `attempts` counts two.
This was only ever about what the browser may re-display. Run telemetry (`…:run`) is preserved too —
the clock spans the whole mission, and changing a fix is part of the mission, not a restart.

`lib/mission-storage.ts` is now the canonical home for every per-mission key; `lib/fix.ts`,
`lib/verification.ts`, `lib/results.ts`, `lib/diagnosis.ts` and — since 2026-07-28 — `lib/run.ts` and
`lib/investigation.ts` re-export theirs from it. It is deliberately import-free, so the Fix route can
invalidate the verification and results caches without pulling every mission's authored content into
its bundle.

Those last two mattered: `runStorageKey()` and `investigationStorageKey()` used to rebuild the
`coderaid:{id}:{slot}` string themselves, so the module that exists to name every slot in one place
did not in fact know about two of them. With all eight registered, the three sweeps below are
exhaustive **by construction** rather than by an author remembering to extend a list:

| Function | Clears | Keeps | Called by |
| --- | --- | --- | --- |
| `clearVerdict` | `grade`, `credit`, `verification`, `results` | the player's answers, `run` | Fix and Diagnosis, on a changed answer |
| `clearInvestigationOnward` | the above **+** `investigation`, `diagnosis`, `fix` | `run` — the clock spans the mission | the investigation's Restart action |
| `clearMissionWorkingState` | **all eight**, including `run` | nothing local; every `mission_runs` row | "Run It Again" on the results screen |

A test asserts that a fully played mission writes no `coderaid:{id}:` key outside that set, so a
stage that invents a new slot fails rather than quietly surviving all three sweeps.

Covered by `tests/stale-verdict.test.ts` (22 tests) and a Playwright regression that plays
`event-loop-overload`, submits `Promise.resolve()`, switches to the worker-thread fix and asserts
the lag metric moves 6.8s → 35ms with both runs recorded. All three were verified to fail against
the original code.
### Found in the decoration audit, 2026-07-22 — items 13–16 and 18 fixed 2026-07-22

A deliberate sweep for anything still ornamental now that grading, the ledger and the leaderboard
are real. One of the five was a live defect rather than debt. **All six are now closed** — items
13–16 and 18 on 2026-07-22, and item 17 on 2026-07-29. What remains of item 17 is the
display-name **moderation** question, which is a product decision rather than an unwritten feature.

Two more ornaments were found and fixed alongside item 17, because the profile pass touched the same
surfaces:

- **The landing page's preview was a mockup.** Three tabs (Code / Logs / Metrics) that did not
  switch, and a primary button with no handler styled exactly like the working CTA beside it in
  `HeroSection`. The tabs now switch and the CTA opens `user-signup-latency-spike`, the mission every
  line in the preview is quoted from. The content stays hand-authored rather than importing
  `lib/investigation.ts`: it is marketing copy that happens to be true, and pulling the live
  catalogue in would put a whole mission's content into the landing page's bundle to render eight
  lines of it. A preview of a product that does not do what the product does is a worse advert than a
  screenshot, because a screenshot does not invite the click.
- **The top bar's account menu could not be opened.** It was a `<button aria-label="Account menu">`
  with a chevron and no handler, on every page inside `DashboardShell` — the worst shape decoration
  can take, because the label announced a menu to a screen reader and the chevron promised a dropdown
  to everyone else. `AccountMenu` now opens Settings, Achievements and either Log out or Sign in,
  closing on outside `pointerdown` (not `click`, so the menu is gone before whatever is underneath
  reacts) and on Escape. The last item follows `useProgress().authenticated`, which is true exactly
  when the ledger came from the server.

13. ~~**"Log out" does not log out.**~~ **Fixed.** `DashboardSidebar` rendered it as
    `<Link href="/">`, which navigated to the landing page and **left the session intact** —
    returning to `/dashboard` was still signed in. The page *looked* signed out, because the
    dashboard redirects client-side, while the cookie and every endpoint it opened stayed live. On
    a shared machine the next person inherited the account.

    It is now a `<form action="/auth/sign-out" method="post">` wrapping a submit button, reaching
    the POST-only route that had been written and never wired up. A plain HTML form rather than a
    `fetch`: the route answers 303 to `/`, and a full navigation is what should happen when a
    session ends — every provider holding ledger state is torn down with it.

    Two Playwright specs cover it (§15.5), and the assertion is deliberately not "the UI changed"
    but "the server stops answering": after logging out, `/api/ledger` and `/api/leaderboard` both
    401. The second spec pins the other half of the design — a `GET` to `/auth/sign-out` returns
    405 **and the session survives** — so a later hand adding `GET` to "make the link work" cannot
    silently reintroduce the `<img>`-tag logout the route's comment warns about. Both were proven
    to fail: with `signOut()` removed from the route, the ledger assertion goes red on 200.

14. ~~**The Premium block advertises a product that does not exist.**~~ **Deleted.** `PREMIUM` is
    gone from `lib/dashboard.ts` and the block from the sidebar. It was a `<button type="button">`
    with no handler promising "premium Node.js incidents, exclusive rewards and advanced
    analytics", none of which exist or can be bought — and it was the most prominent element in the
    sidebar. Same reasoning as the theme toggle, `defaultLanguage`, `soundEffects` and the three
    fake leaderboard scopes (§4.11).

15. ~~**The footer's legal links are not legal links.**~~ **Removed.** Privacy Policy and Terms of
    Service pointed at `/demo`, a `PlaceholderPage` reading "Watch the demo"; GitHub, Twitter and
    Discord pointed there too. All five are deleted rather than written: this one acquired real
    weight once accounts and a database existed, because a Terms link that is not terms implies an
    agreement that does not exist. Writing the real copy is not an engineering decision, so the
    links come back when the pages do. Every remaining footer link now goes somewhere real.

16. ~~**The dashboard sparkline is a hardcoded squiggle.**~~ **Derived.** `RESPONSE_SERIES` — 21
    points its own comment called a "noisy, elevated latency series" — is deleted. The Next Action
    card now projects **that mission's own authored `metrics.latency.series`** through
    `sparklinePoints()`, so the shape and the headline metric beside it describe one incident. It
    was previously byte-identical across all fourteen missions while sitting next to fourteen
    different derived numbers.

    The series is normalised to its own min/max, because these are latency samples in whatever unit
    the mission authored and only the shape is comparable. A flat series draws through the middle
    instead of dividing by a zero range; a series too short to draw returns `null` and the chart is
    omitted rather than rendering an empty frame beside a real number. Nine tests in
    `tests/dashboard.test.ts` cover it, including one that fails if any two playable missions ever
    share a sparkline again — the precise defect being removed.

    **A trap worth recording:** `SPARK_WIDTH` / `SPARK_HEIGHT` must be declared *above*
    `NEXT_ACTION`. That const is evaluated at module load and reaches them during initialisation,
    so declaring them below it compiles fine and then throws `Cannot access 'b' before
    initialization` at prerender time, on pages that never mention the dashboard. The first attempt
    did exactly this and `npm run build` caught it.

17. ~~**The profile never reaches the server.**~~ **Closed 2026-07-29.** `players` carries
    `display_name`, `avatar_id`, `slogan`, `path_id`, `experience_id` and `onboarding_completed`,
    and `0001_init.sql` grants `UPDATE` on exactly those six columns to `authenticated` — the one
    thing a player is allowed to write. **Nothing ever wrote any of them.** Settings and onboarding
    persisted to `coderaid:profile` in `localStorage`, while the leaderboard rendered the
    GitHub-derived `display_name` written once by the `handle_new_user` trigger, so changing your
    name in Settings left everyone else seeing the old one. The schema and the grant were built for
    this and the client was never connected.

    **What was built.** `POST /api/profile` (`app/api/profile/route.ts`) with `lib/server/profile.ts`
    parsing the update and `lib/profile-client.ts` holding the wire shape both halves import.
    `ProfileSection` and `OnboardingWizard` call `saveProfile()`; `StartExperience` carries the
    completion through. The read path closes the loop: `playerRecord()` returns the profile with the
    claim flag, `/api/ledger` carries it on both verbs, and `ProgressProvider` layers it over the
    local draft **field by field** — a column never written is null, and a null slogan keeps the
    local one rather than blanking it. So a device that has never seen this player's `localStorage`
    now shows their real name instead of "Operative".

    **This is the only route that runs as the signed-in user rather than as service-role**, and the
    reasoning is §16.7. In short: the column grant means Postgres refuses `claimed_at` and every
    scored table *even if this handler is wrong*, which is not true of the admin client.

    `tests/profile.test.ts` covers the parser and the client contract. Note it and
    `lib/server/profile.ts` both write invisible code points as **numeric ranges, never literals** —
    an escaped character class is a line nobody can proofread, and a literal one silently loses its
    contents to the next tool that touches the file.

    **Still open, and deliberately: display-name moderation.** `sanitizeDisplayName` is a *rendering*
    guard. It strips C0/C1 controls (newline and tab break the leaderboard row), zero-width
    characters and joiners (two different names can otherwise render identically, so anyone can
    appear to be anyone), and bidi overrides and isolates (which reorder the text *around* them, so
    one player's name can visually rewrite the column beside it) — then normalises whitespace and
    truncates. Everything else survives, including the whole of Unicode's letters: a name in
    Armenian, Japanese or emoji is a real name. There is **no word list and no review queue**, and
    adding half of one would read as protection that is not there. Whether CodeRaid needs
    moderation, and of what kind, is a product decision with a person attached to it.

18. ~~**80 dead `done` flags in the catalogue.**~~ **Deleted — and they were not dead.** The audit
    recorded these as harmless on the grounds that `MissionObjectives` takes `steps: string[]` and
    never reads them. That is true of the *briefing* path, and it is not the only consumer:
    **`components/missions/MissionBrowser.tsx` read `o.done` directly**, rendering a violet
    checkmark and brighter text for a completed objective. Six of the eighty were authored
    `done: true`, across `user-signup-latency-spike` (2), `jwt-session-expiry`,
    `health-check-flapping`, `graceful-shutdown-bug` and `rate-limiter-race` — so a player who had
    never opened those missions saw objectives already ticked off in the mission browser. It was a
    visible false claim about their progress, not latent debt.

    `Objective` is now `{ text: string }`; all 80 literals are stripped and the browser renders the
    list uniformly as "what you will do". Nothing tracks objective-level completion anywhere — the
    ledger records finished *runs* — so if it is ever wanted it must be derived from a run.

    Two guards, at different layers: the type no longer permits the field, and `validate:missions`
    fails a catalogue that reintroduces it, which catches a literal slipping past an `as`-cast or a
    hand-edited catalogue (§15.2). The validator rule was proven to fail by re-adding
    `done: true` to one objective and watching it go red.

    **Deliberately not on this list:** `DAILY_RAID`. It carries no XP figure and no route and says
    outright that daily challenges "aren't playable yet" — it advertises an idea and admits it,
    which is the honest version of the same situation.

### Found 2026-07-29 — open

19. **`POST /api/runs` is an enumerable answer oracle.** **Narrowed 2026-07-29, not closed** — see
    the end of this item for exactly what remains. §16.3 argues that grading at the commit
    point avoids one, and that argument is only half right. It is true that there is no endpoint
    which answers "does fix X resolve?" *without recording anything* — but recording turns out not to
    be a cost. Three properties combine:

    - **No server-side stage gating.** `StageGate` is client-side (§11), so a submission is accepted
      regardless of whether the player ever opened the investigation.
    - **No rate limit.** Nothing bounds how many submissions a player may make, per mission or at all.
    - **Best-run-wins makes a wrong guess free.** A worse replay is recorded and changes nothing, so
      the only price of a wrong answer is a row in `mission_runs`.

    And the response carries the full breakdown — root cause 45, evidence 25, fix 30 — so each
    attempt says *which part* was right. A caller can therefore separate the three answers rather
    than searching their product, and arrive at a perfect score by enumeration.

    **Implemented 2026-07-29: the component breakdown is disclosed only when a run improves on the
    player's best.** `lib/server/grade-disclosure.ts` holds the policy, `POST /api/runs` applies it
    to the response only — the run is still graded and recorded in full, so the ledger, achievements
    and `best_runs` are untouched. The decision costs no extra round trip: the route already reads
    the ledger before the insert to measure `creditBetween`, and "did this beat their best" is the
    same question.

    `MissionGrade` is now split into an always-present half (score, `resolved`, telemetry, XP) and a
    `detailed` half (`rootCauseCorrect`, `fixCorrect`, the evidence counts, `breakdown`). Withheld
    fields are **absent, never falsified** — `rootCauseCorrect: false` would answer the enumerator's
    question exactly as well as `true` does, and it would also be a false statement about the
    player's answer. An explicit `detailed: boolean` rides along so the results screen can say *why*
    the working is missing rather than rendering an empty panel, and so a serialisation bug cannot
    masquerade as policy. Strictly-greater, so resubmitting your own best answer buys nothing back.

    **What this does NOT do, stated plainly so the next reader does not over-trust it:**

    - **`resolved` is always disclosed**, because `resolveVerification()` renders the entire
      verification report from it. So the *fix* answer still leaks one bit per attempt and can be
      found in one attempt per candidate. That is inherent — telling a player whether their fix
      worked is the game, not a defect.
    - **The score is partly decomposable arithmetic.** The weights are public (45/25/30, −5 per
      hint) and the player knows their own hint count, so some scores identify their components
      uniquely: a 30 can only be a correct fix and nothing else.

    So the change removes the *separable* root-cause and evidence signal — the part that collapses
    the search from a product to a sum — and leaves the rest. **The real closure is a rate limit**,
    which `mission_runs` already holds the data for.

    **The rate limit landed 2026-07-30 (`lib/replay-limit.ts`).** The policy decision was taken
    explicitly: **8 graded attempts per mission per rolling hour, per mission rather than per
    account, and over the limit the run is recorded but nothing is disclosed.**

    - **8 per hour** is set against real replay, not against the attacker. A mission takes 10–15
      minutes to play honestly and the heaviest legitimate pattern — wrong fix, re-read the logs, try
      again — is three or four runs. Eight leaves that room twice over.
    - **Per mission**, because an account-wide cap would punish the player working through several
      incidents in an evening while barely slowing an enumerator, who only ever hammers one mission.
    - **Recorded, not rejected.** A 429 would lose the row, and the row is what makes the limit
      self-enforcing on the next attempt; it would also tell the caller exactly where the boundary
      is. So the insert happens, achievements are still stamped — a server-side write discloses
      nothing, and a player who crossed a threshold on their ninth replay still crossed it — and the
      response carries `{ limited }` and no `grade`. **`ledger` and `credit` are withheld with it**,
      because `ledger.missions[missionId]` names the best run's `resolved` and `score`; returning it
      would disclose by the back door exactly what the withheld grade protects.
    - **The verification screen has a state for it**, and it is not an error: *"Run recorded — that's
      9 on this incident within the hour. The verification report is held until in 43 minutes."* It
      says the score still counts and the best run still stands, because both are true. Falling
      through instead would have re-shown the *previous* verdict as though it were this run's, which
      is the stale-verdict bug fixed on 2026-07-22.
    - Counted on **`completed_at`**, the database's own `now()` — never `completed_on`, which is the
      player's local date and therefore attacker-controlled.

    **What the limit does not do, so the next reader does not over-trust it either.** A player can
    always read their own progress: `GET /api/ledger` returns their best run per mission, including
    its score and whether it resolved, because that is their own earned result and the dashboard is
    built from it. So the limit bounds how *fast* an enumerator learns, not what a determined one can
    eventually learn — it is a cost control, not an information barrier. An answer space that fell in
    ~17 attempts now takes hours, under the attacker's own player id, and that is the honest claim.
    **This item is therefore still "narrowed", not "closed"** — but the *open work* on it is done, and
    what remains is a property of letting players see their own results.

    Guarded at both layers, both proven to fail. `tests/replay-limit.test.ts` (13 tests) pins the
    policy — the rolling window, the retry time coming from the *oldest* counted attempt, malformed
    timestamps, and the two constants themselves, because those two numbers *are* the product
    decision. Two specs in `e2e/authenticated.spec.ts` assert what crosses the wire: that the first
    eight attempts are answered normally, that the ninth carries no `grade`, `ledger` or `credit`, and
    that all nine rows are in `mission_runs` afterwards.

    Guarded at two layers, both proven to fail. `tests/grade-disclosure.test.ts` (10 tests) pins the
    policy and goes red when the redaction is removed; a spec in `e2e/authenticated.spec.ts` asserts
    what actually crosses the wire — a UI assertion would pass equally against a server that sent the
    answer and a client that declined to render it. `runVerification()` now returns the parsed
    response body for exactly that reason.

20. **`best_runs` bypassed RLS and served the answer key to the open internet.** Found and fixed
    2026-07-29 — the most serious defect found on this project so far.

    **The mechanism.** A Postgres view does not enforce the RLS of the tables underneath it. Unless
    the view is declared `security_invoker`, its queries run as the view's **owner** — here, the
    superuser that ran `0001_init.sql` — so every policy on `mission_runs` was bypassed. Supabase
    then grants `SELECT` on new public relations to `anon` and `authenticated` by default, which
    made the bypass reachable with the anon key **that ships in the client bundle**. Nothing was
    misconfigured in the sense of a wrong line; the view was simply created the ordinary way, and
    the ordinary way is open.

    **Measured, with the anon key and no session at all:**

    ```
    GET /rest/v1/mission_runs -> []          RLS holds
    GET /rest/v1/players      -> []          RLS holds
    GET /rest/v1/best_runs    -> every row   RLS bypassed
    ```

    **What that exposed.** `best_runs` is `mission_runs.*` plus an attempts count, so every row
    carried `root_cause_id`, `evidence_ids` and `fix_id` — **the answer key** — for every mission any
    player had completed, alongside their scores, telemetry and completion dates. This is precisely
    what `lib/server/answers.ts` puts behind `server-only` and what `tests/bundle-secrecy.test.ts`
    greps the real build to keep out. Both were guarding the front door while the database API held
    the back one open. It also contradicted the privacy boundary `app/api/leaderboard/route.ts`
    documents — that the rows name other people and therefore require a session.

    **It leaked to `authenticated` too, not only to `anon`.** Checked with a real minted session:
    `mission_runs` returned 0 rows while `best_runs` returned every row in the table. A fix that
    revoked only `anon` would have left any account able to read the answer key, which is why the
    revoke names both roles. This is the kind of thing that is only ever found by running it.

    **The fix** (`supabase/migrations/0003_lock_best_runs.sql`) is two statements, and both are
    load-bearing for different failure modes:

    ```sql
    alter view public.best_runs set (security_invoker = true);
    revoke all on public.best_runs from anon, authenticated;
    ```

    `security_invoker` makes the view return the right *rows*; the revoke makes it unqueryable by
    either role at all. Two guards rather than one because **`create or replace view` silently drops
    the `security_invoker` setting** — a future migration that rewrites the view loses half the fix
    without saying so, and the revoke is what still stands.

    **Measured again after applying it**, same two callers:

    ```
    anon key, no session:   GET /rest/v1/best_runs -> 401  42501 permission denied for view best_runs
    real signed-in session: GET /rest/v1/best_runs -> 403  42501 permission denied for view best_runs
                            GET /rest/v1/mission_runs -> 200 []   (unchanged, RLS as before)
    ```

    **`service_role` has `bypassrls` and is unaffected**, so `ledgerFor()` and `standings()` keep
    working — verified rather than assumed. All **30 Playwright specs pass** after the migration,
    including `ranks the player on the leaderboard without leaking anything`, which is `standings()`
    reading this very view through the admin client. That spec is the one that would have caught an
    over-broad revoke, and it is why "revoke and re-run the leaderboard spec" is the order to do this
    in rather than the reverse.

    **The alarm** is `e2e/view-privileges.spec.ts` (§15.6), and it was proven to fail by the
    vulnerability itself rather than by a mutation. **The house rule** — every view over an
    RLS-protected table sets `security_invoker = true` and grants nothing to `anon` or
    `authenticated` — is written into the RLS comment block of `0001_init.sql`, where the next
    person adding a view will be looking.

### Found 2026-07-31 — fixed, and dated

21. **The schema never granted a privilege to `service_role` or `authenticated`, and was relying on
    a Supabase default that is being removed.** Found while building the CI stack (item 2), which is
    the only reason it was found at all: it is invisible on the live project.

    Every table privilege the app uses came from Supabase's **old cloud default**, which auto-granted
    each new `public` table to `anon`, `authenticated` and `service_role`. Nothing in `0001`–`0004`
    grants anything to those roles except the column-level `UPDATE` on the six profile columns. The
    default is gone for new projects, and `supabase/config.toml` carries the deadline in its own
    comment on `auto_expose_new_tables`: *"When unset, new entities are NOT auto-exposed, matching
    the new cloud default … the field is removed on **2026-10-30** once the always-revoked behaviour
    is permanent."*

    **Measured the same day, same migrations, two environments:**

    | Read | Hosted project (old default) | Fresh local stack (new default) |
    | --- | --- | --- |
    | `mission_runs` as `anon` | `200 []` | `401 42501` |
    | `players` as **`service_role`** | rows | **`401 permission denied`** |

    The second row is the serious one. `service_role` is the **only writer of anything scored**
    (§16.2), so on a project created today the app does not run at all — no ledger, no grading, no
    leaderboard. Which means a fresh Supabase project for CI would not have worked either, and the
    live project breaks on the day the old behaviour is withdrawn.

    **`0005_explicit_grants.sql` declares the dependency.** It grants exactly what the app uses and
    nothing more — narrower than the blanket default it replaces — and **re-asserts the `best_runs`
    revoke last**, because a grants file is precisely the file someone later "tidies up" into
    `grant … on all tables in schema public` and silently reopens item 20.

    **It is additive and changed nothing in production**: it grants what the old default already
    gave and revokes nothing that was not already revoked. All 37 Playwright specs pass against the
    hosted project after it, and all 37 against a local stack built from scratch — which is the
    point, since before it the local stack could only reach 36.

    One honest limitation, stated because it affects how you verify this: **`0005` has no externally
    observable signature on the hosted project.** Unlike 0004, which added a column you can read
    back, it is additive over an already-permissive baseline, so "is it applied?" cannot be answered
    from outside the way `players.reset_at` can. What *can* be checked is that a fresh stack works,
    and CI now checks that on every run.

22. **The smoke job's key export could not fail, so its green tick did not mean the specs ran.**
    Found by reading `ci.yml` after its first real run (#21) came back green — the run the previous
    pass correctly flagged as unverified, since pushing is the only way to exercise a workflow.

    The export ended `| tr -d '"' >> "$GITHUB_ENV"`. Actions runs `bash -e {0}` **without**
    `pipefail`, so the step's exit status was `tr`'s, and `tr` succeeds on empty input. A `grep` that
    matched nothing — a renamed variable in a future `supabase status`, say — exported nothing and
    passed. `hasCredentials()` then skipped the twenty authenticated specs, and the job was green.
    Confirmed by running the old pipeline against stack output under different names: **exit 0, zero
    bytes written.**

    This is the third instance of the same failure in this repo (bundle-secrecy, the reset claim
    spec, this), and the sharpest, because the pass that wrote it was *explicitly hunting* this exact
    pattern — its own comment says "a skipped run is the same colour as a passing one, and that is no
    longer a way this suite can go quiet." It was, and the guard it added to close it had the flaw
    inside it. **The lesson is not "remember pipefail"; it is that a step's exit code is evidence
    about the step, never about its effect.** Assert the effect.

    Fixed at both ends — `set -euo pipefail` plus a `$GITHUB_ENV` readback in the workflow, and
    `credentialsMissing()` throwing whenever `CI` is set, so a skip in CI is a hard error regardless
    of why the keys are missing. Both proven to fail before being trusted. See §15.4.

    **A third guard was added 2026-07-31 alongside the Next 16 migration**, because the first two
    both reason about *credentials* and the claim being made is about *specs*.
    `scripts/assert-e2e-ran.mjs` reads the Playwright JSON report and fails the job if any spec
    skipped, if fewer than 37 ran, or if any failed. It is the only one of the three that notices a
    spec file quietly falling out of collection, which no credential check would ever see. Proven
    against fixtures: a 17-ran/20-skipped report fails, a 30-ran report fails, a missing report
    fails, and the shape was confirmed by generating a real report under `CI=1` rather than assumed.

23. **`react-hooks/set-state-in-effect` is demoted to a warning — 14 sites, deliberately deferred.**
    Arrived with `eslint-plugin-react-hooks` v6 in `eslint-config-next@16`, so it came with the
    framework rather than with any change to this code, and it fires 14 times across 13 files.

    Every one is the same shape: read `localStorage` (or fetch the ledger) on mount, then subscribe
    to changes. Server rendering cannot read `localStorage`, which is *why* they hydrate in an
    effect. The rule is right that this cascades renders, and the idiomatic replacement is
    `useSyncExternalStore`.

    It was not done in this pass on purpose. That refactor rewrites the client hydration path —
    `ProgressProvider` among them, which is the entire pre-account ledger — and **there are no
    component tests to catch a regression** (§12 item 2). Changing the state model and the framework
    in one pass, with nothing watching, is how a migration becomes an outage. A warning keeps it
    visible and countable without wiring `lint` to fail on pre-existing code. **Raise it back to
    `error` in the pass that fixes it**, and do component tests first.

    Sites: `DashboardGreeting`, `LeaderboardFilterPanel`, `StageGate`, `DiagnosisWorkspace`,
    `FixWorkspace`, `InvestigationWorkspace`, `useMissionResume`, `ResultsWorkspace` (×2),
    `VerificationWorkspace`, `StartExperience`, `ProgressProvider`, `ProfileSection`, `useSettings`.

---

## 13. The gap between here and a real product

Items 2 and 3 of the previous list — the grading engine and a real progression model — are **done**
(§14). What remains, ordered roughly by how much each unblocks everything else:

1. **Content scale.** The Node.js MVP catalogue is finished — **all 14 missions** have investigation
   / diagnosis / fix / verification / results content, so there are now **fourteen** worked
   references spanning Easy to Hard, and `hasFullContent()` still makes authoring the single act
   that ships a mission. The remaining scale problem has moved from *finishing the MVP* to *growing
   past it*: at 1,830 total XP the catalogue cannot reach the Backend Engineer rank (10,000 XP) or
   the Event Loop skill achievement (level 7 in a skill with one mission behind it). See §14 for the
   audit; the recommendation is more missions, not lower thresholds.
   Everything scales with content automatically: a new mission's `correct*` fields are graded, its
   `rewardSkillId` credits a real skill, and its completion moves the player, the leaderboard and
   the achievements without another line of wiring. **The validator half of this item is now done**
   (§15.2) — an authoring format (MDX/JSON/CMS) is still the open half, and the validator's rules
   are the schema it would need to satisfy.
2. **Backend + auth.** The ledger is honest but local and trivially editable from devtools:
   persistence beyond one browser, real leaderboards and server-authoritative progress all need it.
   The storage contract in §9 is the migration surface, and it maps cleanly — `Ledger` is already
   the shape a `players` row wants to be, and `MissionRecord` is already an append-only run log.
3. **Quality gates — ~~install ESLint, wire a test runner~~ ~~wire CI~~ done (§15).**
   `.github/workflows/ci.yml` runs `typecheck → lint → test → validate:missions → build` on pushes
   to `main` and pull requests targeting it (§15.4). What remains is component or browser coverage
   over the rules the Node-level suite already pins.
4. **Difficulty and pacing.** Now that scores are real, they can be tuned: the 45/25/30 weighting,
   the 5-point hint penalty, the XP curve and the 40-XP skill level are all first guesses,
   calibrated against a 14-mission catalogue and ten playable missions. Real play data should move
   them. The tests pin the *current* numbers, so a deliberate retune is a visible, reviewable diff
   rather than a silent drift.
5. **Ship the future tracks deliberately.** Databases and caching/distributed systems are already
   modelled end to end (`chapterTrack`, `FUTURE_CHAPTERS`, `FUTURE_TRACKS`, `FUTURE_SKILL_TRACKS`,
   `coming-soon` availability). Promoting a chapter is a `track` flip plus content — but only after
   the Node.js MVP is genuinely playable.
6. **Unlocking.** `locked` exists in `MissionStatus` and is currently unused. With real completion
   data and ten playable missions, gating a mission behind its predecessors is now both a small
   change and a defensible one — it was deliberately not made in this pass, because the ordering
   already works without it. `nextMissionId()` walks the catalogue index, which produces exactly the
   intended Chapter 1 → Chapter 2 sequence, and a test asserts the full walk.
7. **Polish.** Sign-in flow, error/loading states, and a real Daily Challenge (the card
   is honest about being unbuilt, but it is still a card advertising something that doesn't exist).

---

## 14. The progression and grading model

The organising rule: **the catalogue describes missions, the ledger describes the player, and
nothing authored is allowed to claim a player did something.** Where those used to be mixed —
`DEMO_PLAYER`, authored skill levels, `status: "completed"` on missions, a hardcoded leaderboard
row — the authored half was removed and the player half moved to the ledger.

### 14.1 The ledger — `lib/progress.ts` (shape + maths) · `lib/server/ledger.ts` (derivation)

`Ledger` is the single source of truth for earned progress. **Since step D it is derived in
Postgres**, but `lib/progress.ts` still owns the *shape* and all the pure arithmetic below, which is
what keeps the formulas testable in Node and unchanged for every consumer.

`EMPTY_LEDGER` is a *valid* ledger — a brand-new player — which is what keeps the app
server-renderable: the server renders the zero state and the client re-renders once the real one
arrives. Every consumer takes a `Ledger` (or a `PlayerView`) argument and defaults to the empty one.

| Derived value | From |
| --- | --- |
| `levelFromXp(xp)` / `xpForLevel(L)` | `xpForLevel(L) = 50·L·(L−1)`. L2 = 100, L5 = 1,000, L10 = 4,500. Clearing all 14 Node.js missions perfectly is 1,830 XP → **level 6**. |
| `rankBand(xp)` | `CAREER_RANKS.minXp`, unchanged thresholds. |
| `streakDays(ledger)` | Consecutive `activeDays` ending today *or* yesterday. Opening the app marks today active. |
| `skillLevelFromXp(xp)` | 40 XP per level, capped at 10. |
| `bestScore` / `successRate` / `xpSince` / `missionsSince` | The mission records. |

**Best-run-wins is now a query, not a mutation.** The `best_runs` view selects the highest-scoring
run per player per mission (ties breaking toward the earlier run, so a later equal score cannot
restamp the achievement dates derived from it), and the ledger sums those. A replay that scores
lower changes nothing because it simply isn't the row the view returns — the property falls out of
the schema instead of being enforced by client code. `creditRun()` still exists in
`lib/progress.ts` and is still tested, but the app no longer calls it.

`creditBetween(before, after, missionId)` replaced it at the call site: the server reads the ledger
either side of the insert and **measures** what the run added. That is how the results screen can
truthfully show "+0 XP" on a worse replay without knowing the rule that made it zero.

### 14.2 The grading engine — `lib/grading.ts`

| Component | Weight | Measured against |
| --- | --- | --- |
| Root cause | 45 | `answers.rootCauseId` |
| Supporting evidence | 25 | Balanced F-score vs `answers.evidenceIds` — recall *and* precision, so padding the case costs marks |
| Fix applied | 30 | `answers.fixId`, and that the fix was actually applied |
| Hints | −5 each | `run.hintsUsed` |

**`answers` is a parameter, not something this module knows.** `MissionAnswers` is *defined* here —
in the module that uses it — so `lib/server/answers.ts` depends on the public contract rather than
the other way round, and no client module ever needs to reach into the server module even for a
type. The old per-option `resolvesRootCause` flag is gone: a fix resolves exactly when it is the one
`answers.fixId` names, and the flag was a second copy of that fact (all 79 of them agreed with
`correctFixId`, which is how we knew they were redundant).

`resolved` is true only when the applied fix resolves the root cause. `xpEarned` is
`mission.xp × score / 100`. Skill XP goes to the mission's `rewardSkillId` at full rate and to
every other skill listing the mission at 40%.

The results screen shows the working (`ScoreBreakdown`), reports the real elapsed time and stage
count, and switches its narrative, its "what you fixed" panel and its impact panel between the
resolved and unresolved cases. An unresolved run gets a "Run It Again" action.

### 14.3 The provider — `components/progress/ProgressProvider.tsx`

Mounted in the root layout. On mount it POSTs `/api/ledger` with the player's **local** date —
opening the app is activity, and a streak is counted in local days — and adopts the ledger that
comes back. It exposes
`{ ledger, view, player, avatar, slogan, hydrated, source, authenticated, claimable, adopt, refresh }`
via `useProgress()`.

Two sources, and which one is in use is itself exposed:

- **signed in** → `source: "server"`, authoritative.
- **signed out (or the server is unreachable)** → `source: "local"`, the pre-migration
  `localStorage` ledger, **read-only**. Nothing writes it, so it can never diverge into a second set
  of earned numbers. It exists so a player who earned progress before accounts existed still sees it
  and can claim it, rather than being shown a zero that reads as a reset.

**`update()` is gone**, replaced by `adopt(ledger)` — which only accepts a ledger the *server*
returned. There is deliberately no way to hand the provider one the client computed. Called outside
a provider `useProgress()` returns the zero state, so no component can crash on it.

### 14.4 What this closed

Wrong diagnosis + wrong fix used to yield the same passing verification and the same 92/100 as a
perfect run. It now scores 0, resolves nothing, awards no XP, fails the verification checks that
depend on the fix, and unlocks no achievement. That single change is what makes the rest of the
product's claims — interview preparation, "not another coding quiz" — true rather than aspirational.

### 14.5 What the finished catalogue actually makes reachable (audited 2026-07-20)

With all 14 missions playable it is now worth stating precisely what a perfect clear of the whole
MVP earns, because several thresholds were calibrated when the catalogue was smaller. Every figure
below is derived, and pinned by `tests/chapter-three.test.ts` — **nothing here was changed to make a
threshold reachable.**

| Quantity | Value | Derived from |
| --- | --- | --- |
| Maximum mission XP | **1,830** | `Σ NODE_MISSIONS.xp` at score 100 |
| Maximum player level | **6** | `levelFromXp(1830)`, curve `50·L·(L−1)` |
| Career ranks reachable | **Node.js Explorer, Backend Apprentice** | `CAREER_RANKS.minXp` ≤ 1,830 |
| Career ranks unreachable | Node.js Developer (3,000), Backend Engineer (10,000), Production Debugger (25,000), Node.js Specialist (50,000) | same |
| Skills at the level-10 cap | **8+** — `error-handling`, `nodejs-runtime`, `api-design`, `request-performance`, `background-jobs`, `metrics-analysis`, `root-cause-analysis`, `performance-debugging` | primary 100% + supporting 40% shares |
| Skills with no missions | `streams`, `validation` (0 XP, level 0) | `SKILL_DEFS.missionIds` empty |

**Achievements attainable from content (8 of 12):** `first-mission`, `ten-missions` (14 resolvable
missions now exist), `chapter-one-cleared`, `debugging-specialist` (Root-Cause Analysis reaches the
cap), `async-expert` (Async JavaScript reaches level 8, helped by `slow-api-incident` joining it),
`perfect-diagnosis`, `zero-hints-used`, and `production-incident-master` (all 14 missions resolve to
a severity above `low`).

**Achievements not attainable, and why:**

- `backend-engineer-rank` — target is `rankMinXp("Backend Engineer")` = **10,000 XP** against a
  1,830 XP catalogue. This is a content gap: roughly five times the current mission count closes it.
- `event-loop-master` — needs Event Loop at level 7 (280 skill XP), but `event-loop` is the primary
  reward of exactly one 80 XP mission and appears in no other mission's supporting set.
- `seven-day-streak`, `thirty-day-streak` — time-gated by design, reachable by any player who
  returns; not a content question at all.

**Recommendation (not applied):** leave every threshold where it is. Lowering
`CAREER_RANKS.minXp` or `ADVANCED_LEVEL` would make the ladder describe the catalogue rather than
the skill, and both gaps close naturally as chapters 4 and 5 are written. The cheap partial fix for
`event-loop-master` is to add `event-loop` to the supporting skills of the missions that genuinely
exercise it — that is a content edit in `lib/skills.ts`, not a threshold change.

---

## 15. Quality gates (added 2026-07-20)

The organising rule for this pass: **the things that were previously verified by hand — "does it
compile", "is the content coherent", "does a wrong run actually score badly" — are now verified by a
command.** All **six** gates in §2 run non-interactively and were run to produce the results recorded
there: `typecheck`, `lint`, `validate:missions`, `build`, `test`, and `npx playwright test`.

The rule has a limit worth stating plainly, because the Supabase migration moved the important
logic across it: **a gate can only check what it can reach without a session.** Grading, the ledger,
the claim and the leaderboard are all behind authentication, so none of them is covered by the six.
They were verified against the live database by hand (§16.6). Closing that gap — §12 item 2 — is
what would make this section's claim true again rather than mostly true.

### 15.1 The test suite — `tests/`, Vitest, 669 tests across 27 files

Node environment, no DOM, no component testing library. `vitest.config.ts` re-declares the `@/*`
alias so tests import modules exactly the way the app does, **and aliases `server-only` to
`tests/stubs/server-only.ts`** so the server modules can be imported and tested in Node. Anything
needing `localStorage` supplies an in-memory `Storage` (either injected, as `loadLedger(storage)`
and `resetMissionProgress(storage)` already allow, or via a `globalThis.window` shim in the flow
tests).

Nothing in the suite talks to Supabase. The pure rules that decide what crosses the trust boundary
are tested directly; the round trip itself was verified by hand (§16.6) and is the debt in §12
item 2.

**One file goes one level up, and it is worth knowing which.** `ledger-derivation.test.ts` mocks
`@/lib/supabase/admin` and drives `ledgerFor()` against arrays, because the reset tombstone is the
one rule that is not wholly pure: `lib/reset.ts` decides what a date *means*, but
`lib/server/ledger.ts` decides which columns that decision is *applied to*, and no test of the first
catches a change to the second. The stand-in models migration 0004's filter rather than running it,
so a green there is **not** evidence that the real view filters — that is `e2e/authenticated.spec.ts`
against the real database, and it is the only place it can be. The file says so in a comment, because
a reader who mistakes the model for the thing would over-trust it exactly where it matters.

| File | Covers |
| --- | --- |
| `grading.test.ts` | Correct/wrong diagnosis, partial and padded evidence, correct fix under a wrong diagnosis, wrong fix, unapplied fix, one and many hints, abandoned runs, score clamped to 0–100 across six combinations, XP derived from `mission.xp × score`, `resolved` only when the applied fix resolves, skill reward shares, `scoreBand` |
| `progress.test.ts` | Empty ledger, `xpForLevel`/`levelFromXp` inverted at **every** threshold 1–20, level progress, rank bands incl. top rank, skill levels and caps, first credit, idempotent re-credit, better replay adding only the difference, skill-XP top-up, worse replay never regressing, `totalXp` recomputed from records, legacy/corrupt/malformed ledgers resetting safely, streak behaviour across four cases, period XP and success rate, achievement stamping, reset preserving profile + settings |
| `availability.test.ts` | `hasFullContent` true/false, `PLAYABLE_MISSION_IDS` derived, available → current → completed from the ledger, future track always coming-soon, **every authored status is a content state**, a mission lying about being available still degrades, recommendation and `nextMissionId` never returning incomplete content, progress counting, chapter states |
| `verification.test.ts` | Both branches of `resolveVerification`, dependent vs independent checks, purity (the authored config is never mutated), and — across *every* playable mission — that a failed run fails at least one check and that exactly one fix option resolves |
| `skills.test.ts` | Zero start, primary vs supporting reward shares, unrelated skills uncredited, derived levels after crediting, unique ids, valid categories, mission back-references, `skillsToImprove` only suggesting actionable skills, category averages |
| `achievements.test.ts` | Nothing unlocked at zero, resolved-only counting, completed-but-unresolved, hint-free from real telemetry, skill-level achievements, `perfect-diagnosis` at exactly 100, timestamps stamped once and never moved, ordering, idempotent re-derivation |
| `leaderboards.test.ts` | **Rewritten for real standings.** Ranking by the selected period, gapless ranks, deterministic tie-breaks (incidents then name, stable when the input order flips), period figures rather than all-time, podium/table split, filters narrowing the table **without renumbering ranks**, the similar-level band, percentile measured against the real population and floored at 1, empty-board cases — plus a guard that the fictional roster, `TOTAL_PLAYERS`, `HOME_COUNTRY`, `HOME_COMPANY` and `currentPlayerEntry` cannot come back |
| `ledger-derivation.test.ts` | **New.** `creditBetween` for a first completion, an improved replay, a worse replay adding nothing, and never reporting a negative award; `parseLocalDate` accepting a day either side of the server's and discarding anything further; `coerceLedger` recomputing `totalXp` from the records it was sent and rejecting anything that isn't a version-2 ledger. **Extended 2026-07-31** with `ledgerFor()` itself, against a stand-in database (see the note above): a full ledger for a player who has never reset — the control, without which "reads as zero" would pass against a stand-in that returns nothing — then a tombstoned ledger reading **zero XP, no missions, no skills, no days, no achievements while `mission_runs` is read back untouched**; a post-reset run counting, with `attempts` at 1 rather than 2; active days kept in the table but counted only from the reset day; a pre-reset achievement stamp dropped and a post-reset one kept; a **failed `reset_at` read falling to "never reset" rather than blanking the player**; and a failed *run* read throwing instead of reporting an empty ledger |
| `claim.test.ts` | **New.** A genuine run kept with rewards re-derived; a submitted XP figure ignored entirely; scores clamped; unknown, coming-soon and prototype-polluting mission ids dropped; good rows kept when one is unusable; duration and hints bounded; `parseClaimDate` keeping real past dates but refusing the future and anything older than the app |
| `bundle-secrecy.test.ts` | **New.** Greps the real `.next` output for the four removed answer field names, and for any serialised `rootCauseId:"…"` / `fixId:"…"` pairing. Deliberately does **not** grep for bare answer ids — those are radio-button values and are legitimately in the bundle; the secret is which id is correct. Skips itself when `.next` is absent (see the warning in §2) |
| `settings.test.ts` | Option defaults valid, **the stored key set pinned so a preference nothing reads can't return**, the code tokenizer (lossless round-trip, keyword/string/comment/number classification, no keyword-inside-identifier) and the editor palettes (one per offered theme, unknown id falling back, no colour reused within a palette), reset protecting identity/preferences and sweeping unknown stage keys, plus every stage-prerequisite rule |
| `mission-validation.test.ts` | The live catalogue has zero errors and agrees with `availability` about playability; a valid fixture passes; **37 invalid-fixture cases** (8 catalogue, 7 investigation, 5 diagnosis, 5 fix, 6 verification, 6 results) each breaking exactly one rule, so a failure names the rule it broke |
| `mission-flow.test.ts` | **The four flows, end to end through the real modules**, walked in detail for the reference mission — see below |
| `mission-flows-all.test.ts` | The same four flows plus a content contract, run against **every** playable mission via `describe.each(PLAYABLE_MISSION_IDS)` — see below |
| `chapter-three.test.ts` | Chapter 3 and the close of the MVP: the four missions are authored and available, the chapter reaches `complete` only when all four are, the Chapter 2 → Chapter 3 walk and the stop after `slow-api-incident`, `playableSummary()` deriving 14/0/14, the validator reporting zero warnings, `n-plus-one-carnage` staying non-playable — plus one content-correctness block per incident: a forced `global.gc()` and a bigger heap must not resolve a retained-reference leak, more workers must not resolve a queue backlog, a bigger pool must not resolve a connection leak, and an unrestricted `Promise.all()` must not resolve an N+1. Ends with a documented progression-and-achievement attainability audit |
| `chapter-two.test.ts` | Chapter 2 specifically: the five missions are authored and available, the chapter reaches `complete` only when all five are, the Chapter 1 → Chapter 2 walk and the stop at the content cliff, no Chapter 3 mission recommended while Chapter 2 is unfinished, all three onboarding suggestions playable without fallback, and one content-correctness block per mission — the JWT single-flight requirement and the fixes that must *not* resolve, the liveness/readiness split, the ordering of the shutdown drain sequence asserted against the code example, and the atomic rate-limit requirement including the in-memory mutex being insufficient |
| `grade-disclosure.test.ts` | **New 2026-07-29.** How much of a grade `POST /api/runs` may say out loud (§12 item 19). `improvesOnBest` treating a first run as an improvement, requiring *strictly* greater (a tie is not one — resubmitting your own best answer must not buy the detail back), and reading the record for the right mission; `disclosedGrade` disclosing everything on a first run and a genuine improvement, **withholding every component field otherwise — asserted by key absence, not falsiness**, because `rootCauseCorrect: false` answers an enumerator's question exactly as well as `true`; still reporting score, verdict, XP and duration; and not mutating the grade it was given, since the route inserts the run from the same object it responds with |
| `profile.test.ts` | **New 2026-07-29.** `sanitizeDisplayName` leaving ordinary names, non-Latin scripts and emoji alone while stripping newlines/tabs, zero-width characters, bidi overrides, and reducing a name of nothing but those to empty; `parseProfileUpdate` mapping the client's vocabulary onto the six granted columns, **refusing a column it was never granted**, dropping catalogue ids that do not exist, ignoring fields with no column, truncating *after* sanitising, dropping an empty name, only ever setting `onboarding_completed` true, and returning null rather than issuing an empty `SET`; `coerceProfile` treating null columns as absent rather than as empty strings; `draftFromProfile` preferring the server per field, keeping the wizard `step` the server has no column for, and never un-completing onboarding. **The invisible code points are written as numeric escapes, never as literals** — the same rule `lib/server/profile.ts` follows, and for the same reason: a literal one vanishes the next time a tool touches the file |
| `reach.test.ts` | **New 2026-07-30.** What the frozen catalogue can and cannot award (§12 items 3, 4). The ceiling measured three ways — as a sum over playable missions, and independently by **playing every mission perfectly through the real grading engine** and landing on the same 1,830; per-skill ceilings matching what that playthrough credited each skill; `event-loop` topping out at 80 XP = level 2 against a target of 7; the planned skills being exactly `streams` and `validation`; the two roadmap achievements and four roadmap ranks being exactly the ones the ceiling cannot fund; `rankBand` aiming at the catalogue rather than an unreachable rank; roadmap goals excluded from the unlocked-of-total figure, never offered as "next to unlock", sorted last. **Two forward-looking cases simulate a grown catalogue and assert the treatment lifts itself**, so a Chapter 4 pass is told what to stop badging. Also pins the honest limit: overall mastery still cannot reach 100%, which is a progress figure and not a promise |
| `replay-limit.test.ts` | **New 2026-07-30.** The replay-rate policy (§12 item 19): a first run allowed, a four-run practice pattern allowed, the boundary at exactly `REPLAY_LIMIT`, the window **rolling** rather than a fixed bucket, an attempt exactly at the window edge already expired, retry time taken from the *oldest* counted attempt (not the newest), malformed timestamps ignored rather than counted, `Date`/epoch forms accepted, and the two constants themselves pinned — because 8-per-hour-per-mission *is* the product decision, and changing it should be a conscious edit to this test |
| `reset.test.ts` | **New 2026-07-31.** The reset tombstone's semantics (§12 item 7), pure and with no database. `resetInstant` reading an ISO instant **and the shapes PostgREST actually sends for a `timestamptz`** — an offset rather than a `Z`, and microsecond precision — and answering `null` for everything unparsable, including a `Date` object and a number, since the value comes off a JSON body. `countsAfterReset` short-circuiting a null tombstone to keep **everything, including values it could not parse** (the case almost every player is in); the reset day counting and the day before not, from either end of the reset day; the whole history before it dropped; an instant **exactly at** the tombstone not counting while one millisecond after does; the same date treated differently as a day and as an instant, on purpose, because two columns are stored differently; and anything unparsable kept — including a ten-character non-date, which is the string that would otherwise take the calendar branch and compare as `NaN` |
| `helpers/mission-run.ts` | Not a test: the shared harness (`installStorage`, `play`, `collectResults`, `stageProgress`) all three flow suites drive |

`mission-flow.test.ts` is the one worth knowing about. It drives the same functions the stage
workspaces call, in the order they call them, writing the same `localStorage` keys, then runs the
results screen's mount logic (grade → `creditRun` → `stampAchievements` → `saveResultsState`):

- **Perfect run** — 100, resolved, full XP, skill XP where the mission says, `first-mission` and
  `perfect-diagnosis` unlocked, mission reads Completed, `nextMissionId` returns
  `user-signup-latency-spike`.
- **Wrong run** — wrong cause + irrelevant evidence + wrong fix scores under 50, records the run but
  **not** as resolved, unlocks no resolved achievement, and the verification reports unchanged
  metrics with dependent checks failing and independent ones passing.
- **Hint run** — reopening the same hint three times still costs exactly one penalty (95, then 90
  with both hints), and a hinted run is excluded from `hintFreeResolved`.
- **Replay** — a better replay adds only the difference, a worse one changes nothing (mission XP and
  skill XP both), and re-running the results logic six times leaves `totalXp` unmoved.
- **Direct-route protection** — every later stage blocked for a player who has done nothing, each
  opening exactly as its prerequisite is met, and all four open for a completed mission even after
  its stage state is wiped.

`mission-flows-all.test.ts` generalises all of that. It parameterises over `PLAYABLE_MISSION_IDS`,
so **a mission added to the five stage registries automatically inherits the whole contract** — and
if any part of it fails, the mission is not finished. Per mission it asserts:

- **Content**: at least five root causes and five fixes; `answers.fixId` naming exactly one of the
  offered fixes; key evidence spanning at least three different tools (so no single log
  line gives the answer away); at least two non-key findings as negative evidence; a canonical
  `rewardSkillId` that is the primary skill, with at least one supporting skill behind it.
- **Perfect run**: 100, resolved, full mission XP, full primary-skill XP, every verification check
  green.
- **Wrong run**: under 50, unresolved, recorded as an attempt but not a resolution, no
  `first-mission` unlock, metrics held at their before values, fix-dependent checks failing and
  independent ones still passing.
- **Hint run**: exactly one `HINT_PENALTY`, and the run excluded from `hintFreeResolved`.
- **Replay**: better run adds only the difference, worse run adds nothing, refreshing results three
  times moves nothing.
- **Stage guards**: all four later stages blocked before play and open after it.

The wrong-run choices are derived from each mission's own config — the first root cause that isn't
correct, the evidence options that don't support it, the first fix that doesn't resolve — so the
harness needs no per-mission knowledge.

### 15.2 Mission content validation — `lib/mission-validation.ts` + `npm run validate:missions`

`validateMissions(input = LIVE_CONTENT)` is pure and takes the catalogue and all five registries as
an injectable `ValidationInput`, which is what lets the tests validate fixture data. It returns
`{ issues, errors, warnings, ok, playableMissionIds, missionsChecked }`. The CLI groups findings by
mission, prints a summary, and exits non-zero **only** on errors — a partially authored mission is a
warning, because it is a legitimate state.

Missions with *no* stage content are skipped entirely. Missions with *some* are reported, because a
half-authored mission is how a dead-end CTA happens.

| Area | Rules |
| --- | --- |
| Catalogue | Unique mission ids (and a warning on duplicate indexes); chapter ids exist; XP and duration are positive integers; difficulty is known; title/description/objectives/reward label non-empty; `rewardSkillId` is a canonical skill; skill definitions only reference real missions; future-track missions carry a future status and no reward skill; Node.js missions avoid future-only categories, are never `coming-soon`, and always carry a `rewardSkillId` |
| Stage completeness | All five configs present ⇒ playable; any subset ⇒ a warning naming the missing stages; a fully authored Node.js mission whose status still hides it is an **error** |
| Investigation | Unique evidence ids; every `evidenceId` referenced from logs, metrics, code, database or trace resolves; key evidence exists; `requiredKeyClues > 0` and ≤ the key evidence authored; every enabled tool has content; no duplicate tools; the trace tool and trace content imply each other; non-empty non-negative latency series with an in-range deploy marker; positive trace root; non-empty objective |
| Investigation → **selectability** | **≥2 selectable findings that are not key evidence**; **the selectable set may not be exactly the key set** (that is a complete answer key); **no public evidence field outside `{ id, source, title, description, isKeyEvidence }`**, and none matching `/correct\|answer\|recommend\|distract\|decoy\|wrong\|red.?herring/i`; an enabled tool that renders content but exposes nothing selectable is a **warning**, not an error — a panel can legitimately be all context, and forcing an evidence id onto a caption would be worse |
| Diagnosis | Unique root-cause and evidence ids; **`answers.rootCauseId` is one of the offered root causes**; ≥2 options; every id in `answers.evidenceIds` exists and appears once; `minimumEvidenceRequired` positive and ≤ options; **the correct evidence set is large enough to satisfy the minimum** (else a perfect score is unreachable); non-empty hint and prompt; a mission with no authored answers is flagged — it can be played but not graded |
| Fix | Unique option ids; **`answers.fixId` is one of the offered fixes**; non-empty title, description, explanation and code example per option |
| Verification | Unique metric and check ids; before/after/label/delta present; **at least one check depends on the fix**; success and unresolved logs both present; both summaries complete; chart series non-empty, equal-length, non-negative, positive `yMax`, `fixFraction` in 0–1; both request breakdowns non-empty with non-negative durations and a positive total (a warning if the spans exceed it) |
| Results | `missionId` matches the catalogue key; `skillImprovement.skillId` is canonical; lessons non-empty; both narratives complete; fix recap complete; metrics present with before/after and valid sparklines; `nextMissionId` resolves; **no obsolete `score` / `xpEarned` / `duration` / `steps` / `status` field** |
| Cross-stage | A diagnosis evidence option with no matching investigation evidence is a warning — the player could never have collected it |

Current output: **20 missions checked · 14 fully playable · 0 errors · 0 warnings**. The last
warning — `slow-api-incident`, partially authored — was closed by writing its remaining four stages
in the Chapter 3 pass. The earlier `user-signup-latency-spike` evidence warning had been fixed by
adding the matching `no-errors-in-logs` investigation item.

**This is the one place the answers are cross-checked against the public options**, which is why the
validator has to import a `server-only` module. It runs through `scripts/tsconfig.json`, which stubs
`server-only` **for the CLI only** — the app's own build is untouched, so the guarantee that the
answers cannot reach the browser still holds.

### 15.4 CI — `.github/workflows/ci.yml`

Runs on pushes to `main` and pull requests targeting `main`, on `ubuntu-latest` with Node 20 and
`actions/setup-node@v4`'s built-in npm cache. Steps, in order: `npm ci`, `npm run typecheck`,
`npm run lint`, `npm run validate:missions`, **`npm run build`, then `npm run test`**. A second job
runs the Playwright smoke test, kept separate so a browser download can't mask a failure in the pure
checks. In-progress runs for the same ref are cancelled. **There is no deployment step** — the
workflow only verifies.

**Environment variables — the earlier blanket "none are required" was wrong.** It is true of the
`verify` job: the build never reads the Supabase keys, and all five pure gates run without them.
It is **not** true of the `smoke` job. The e2e run serves the built app, and at runtime
`/api/ledger` throws a named error without `NEXT_PUBLIC_SUPABASE_URL`, so the provider's mount
request 500s, `POST /api/runs` 500s instead of 401ing, and the sign-in wall
`mission-flow.spec.ts` asserts on never renders. Reproduced locally by hiding `.env.local`: that
spec fails at the "Sign in with GitHub" assertion.

**The `smoke` job stopped using repository secrets on 2026-07-31** (§12 items 2 and 21). It now runs
`npx supabase start`, which brings up a full Supabase stack in Docker on the runner and **applies
every migration from an empty database**, then exports that stack's keys into `$GITHUB_ENV` with
`supabase status -o env`. Those keys are fixed, published demo values, not secrets. Three
consequences worth knowing:

- **No CI traffic reaches production.** Every push used to create and delete real users there.
- **A migration that cannot be applied is now a red build**, rather than something discovered by hand
  in the SQL editor. Migrations are applied manually to the hosted project, and 0004 proved that a
  file in the tree can be one the database will refuse.
- **Fork pull requests no longer skip the authenticated specs.** Secrets are not exposed to forks, so
  `hasCredentials()` silently skipped the twenty most important specs on exactly the contributions
  least likely to be trusted — a skipped run being the same colour as a passing one.

`supabase stop --no-backup` runs with `if: always()`, so a failed spec cannot leave containers or a
volume behind on the runner.

**The export step could not fail — fixed 2026-07-31, second pass (§12 item 22).** The workflow's
first real run (#21, on the PR #6 merge) was green, and that green proved less than it looked. The
key export was a pipeline ending `| tr -d '"' >> "$GITHUB_ENV"`. Actions runs `bash -e {0}`, which
does **not** set `pipefail`, so the step's status was `tr`'s — and `tr` succeeds on empty input. A
`grep` that matched nothing therefore exported nothing, exited 0, and handed the suite an
environment with no keys, at which point `hasCredentials()` skipped the twenty specs and the job
stayed green. **Every mechanism in the chain reported success while the thing they existed to run
did not happen.** Reproduced directly: the old pipeline, fed stack output under different variable
names, exits 0 and writes 0 bytes.

Closed at both ends, because either alone can be defeated:

- **`.github/workflows/ci.yml`** sets `set -euo pipefail` and then *reads back* `$GITHUB_ENV`,
  failing with a `::error::` naming any of the three variables that did not land. The readback is
  not redundant with `pipefail`: a variable exported with an empty value passes `grep` and is caught
  only by the readback.
- **`credentialsMissing()` in `e2e/support/session.ts`** throws instead of skipping whenever `CI` is
  set. Locally, a missing `.env.local` is still an ordinary skip. In CI there is no longer a
  legitimate reason to skip at all — the local stack's keys are published demo values, so there is
  nothing a fork could fail to read — and a skip there means the export broke.

This asserts the specific thing meant — *these specs ran* — rather than the job's exit code, which
was green in both worlds. Both halves were proven to fail before being trusted: renamed stack
variables die at the pipeline, an empty value dies at the readback, and `CI=1` with no credentials
turns collection red in all three `describe` blocks. The error names variables only, never values.

**And a third step counts the result.** `Assert every spec actually ran` runs
`scripts/assert-e2e-ran.mjs` after the suite, reading the JSON report Playwright writes only under
`CI`. It fails on any skip, on fewer than 37 specs, or on any failure. The two guards above both
reason about credentials; this one reasons about the number actually being claimed, and is the only
one that catches a spec file dropping out of collection. It prints the count on success, so the
figure is in the log rather than inferred from a colour.

**Reordered 2026-07-21, and the reason is worth recording.** `build` used to run *last*, after
`test`. `tests/bundle-secrecy.test.ts` — the check that greps the real build output for the answer
fields removed from the client bundle — skips itself when `.next` is absent, so that a clean
checkout can still run the suite. A CI checkout is always clean. **So the guard skipped on every CI
run from the day it was written**, and would have reported success while a leaked answer sat in the
bundle. Verified both ways locally: with no `.next` the file reports `1 passed | 2 skipped`; after a
build, `3 passed`.

The general lesson, since this is the second time it has bitten in one pass: **a test that can skip
itself is only as good as the thing that guarantees its precondition.** The other victim was a
stale `.next` producing 40 phantom leaks from a pre-migration build (§2). Both failure modes are
silent in opposite directions — one hides a real leak, the other invents one.

### 15.5 The authenticated specs — `e2e/authenticated.spec.ts` (new 2026-07-22)

**This closes the gap §12 item 2 described.** Grading, the ledger, the claim and the leaderboard
used to be verified by hand and by nothing else (§16.6); the probes that did it were never
committed. They are now **twenty** committed Playwright specs that cross the sign-in wall.

**How a session is minted, since GitHub OAuth cannot be driven by a test.** `e2e/support/session.ts`
does what the OAuth callback would: creates a user via `POST /auth/v1/admin/users` with the
service-role key and `email_confirm: true`, exchanges the password for a session via the password
grant, then writes that session into the Playwright context in exactly the encoding
`@supabase/ssr` reads it back with — `base64-` + `stringToBase64URL(JSON.stringify(session))`, run
through `createChunks`, under `sb-<project-ref>-auth-token`. Both helpers are imported from
`@supabase/ssr/dist/main/utils` rather than reimplemented, so a change to that encoding breaks the
specs loudly instead of silently signing nobody in.

The `player` fixture in `e2e/support/fixtures.ts` owns the lifecycle: **one fresh user per test**,
deleted in teardown even when the test fails, with `on delete cascade` taking the runs, active days
and achievements with it. Per-test rather than a shared seeded account is what keeps them parallel
and stops one test's runs appearing in another's ledger.

What they cover — the first eight mirroring §16.6 one for one, the last two added with the logout fix (§12 item 13):

| Spec | Asserts |
| --- | --- |
| ledger from Postgres | 200, a real empty ledger, and a `players` row the trigger created |
| perfect run | exactly one row, score 100, 80 XP, `resolved`, ≥5 skills credited, `first-mission` + `perfect-diagnosis` stamped server-side, ledger 80 — with `coderaid:player:progress` **absent** |
| worse replay | ledger still 80, `attempts` 2, both rows kept, best-run-wins as a view |
| local date | `completed_on` equals the *browser's* calendar date, not the server's UTC one |
| claim | imports one real mission, drops the unknown one, recomputes 9,999 XP down to 72, keeps the genuine past date, derives the active day from it, 409s on the second attempt |
| leaderboard | ranks the player, `isCurrentUser` only for the requester, no email and no answer fields in the payload |
| direct write | `POST` to `mission_runs` with the player's **own** token → **403**, nothing inserted |
| signed out | `/api/ledger`, `/api/leaderboard` and `POST /api/runs` all 401 |
| logs out | after submitting the sidebar's sign-out form, `/api/ledger` and `/api/leaderboard` both 401 — the session is over on the **server**, not merely visually |
| GET cannot log you out | `GET /auth/sign-out` → **405**, and the session still works afterwards |

**The four reset specs, added 2026-07-31 with §12 item 7.** These are the only place the *SQL* half
of the tombstone is tested — everything in `tests/` runs against a stand-in, and whether `best_runs`
actually filters on `players.reset_at` is a fact about migration 0004 in the live project.

| Spec | Asserts |
| --- | --- |
| zeroes the ledger without deleting a run | Real progress first (80 XP, a stamped achievement), then `POST /api/reset` → 200; the **response's** ledger is zero *and* a fresh `GET` agrees, so the tombstone is in the database rather than in a response the route constructed; XP, missions, skills and achievements all zero; `players.reset_at` is a real column value; the achievement rows are **gone**; the leaderboard row drops to 0 with the ledger, since both derive from the same view — and **`mission_runs` still holds the row, with its score and XP intact**, which is the entire difference between a tombstone and a delete |
| does not refill the replay limit | **The invariant most likely to be broken later.** Reach the limit, confirm it is genuinely reached, reset, submit again — still limited, still disclosing no `grade`, `ledger` or `credit`. The limit counts raw `mission_runs`, so a reset must not hand back a fresh set of attempts. Anyone who later "tidies up" by pointing it at `best_runs`, or by making the reset delete rows, hands every enumerator eight free guesses for the cost of one POST |
| does not re-open the one-time claim | Claim, reset, then assert **`players.claimed_at` is still set** — and only then that a second claim 409s, and that the first claim's row survived the reset like any other run. The column assertion is not redundant: §16.4 guards the one-time rule *twice*, with the flag **and** a partial unique index, so a reset that cleared the flag would still be refused by the index. The first draft checked only the 409 and **passed against a mutation that nulled `claimed_at`** — see the mutation log below |
| counts what the player earns after starting over | A reset is a starting point, not a wall: a run recorded afterwards scores normally and the ledger reads 80 again, with `attempts` at **1** — the pre-reset attempt is recorded and invisible, so the count beside the mission describes the history the player can see |
| signed out (in the un-extended block) | `POST /api/reset` → **401**. The route holds the service-role key and its only bound on *whose* row it stamps is the verified session, so that 401 is the whole of that bound rather than a nicety |

**They run against the real Supabase project**, because there is no local stack configured. Users
are created as `coderaid-e2e+…@example.com` and deleted; still, see §12 item 2 for why a dedicated
CI project would be better.

**`supabase/migrations/` is not applied automatically**, and the reset specs are the second guard
that depends on that having been done by hand — `view-privileges.spec.ts` was the first. Without
0004 the column does not exist, `POST /api/reset` fails on it, and `ledgerFor()` correctly degrades
to "never reset". **Confirm 0004 is live before believing any reset spec**, exactly the way
`view-privileges.spec.ts` confirms 0003.

The suite skips itself when the keys are absent — but **only outside CI**. `credentialsMissing()`
returns `true` locally, where no `.env.local` is an ordinary reason to skip, and *throws* whenever
`CI` is set (§15.4). That distinction is the whole point: this is the same skip-on-missing-
precondition pattern that hid the bundle-secrecy guard for weeks, and the honest reading is that
until 2026-07-31 it was **not** meaningfully safer. The comfort taken from "it skips only where the
credentials genuinely cannot exist" assumed the credentials always arrive where they can — which
is exactly what the export step failed to guarantee, silently. The machine that is supposed to run
these specs can now no longer decline to.

**Verified to fail when it should.** Mutating `parseClaim` to trust the submitted `xpEarned`
instead of recomputing it made the claim spec fail with `Expected: 72, Received: 9999`; the
mutation was then reverted. A green suite that cannot go red proves nothing.

**The reset specs, mutated one at a time on 2026-07-31** — and the exercise paid for itself twice:

| Mutation to `app/api/reset/route.ts` | Result |
| --- | --- |
| Delete the player's `mission_runs` rows as well (tombstone → delete) | **2 red** — "zeroes the ledger without deleting a single run" *and* "does not refill the replay limit". The second is the one that matters: it is the rate-limit bypass the decision exists to prevent |
| Keep the achievement stamps instead of deleting them | **red** on the stamps assertion |
| Do not stamp `reset_at` at all | **red** — the ledger never zeroes |
| Also null `players.claimed_at` | **passed at first, which was the point.** The 409 is produced by the partial unique index whether or not the flag is cleared, so the spec was asserting an outcome that two mechanisms defend and could not see one of them being removed. A direct assertion on the column was added, and the mutation then went red |
| Stamp `reset_at` from the Node clock again | **red** — this is the live bug §16.8 records, and the spec is what found it in the first place |

### 15.3 Stage prerequisites — `lib/stage-access.ts` + `components/missions/StageGate.tsx`

All 120 stage URLs are statically generated, so any of them can be typed directly. That is fine for
reading and wrong for *earning*: walking into `/results` would grade and credit a run the player
never worked.

`stageAccess(stage, progress)` is pure over a plain `StageProgress`
(`{ keyCluesCollected, keyCluesRequired, diagnosisConfirmed, fixApplied, verificationCompleted,
missionCompleted }`) and returns either `{ allowed: true }` or a reason plus the stage that produces
the missing state. Each stage requires only the step immediately before it — the flow is linear, so
"you confirmed a diagnosis" already implies an investigation, and chaining every condition would only
produce a less useful message.

| Stage | Requires |
| --- | --- |
| Briefing, Investigation | nothing — never guarded |
| Diagnosis | `keyCluesCollected >= keyCluesRequired` |
| Fix | a confirmed diagnosis |
| Verification | an applied fix |
| Complete (`/results`) | a completed verification |

**`missionCompleted` short-circuits to allowed**, so reviewing or replaying a finished incident is
unaffected — that is checked by a test that wipes all four stage keys and asserts every stage still
opens.

`StageGate` supplies the effects: it reads the mission's saved stage state after mount (mirroring the
investigation workspace's `min(requiredKeyClues, #keyEvidence)` clamp) and the ledger via
`useProgress()`, then renders either its children or a "Not there yet" panel linking back. It renders
nothing until hydrated — flashing the stage and then replacing it with a lock would be worse than a
moment of blank. This is consistency protection for the front end, **not security** — but since the
migration it no longer needs to be. Skipping straight to verification submits an empty diagnosis,
which the server grades as zero.

### 15.6 Database privileges — `e2e/view-privileges.spec.ts` (new 2026-07-29)

Three specs that use **no browser and no session**, added with the `best_runs` fix (§12 item 20).
They ask the only question that matters about the database API: *what can a stranger holding the
anon key read?* — which is everyone, since that key ships in the client bundle by design.

| Spec | Asserts |
| --- | --- |
| `best_runs hands nothing to an anonymous caller` | Either no row set at all (401/403 — the `revoke`) or an empty one (200 — `security_invoker` with no rows of your own). **Both are correct and they are different fixes**, so the spec accepts either and fails only if rows come back |
| `no answer-key column reaches an anonymous caller` | `root_cause_id`, `evidence_ids` and `fix_id` appear on nothing returned. Named explicitly, because the failure being guarded against is not "rows leaked" but *these fields* leaked — an empty result passes the row-count check by accident of the moment, and this one states the stakes |
| `the project answers at all, and the tables refuse an anonymous caller` | **Rewritten 2026-07-31.** Reachability is established with a **service-role** read, then each of `mission_runs`, `players` and `player_achievements` must give an anonymous caller *no rows* — as either `200 []` (a grant, with RLS filtering everything) or `401`/`403` (no grant at all). See below for why it changed |

`readAsAnon()` in `e2e/support/session.ts` reports the status instead of throwing on one, because
"permission denied" and "no rows" are both right answers here and a caller asserting *nothing came
back* should not have to care which it got.

**These live in `e2e/` rather than `tests/` deliberately.** §15.1 records that nothing in the Vitest
suite talks to Supabase, and that property is what makes the unit suite runnable with no credentials
and no network. This is a fact about the live database's privileges, not about any module.

**Why the third spec was rewritten (2026-07-31).** It asserted `200` with `[]` — `anon` holding
`SELECT` while RLS filtered every row away. That was only ever true because the hosted project was
created under Supabase's old auto-expose default (§12 item 21). Under the current default there is
no grant, the same read answers `401`, and **the spec failed against a correctly-configured
database**. `401` is the *stronger* posture — no grant beats a grant plus a policy — so both are now
accepted.

But accepting both costs the original control its whole purpose: if `anon` is refused everywhere,
"refused" no longer distinguishes a locked-down project from an unreachable one, and the two specs
above pass by saying nothing. So reachability is now established with the **service-role** key, which
must succeed in either privilege model. That is what keeps the anon results meaningful instead of
vacuous — the same "green for the wrong reason" trap that hid `bundle-secrecy` for weeks.

**Proven to fail, twice, and neither time by a mutation to the assertion.** Run against production
before `0003_lock_best_runs.sql` was applied, the first two went red on real leaked rows — including
a `root_cause_id` — while the third passed. The rewrite was proven the same way: on a local stack
with `grant select on public.best_runs to anon` and `security_invoker = false` re-applied and a seeded
run, the first two went red with *"the answer key is public"* and *"root_cause_id is readable without
a session"* while the new control stayed green — **the exact diagnostic pattern this section
describes**, now demonstrated under the new privilege model as well as the old one.

The usual caveat applies with more force than elsewhere: like the authenticated specs, these
`skip` themselves without credentials, and **a skipped run is the same colour as a passing one**.
For this guard that means the alarm is silent exactly when nobody is watching. Confirm they ran.

---

## 16. The server-authoritative architecture (new 2026-07-21)

The one-sentence version: **the browser may state what the player chose; the server decides what it
was worth.**

### 16.1 The schema — `supabase/migrations/`

| Table | Holds | Written by |
| --- | --- | --- |
| `players` | Identity and preferences only. Nothing scored — plus `claimed_at` and, since 0004, **`reset_at`**, which are server-owned and outside the player's column grant. **No email column** — `auth.users` is a SQL join away, and not duplicating it is one less thing to leak. | The `handle_new_user` trigger on sign-up; the player, for their own six profile columns; route handlers for the two server-owned ones |
| `mission_runs` | **Append-only.** Every graded run: score, XP, resolved, per-skill award, what they submitted, telemetry, `completed_on`, and `source` (`played` \| `claimed`) | Route handlers only |
| `player_active_days` | `(player_id, day)`. Opening the app is activity, which is what a streak measures — so it is not derivable from runs alone | Route handlers only |
| `player_achievements` | `(player_id, achievement_id, unlocked_at)`, stamped on the crossing | Route handlers only |
| `best_runs` (view) | `distinct on (player_id, mission_id) … order by score desc, completed_at asc`, plus an `attempts` count. **`security_invoker`, and revoked from `anon` and `authenticated`** since 0003 — it was neither, and served the answer key to anyone with the anon key (§12 item 20). Since 0004 it also **excludes every run at or before the player's `reset_at`**, which is what makes one reset reach the ledger and the leaderboard together | — |

**There is deliberately no `total_xp` column**, no stored rank and no stored streak. The runs are the
evidence; every figure is derived from them.

**Privileges are declared, not inherited (0005, 2026-07-31).** Until then the schema granted nothing
to `service_role` or `authenticated` beyond the six-column profile `UPDATE`, and worked only because
Supabase's old cloud default auto-granted every new `public` table to all three API roles. That
default is being withdrawn — §12 item 21 has the measurements and the date. `0005_explicit_grants.sql`
now states what each role may address:

| Role | Granted |
| --- | --- |
| `service_role` | `select, insert, update, delete` on the four tables, `select` on `best_runs`, sequence usage. It has `bypassrls`, but **bypassing RLS is not the same as holding a table privilege** |
| `authenticated` | `select` on the four tables — RLS then decides *which rows*. `players` stays SELECT-only here; the column-level `UPDATE` in 0001 is what grants the six profile columns |
| `anon` | **Nothing**, stated as a deliberate omission. A signed-out visitor never reads a table directly |

### 16.2 The trust model

RLS grants `SELECT` on your own rows and `UPDATE` on your own **profile columns only**, via a
column-level `GRANT`. There is **no insert, update or delete policy on any scored table**. The
service-role key bypasses RLS, so route handlers are the only writer of anything a player is scored
on.

The reasoning is worth keeping: **RLS decides which *row* you may touch, never which *values* you
may write into it.** A policy can say "you may only insert runs for yourself"; it cannot say "and
the score must be the one you actually earned". So grading cannot live there.

Verified empirically, with a real session: a player POSTing directly to `mission_runs`,
`player_achievements` or `player_active_days` gets **403** on all three, and PATCHing their own
`players.claimed_at` gets **403** because it is not in the column grant.

**RLS on a table says nothing about a view over it** — the lesson of §12 item 20, and the one gap in
this model that was open from the first migration until 2026-07-29. `best_runs` ran as its owner and
was granted to `anon` by default, so the answer key was readable from the open internet while every
sentence above remained true of the tables. The house rule is now written into `0001_init.sql` beside
the policies: **every view over an RLS-protected table sets `security_invoker = true` and grants
nothing to `anon` or `authenticated`.** `e2e/view-privileges.spec.ts` (§15.6) checks it from outside
the database, which is the only vantage point from which this class of bug is visible at all.

### 16.3 The endpoints

| Route | Does | Notes |
| --- | --- | --- |
| `POST /api/runs` | **The trust boundary.** Auth → parse → grade → insert → stamp achievements → return `{ grade, ledger, credit }` | Called when the player clicks **Run Verification** |
| `GET /api/ledger` | The derived ledger, whether a claim is available, and the player's profile | 401 signed out, never an empty ledger — those are different facts |
| `POST /api/ledger` | Records the player's local date as an active day, then reads | One request, because that is what the provider needs on mount |
| `POST /api/claim` | One-time import of a pre-account ledger | §16.4 |
| `GET /api/leaderboard` | Real standings | 401 signed out — the rows name other people |
| `POST /api/profile` | Writes the six granted `players` columns | **The only route on this list that does not hold the service-role key** — §16.7 |
| `POST /api/reset` | Stamps `players.reset_at` and deletes the player's achievement stamps, then reads the resulting zero ledger back | Deletes **no run**. Service-role, and §16.8 explains why it goes the opposite way to `/api/profile` |

Every route above holds the service-role key and bypasses RLS, **except `POST /api/profile`**. That
is not an oversight; it is the one place where running as the user is strictly safer, and §16.7 says
why. `POST /api/reset` is the sharpest contrast with it and §16.8 is the pair to that argument.

**Why grading happens at verification, not on the results screen.** Running verification is the
commit point: diagnosis and fix are both locked. Grading later would mean the results screen could
be refreshed to re-grade, and — worse — the obvious alternative, a "does fix X resolve the root
cause?" endpoint that recorded nothing, would be an **answer oracle anyone could enumerate**. The
run is recorded at the same moment its verdict is revealed.

**This argument is only half right, and §12 item 19 records the other half.** Recording a run is not
a cost: there is no rate limit, no server-side stage gating, and best-run-wins means a wrong guess
changes nothing. The full breakdown in the response then said which of the three answers was right,
so they could be searched separately. Grading at the commit point removed the *free* oracle, not the
oracle.

**Narrowed 2026-07-29.** The per-component detail is now disclosed only when a run improves on the
player's best (`lib/server/grade-disclosure.ts`), which collapses the separable search back into a
combined one. The run is still graded and recorded in full — this is a rule about the *response*, not
about the grade. `resolved` is still always sent, because the verification stage cannot render
without it, so the fix answer still leaks one bit per attempt; the closure for that is a rate limit,
and it is the open half of §12 item 19.

**What the client still owns, and why it is safe.** `hintsUsed` is client-reported telemetry and can
be under-reported; that is inherent to telemetry the client owns, and is why the *answer*, not the
telemetry, carries the score. `completedOn` is the player's local date, because streaks are counted
in local days and the server cannot compute another timezone's "today" — so it is accepted only
within ±1 day of the server's own UTC date. The most a forged one can buy is a day the player nearly
had.

### 16.4 Phase 4 — claiming a pre-account ledger

`POST /api/claim` turns a `localStorage` ledger into ordinary `mission_runs` rows marked
`source = 'claimed'`. Synthesising runs rather than importing totals is the point: a claimed total
would be a number with no evidence behind it, which is the one thing the schema exists to prevent.
After the claim, the player's progress derives from runs like everyone else's, and a replay improves
it under the same best-run rule.

| Trusted | Not trusted |
| --- | --- |
| The score, whether it resolved, roughly when | XP and skill awards — **recomputed** from the live catalogue |
| | Which missions exist — anything not currently playable is dropped |
| | The date — bounded to between 730 days ago and tomorrow |

A ledger claiming 999,999 XP for an 80-XP mission gets 80 (pinned by a test, and verified against
the live database). One-time, guarded by `players.claimed_at` **and** a partial unique index on
`(player_id, mission_id) where source = 'claimed'` — the flag alone would lose a double-submit race,
and an index cannot. `claimed_at` is not in the column grant, so a player cannot reset their own
flag and import twice.

The banner offering it appears only for a signed-in player who genuinely has one, states what will
*actually* be imported (not what the local ledger contains — those differ when it holds a renamed
mission id), and clears the local ledger afterwards so only one copy survives.

### 16.5 What the browser can no longer do

- **Compute a score.** It doesn't have the answers.
- **Add to any total.** `update()` is gone from the provider; `adopt()` takes only server responses.
- **Assert an achievement.** `useAchievements()` is a pure read.
- **Farm XP by refreshing.** The results screen credits nothing, and best-run-wins is a view.
- **Edit the ledger from devtools.** There is no ledger in `localStorage` to edit.

### 16.6 Verified, not assumed

Every claim above was checked against the live Supabase project by driving the real UI with
Playwright and a service-role-minted session, then reading Postgres back. ~~The probes are not
committed — see §12 item 2, which is the honest debt this leaves.~~ **They are committed as of
2026-07-22**, as `e2e/authenticated.spec.ts` (§15.5), so each item below is now re-checked by CI
rather than resting on one manual pass. What they confirmed:

- a perfect run records one row (score 100, 80 XP, six skills), returns a ledger and a credit, and
  stamps `first-mission` and `perfect-diagnosis` server-side;
- the dashboard renders that XP with **`coderaid:player:progress` absent entirely**;
- a deliberately bad replay scored 19, added **+0 XP**, left the ledger at 80, incremented
  `attempts` to 2, and left both runs in the append-only history;
- `completed_on` matches the *browser's* local date, and a forged `2020-01-01` active day is
  discarded;
- a claim imports only real missions, recomputes the XP, keeps genuine past dates, and 409s on a
  second attempt;
- the leaderboard ranks two real players correctly by period, marks `isCurrentUser` per requester,
  exposes no email or answer data, and 401s when signed out.

### 16.7 `POST /api/profile` — the one route that runs as the user (new 2026-07-29)

Every other route handler holds the service-role key, because grading and progression must not be
assertable from a browser. **The profile is the opposite case**, and it is the only place in the app
where the *weaker* client is the safer one.

`0001_init.sql` revokes blanket `UPDATE` on `players` and grants it back on exactly six columns —
`display_name`, `avatar_id`, `slogan`, `path_id`, `experience_id`, `onboarding_completed`. Running
the update as the signed-in user means **Postgres enforces both halves**: RLS decides the row is
theirs, and the column grant decides which values they may set.

State the consequence plainly, because it is the whole argument:

> If this handler had a bug that let a request name any column, the database would still refuse to
> write `claimed_at` or anything in `mission_runs`. **With the admin client it would not.**

That grant had been written since the first migration and nothing had ever used it — the columns
were granted and no code path wrote them (§12 item 17). This route is what finally exercises it.

`.eq("id", user.id)` in the handler is belt-and-braces; RLS already restricts the row. It is there so
the query says what it means without the reader having to hold the policy in their head.

**Verified against the live project on 2026-07-29**, with a real minted session rather than by
reasoning about the grant:

| Attempted as the signed-in player | Result |
| --- | --- |
| `PATCH players.claimed_at` | **403**, `42501 permission denied for table players` — not in the column grant |
| `PATCH players.display_name` | **204** — the grant works, which is the other half of the proof |
| `INSERT mission_runs` | **403**, `42501 new row violates row-level security policy` |
| `SELECT mission_runs` | **0 rows** — RLS holds on the table |

Nothing here is scored, so there is no ledger to re-derive and no achievement threshold to re-check.
The read path is separate and still service-role: `playerRecord()` in `lib/server/ledger.ts` returns
the profile alongside the claim flag on `/api/ledger` (§9).

### 16.8 `POST /api/reset` — the tombstone, and why it goes the other way (new 2026-07-31)

The pair to §16.7, and the contrast is the argument. `/api/profile` runs as the **user** because
every column it writes is one the player is allowed to own. `/api/reset` holds the **service-role
key** because `reset_at` is the opposite kind of column:

> A column the browser can write is a column the browser can write **at any value**. A player who
> could set their own `reset_at` to a date in the future would silently void every run they went on
> to record — a self-inflicted, invisible progress wipe that no code path could distinguish from an
> intentional reset.

So `reset_at` is deliberately outside the six-column grant, alongside `claimed_at`, and this handler
is the only thing that writes it. Being outside the grant is also what makes the signed-out **401**
the whole of the bound on *whose* row is stamped: with the admin client there is no RLS underneath to
catch a mistake.

What it does, in order, and the order is deliberate:

1. **Stamp `players.reset_at`.** Every derivation reads past it; `best_runs` applies the filter in
   SQL (0004), so scores, XP, skill totals and the leaderboard all go to zero from this one write.
2. **Delete the player's `player_achievements` rows.** An unlock time is a derived conclusion, not
   evidence. The tombstone lands *first* so that a failure at step 2 leaves a player whose ledger is
   already empty and whose stale stamps `ledgerFor()` filters out anyway — degraded but consistent.
   The reverse order would, on failure, leave full progress with the achievements missing, which is
   both worse and less recoverable.
3. **Read the zero ledger back** and return it, so the client adopts what the database actually
   holds rather than an assumed `EMPTY_LEDGER`. A failed read still reports the reset — the write
   happened, and the client refetches on its next mount.

**The clock bug, found by running it (2026-07-31).** The first version stamped
`new Date().toISOString()` — the *application server's* clock — into a column that is compared
against `mission_runs.completed_at`, which is the **database's** `now()`. Those are two different
clocks. The machine running the app measured ~2 seconds behind the Supabase instance, which was
enough for a run finished moments before a reset to land *after* the tombstone and survive it: the
ledger read 80 XP immediately after a reset that returned 200. The route now writes the Postgres
special value `'now'`, which resolves to the database's transaction timestamp, and reads the stored
value back so the response reports what was actually written.

It is worth naming the shape of that mistake, because the codebase already had the rule and it still
happened. `POST /api/runs` says it explicitly about the replay window — *"`completed_at` is the
database's own `now()`; `completed_on` is the player's local date and is therefore
attacker-controlled, so the limit must not be counted on it."* The same rule applies one level up:
**a value compared against database-generated timestamps must come from the database's clock.**
There the untrusted clock is the browser's, which is obvious. Here it was the server's own, which is
exactly why it looked safe. (The replay window still derives its cutoff from the Node clock, and that
is fine: a two-second error in a one-hour rolling window changes nothing, whereas here the skew sat
directly on the boundary that decides whether a run counts at all.)

The e2e spec *"counts what the player earns after starting over"* is the guard, and it was the thing
that found it — it asserted `attempts` was 1 and got 2. Reverting the fix makes it red again.

---

## 17. The verification replay that actually runs (new 2026-07-22)

§12 item 1 has been the same sentence for three passes: the verification stage is a 1,400ms
`setTimeout`, and while what it *reports* is derived honestly, nothing executes. For
`event-loop-overload`, that is now false.

**Why this mission and not the others.** Its incident is synchronous CPU work starving an event
loop, and a browser *has* an event loop. The bug is therefore reproducible rather than merely
describable — the same phenomenon, in the same kind of runtime, measured the same way an APM agent
measures it. Nothing about the reproduction is a metaphor. That is not true of most of the
catalogue: a connection pool exhausting, a container being restarted by a liveness probe or a
distributed counter losing increments across eight replicas cannot be honestly reproduced in one
browser tab, and faking them would be the same theatre wearing a better costume. Chapter 1 holds
the best remaining candidates — `promise-all-cascade`, `async-map-trap` and
`overlapping-scheduler-runs` are all pure JavaScript-runtime behaviours that a browser genuinely
exhibits.

### 17.1 What executes

`lib/verification-runtime.ts`, pure and Node-testable:

- `buildRows(12_000)` — deterministic rows, hand-seeded rather than random, so two replays are
  comparable and a test can assert on one.
- `aggregateWeekly(rows)` — for every row, a full scan for its bucket's peak. Genuinely O(n²), and
  the same shape as the mission's authored `report.controller.ts`. **Written as an explicit inner
  loop on purpose:** the first draft used `rows.find(...)`, which short-circuits, and measured 4ms
  for 1,400 rows — it would have "demonstrated" blocking that never happened.
- `measure(rows, offload)` — starts a 16ms probe, runs the work, and reports `maxLagMs` (the longest
  the loop went unanswered), `totalMs`, and `availability` (the share of expected probe firings that
  happened).
- `SCENARIO_ROWS = 12_000` — calibrated, not guessed: 5,000 ≈ 54ms, 9,000 ≈ 195ms, 12,000 ≈ 350ms.
  Long enough to be unmistakable against the 120ms threshold, short enough not to hang a tab.

The `Offloader` is injected, which is what makes the module testable outside a browser.
`lib/verification-offload.ts` supplies the real one: a `Worker` built from a Blob, whose body is
`aggregateWeekly.toString()` rather than a second copy of the workload — two copies would drift,
and a drifted copy would make the "fixed" path do less work than the broken one, faking the very
result this exists to measure.

### 17.2 The trust boundary, and the leak that nearly shipped

The first draft kept a `mission → offloading fix id` map in `verification-runtime.ts`. That module
is imported by a client component, so the map compiled straight into the browser bundle — the fix
stage's answer, in machine-readable form, which is **exactly** what deleting `resolvesRootCause`
was for.

The mapping now lives in `lib/server/replay.ts` behind `import "server-only"`. At runtime the
browser is told *whether* the work moves off the thread by the grading verdict already coming back
from `POST /api/runs`, and never *which* fix would have earned it. The replay therefore runs after
the submission rather than alongside it; that ordering is load-bearing, not incidental.

`tests/bundle-secrecy.test.ts` gained a fourth assertion for this shape — a mission id within 200
characters of its correct fix id — because neither existing check would have caught it: an object
literal keyed by mission id carries none of the removed field names and none of the `fixId:"…"`
serialisation shapes. **Verified by reintroducing the leak**: the new check failed, and passed
again once reverted.

### 17.3 Mission content, made executable

`tests/verification-runtime.test.ts` asserts the property worth having: executing the **authored
correct fix** measurably keeps the thread responsive, and executing **every distractor** measurably
does not. A mission whose "correct" fix does not actually work is now a failing test rather than a
claim nobody checked. This is why `lib/server/replay.ts` exists at all — the runtime does not need
it; the assertion does.

**On timing tests, which are usually a smell.** These assert a direction separated by a structural
gap, not a duration. One of them was flaky anyway and the fix is worth recording: comparing
`maxLagMs` with a 5× margin passed alone and failed under a parallel full-suite run, where
scheduling noise put the *responsive* case at 88ms against the blocked case's 249ms. `maxLagMs` is a
single worst sample — precisely the statistic contention distorts. The assertion now compares
`availability`: under a 300ms block the probe cannot fire at all, while a busy machine costs a
chunked run a few firings rather than all of them. Stable across three consecutive full-suite runs.

### 17.4 What the player sees

`ReplayMeasurement.tsx` renders the measured figures in a block deliberately styled apart from the
panels around it, labelled "Measured in your browser, just now". The separation is the point:
everything else on that screen is an authored illustration revealed according to the verdict, and a
real measurement presented as indistinguishable from a mock-up is worth less than either. The
measurement is **not persisted** — it describes one execution on one machine, and restoring
yesterday's number would reintroduce exactly the stale figure this change removes.

`e2e/authenticated.spec.ts` covers it in a real browser with a real Worker: the correct fix stalls
the thread for under 120ms, and a fix that leaves the work in place stalls it for more.

### 17.5 A fixture trap worth remembering

Writing the browser spec surfaced a flaw in the authenticated fixture (§15.5). Playwright fixtures
are **lazy**: a test destructuring only `{ page }` never instantiates `player`, so no session cookie
is written and the test runs **signed out** — silently, against endpoints that answer 401. It
presents as a missing element, which looks like a UI bug and is not one. The fixture is now
`{ auto: true }` and throws if the session cookie is not in the context afterwards, so a spec cannot
accidentally run anonymously.

### 17.6 The rest of Chapter 1 — `lib/verification-replays.ts` (new 2026-08-01)

The three missions §17 named as the only other honest candidates now have runnable replays:
`promise-all-cascade`, `async-map-trap` and `overlapping-scheduler-runs`. All three are pure
JavaScript-runtime behaviours — promise settlement, awaiting, and re-entrant scheduling — that a
browser exhibits natively. The remaining ten missions still do not have one, and still should not.

**Read this part before changing anything here: the binary model does not work for these.**
`event-loop-overload` takes one boolean — did the fix move the work off the thread — because all
four of its distractors genuinely leave it there. That is not true of `promise-all-cascade`. Its
`catch-each-promise-returning-null` distractor **does** stop the cascade; `lib/fix.ts` says so in as
many words, and calls it wrong for a different reason — it discards *which* vendor failed. A binary
replay would have shown that fix losing all 48 profiles while the mission text said it kept 47.
The replay would have contradicted the mission, which is the failure §17 exists to prevent.

So each fix names a **strategy**, and the strategy is what executes. `replayStrategy()` in
`lib/server/replay.ts` resolves `missionId + fixId → strategy` behind `server-only`, alongside the
`event-loop-overload` mapping; the browser receives one strategy name and never the map. That is
safe rather than merely tidy because the names are unordered and several non-answers score well on
something: `catch-null` retains every profile it can, `idempotency` prevents every duplicate.
Knowing your fix ran as `catch-null` discloses nothing the verdict does not already show you.

What each one measures, and why that number and not another:

| Mission | Measured | Resolved when |
| --- | --- | --- |
| `promise-all-cascade` | `retained`, `namedFailures` | 47 retained **and** the failure named — two numbers, because a fix that saves the profiles and loses the failure is the "quiet wrong success" the mission warns about, and one number cannot see it |
| `async-map-trap` | `completedAtReturn` of `total` | all items finished at the instant the job reported completion |
| `overlapping-scheduler-runs` | `maxConcurrentRuns`, `duplicateCharges` | never two runs at once — the authored root cause is the **overlap**; duplicates are the symptom, counted separately so `idempotency` and `dedupe-after` can be told apart from the fix that removes the cause |

`tests/verification-replays.test.ts` (23 tests) asserts the property §17 was built for, and one
more. Not only must the authored correct fix resolve the incident and every distractor fail to —
**each distractor must fail in the specific way `lib/fix.ts` says it does.** `catch-null` is asserted
to retain 47 and name 0. A test that only checked "distractor ⇒ bad" would pass while the replay
contradicted the prose, which is exactly the bug the per-fix model exists to avoid. These assert
counts rather than durations, so unlike §17.2 there is no timing margin to be flaky about; the one
time-shaped scenario overlaps structurally, its run being longer than its interval by design.

**A first draft measured the symptom instead of the mechanism.** The scheduler scenario derived each
run's invoice from a counter, which manufactured duplicate charges even when nothing overlapped —
so the *correct* fix scored one duplicate and the test failed. Runs now claim the lowest unsettled
invoice and only settle it on completion, so the duplicate is *caused by* the overlap. Same lesson
as `aggregateWeekly`'s short-circuiting first draft (§17.1): a scenario has to reproduce the
mechanism, not just the symptom. Both guards were then mutated deliberately — pointing the correct
cascade fix at the wrong strategy, and making the async-map fix stop awaiting — and both went red.

**Not yet wired to the UI, and §12 item 1 is not closed by this.** The engine and its tests are
landed and verified; nothing a player sees has changed for these three missions, which still show
the 1,400ms timer. Wiring needs `replayStrategy()`'s output added to the `POST /api/runs` response
next to `grade.resolved` — it cannot be computed in the browser without shipping the map — and a
renderer for these metric shapes, since `ReplayMeasurement.tsx` is specific to the event-loop
`Measurement` type. That is the next pass.

---

*Updated 2026-07-29 — the **grade-disclosure pass**, which narrows §12 item 19. `POST /api/runs` now
sends the per-component breakdown only when a run improves on the player's best; the run is still
graded and recorded in full, so the ledger, achievements and `best_runs` are untouched. The policy is
`lib/server/grade-disclosure.ts`, applied to the response only, and it costs no extra round trip
because the route already reads the ledger before the insert to measure `creditBetween`. `MissionGrade`
splits into an always-present half and a `detailed` half; withheld fields are absent rather than
falsified, and an explicit `detailed` flag lets the results screen explain the gap instead of
rendering an empty panel. **Deliberately not claimed as closed:** `resolved` must always be sent, so
the fix answer still leaks one bit per attempt, and the public weights make some scores decomposable.
The closure is a rate limit, **which landed on 2026-07-30**: 8 graded runs per mission per rolling
hour, and past it the run is recorded and graded while the response carries no verdict, ledger or
credit at all. Both guards proven to fail —
`tests/grade-disclosure.test.ts` under a mutated policy, and the e2e spec under a route that sends the
raw grade.*

*The same pass froze the catalogue at 14 missions and 1,830 XP, and made everything that puts out of
reach read as roadmap rather than as a goal: four career ranks, two achievements and two skills with no
authored mission. All of it derived from the catalogue by `lib/reach.ts`, so a Chapter 4 pass lifts the
treatment without editing a threshold. 623 tests across 25 files, 33 Playwright specs; all six gates
green.*

---

*Updated 2026-07-29 — the **`best_runs` lock**. A Postgres view does not enforce the RLS of the
tables beneath it unless it is declared `security_invoker`, and Supabase grants `SELECT` on public
relations to `anon` by default — so `public.best_runs` handed every player's runs, **including the
`root_cause_id` / `evidence_ids` / `fix_id` answer key**, to anyone with the anon key that ships in
the client bundle, with no session. The tables themselves held: `mission_runs` and `players` both
returned `[]` to the same caller. It leaked to `authenticated` too, which is why
`0003_lock_best_runs.sql` sets `security_invoker` **and** revokes from both roles — two guards,
because `create or replace view` silently drops the setting. `service_role` has `bypassrls`, so
`ledgerFor()` and `standings()` are unaffected, verified by re-running the suite and the Playwright
specs rather than by reasoning. The alarm is `e2e/view-privileges.spec.ts`, proven to fail by the
vulnerability itself rather than by a mutation, and the house rule for future views is written beside
the RLS block in `0001_init.sql`. 571 tests across 22 files, 30 Playwright specs; all six gates
green. See §12 item 20, §15.6, §16.2.*

---

*Updated 2026-07-29 — the **profile pass**, which closes the last open item of the decoration audit
(§12 item 17). The profile now reaches the server: `POST /api/profile` writes the six columns
`0001_init.sql` has granted since the first migration and nothing had ever used, Settings and
onboarding both call it, and `/api/ledger` carries the stored profile back — so renaming yourself
changes what the leaderboard shows other people, and a device that has never seen this player's
`localStorage` shows their real name instead of "Operative". It is the **only route in the app that
runs as the signed-in user rather than as service-role**, because the column grant makes Postgres
refuse `claimed_at` and every scored table even if the handler is wrong — verified against the live
project, not assumed (§16.7). `hasClaimed()` became `playerRecord()` so the claim flag and the
profile come back in one read. Three ornaments went with it: the landing page's preview tabs now
switch and its CTA opens the mission it quotes, and the top bar's account menu opens. **Still open:
display-name moderation** — `sanitizeDisplayName` is a rendering guard, not a word list. 571 tests
across 22 files, 27 Playwright specs; all six gates green.*

---

*Updated 2026-07-22 — a **decoration audit** (§12 items 13–18), which found one live defect and four
ornaments: **"Log out" does not end the session** — it is an `href="/"` beside a correct, unused
`POST /auth/sign-out` route; the sidebar's **"Go Premium" button has no handler** and sells nothing
that exists; the footer's **Privacy Policy and Terms of Service both point at `/demo`**; the
dashboard's Next Action **sparkline is a hardcoded squiggle** rendered beside a real metric; and
**profile edits never reach the server**, so the leaderboard shows a name Settings cannot change
even though the schema grants exactly that write. Plus 80 dead `done` flags in the catalogue.
Documented, not yet fixed. Preceded by the **verification replay**: `event-loop-overload` now executes its own
incident instead of describing it, with 12,000 rows of real quadratic work and the main thread's
responsiveness really measured; the mission→fix mapping moved behind `server-only` after the first
draft compiled the fix answer into the client bundle, with a new `bundle-secrecy` assertion to keep
it out; and the authored correct fix versus every distractor is now asserted by execution rather
than by claim. 523 tests across 20 files, 19 Playwright tests; all six gates green. See §17.
Preceded by the **authenticated CI specs** (§15.5): a service-role-minted session encoded the way
`@supabase/ssr` reads it, a per-test player fixture with teardown, and eight specs covering grading,
the ledger, the replay rule, the claim, the leaderboard and RLS — closing the half of §12 item 2
that said the server-authoritative path was verified by hand and by nothing else. That pass also
found the smoke job had never had the Supabase keys it needs at runtime.*

---

*Updated 2026-07-21 — the **Supabase migration**: GitHub OAuth, a Postgres schema whose organising
rule is that runs are the evidence and every figure is derived from them, the mission answers moved
behind `import "server-only"`, grading moved into `POST /api/runs` at the verification commit point,
the progression ledger derived in Postgres rather than held in `localStorage`, a one-time import for
players who earned progress before accounts existed, and a real leaderboard — which deleted the
thirty fictional players and the 12,480-strong invented population. 460 tests across 16 files; all
six gates green. See §16. Preceded by the "Chapter 3 complete" pass: `memory-leak-worker`, `worker-queue-backlog`,
`connection-pool-exhaustion` and `slow-api-incident` fully authored, making Chapter 3 the third
complete chapter and closing the Node.js MVP at **14 of 14 missions playable**. The validator's last
warning is gone (0 errors, 0 warnings); the suite grew to 425 tests across 13 files with a new
`chapter-three.test.ts` carrying a progression-attainability audit; and a Playwright Chromium smoke
test now plays one mission through the real UI as a separate CI job. Chapters 4 and 5 remain Coming
Soon. Preceded by the "Chapter 2 complete" pass: `jwt-session-expiry`, `health-check-flapping`,
`graceful-shutdown-bug` and `rate-limiter-race` fully authored, taking the catalogue to 10 playable
and fixing the signup evidence warning. Preceded by the "Chapter 1 complete" pass: `promise-all-cascade`, `async-map-trap`,
`overlapping-scheduler-runs` and `unhandled-rejection-storm` fully authored, and a parameterised flow
suite that holds every playable mission to the same perfect / wrong / hint / replay contract.
Preceded by the "quality gates and second mission" pass:
`typecheck` / `lint` / `test` / `validate:missions` wired and passing, an automated mission content
validator, and client-side stage prerequisite guards. Node.js-first MVP; databases, caching, system
design and cloud reliability remain visible, non-playable future tracks.*
