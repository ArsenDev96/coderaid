# CodeRaid — Current State of the Codebase

> **Purpose of this document.** A complete, self-contained snapshot of what exists in the CodeRaid
> repository as of 2026-07-28. It is written to be handed to a planning model (ChatGPT) that has
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
> At the close of that pass the suite was 460 tests across 16 files, with all six gates green.
>
> **New in the verification-replay pass (2026-07-22).** `event-loop-overload` stopped describing its
> incident and started *executing* it: 12,000 rows of real quadratic work, with the main thread's
> responsiveness genuinely measured in the browser (§17). The mission → offloading-fix mapping moved
> behind `import "server-only"` after the first draft compiled the fix answer into the client bundle,
> and `tests/bundle-secrecy.test.ts` gained a fourth assertion to keep it out. The other thirteen
> missions still run the 1,400ms timer, because their incidents are not honestly reproducible in one
> browser tab — §17 says which ones could be next and why.
>
> **New in the authenticated-spec pass (2026-07-22).** The half of the app behind the sign-in wall —
> grading, the ledger, the claim, the leaderboard, RLS — is covered by eight committed Playwright
> specs that mint a real session with the service-role key (§15.5), closing the half of §12 item 2
> that said the server-authoritative path was verified by hand and by nothing else.
>
> **New in the decoration audit (2026-07-22).** A deliberate sweep for anything still ornamental,
> recorded as §12 items 13–18: one live defect ("Log out" does not end the session) and five pieces
> of debt. **Documented, not yet fixed.**
>
> **New in the trust-defect pass (2026-07-28) — §18.** Two things the app was telling players that
> were not true. **A cached grade could outlive the answers it described**: changing a wrong fix to
> the right one and verifying again could redisplay the previous unresolved report — and, because
> that state renders the report *instead of* the run panel, left no **Run Verification** button to
> re-run with. Grades now carry a fingerprint of the diagnosis and fix they were computed from and
> are refused once either changes; separately, `applied` no longer survives a change of fix
> selection. **And "Log out" now logs out** — it was a `<Link href="/">` that left the session fully
> intact beside a correct, unused `POST /auth/sign-out` route (§12 item 13, closed).
>
> Also in that pass, the **decoration audit was cleared** (§12 items 14–18, §18.3): the Premium card
> and the footer's five `/demo` links deleted, the dashboard sparkline **derived from each mission's
> own latency samples** rather than a hardcoded squiggle, and the objective `done` flags removed —
> which turned out to be a live defect rather than the dead code the audit described, since the
> mission browser rendered them and six were authored `true`. Item 17, the profile that never
> reaches the server, is the only one of the six still open, and it is a product decision.
>
> The suite is **494 tests across 19 files**, plus **12 Playwright specs**. All six gates green:
> `typecheck`, `lint`, `test`, `validate:missions`, `build`, `playwright`.

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
| Framework | Next.js **14.2.35**, App Router |
| Language | TypeScript 5.5, `strict: true`, path alias `@/*` → repo root |
| UI | React 18.3, Tailwind CSS 3.4 |
| Icons | `lucide-react` |
| Animation | `framer-motion` (reduced-motion aware) |
| Fonts | `next/font/google` — Inter (`--font-inter`), JetBrains Mono (`--font-jetbrains`) |
| Backend | **Supabase** — Postgres + GitHub OAuth. Four route handlers under `app/api/`; no server actions |
| Auth | `@supabase/ssr` 0.12 + `@supabase/supabase-js` 2 — GitHub OAuth only, cookie sessions |
| Tests | **Vitest 2** — `tests/`, 19 files, 494 tests, Node environment, `@/*` alias |
| Browser smoke | **Playwright 1.61** — `e2e/`, 12 Chromium tests against the production build: 2 signed-out, 10 authenticated (§15.5, §17.4, §18) |
| Lint | **ESLint 8 + `eslint-config-next`**, committed `.eslintrc.json` extending `next/core-web-vitals` |
| Content validation | `tsx scripts/validate-missions.ts` over `lib/mission-validation.ts` |

Scripts: `npm run dev | build | start | lint | typecheck | test | test:watch | validate:missions`,
plus `npx playwright test`.

Runtime dependencies added by the migration: `@supabase/ssr`, `@supabase/supabase-js`.

### Environment

`.env.local` holds three variables — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
and `SUPABASE_SERVICE_ROLE_KEY`. The service-role key is read only inside `lib/supabase/admin.ts`,
which begins with `import "server-only"`, so no import path can pull it toward the browser bundle.
It must never be given a `NEXT_PUBLIC_` prefix.

### Verified command results (re-run 2026-07-28)

| Command | Result |
| --- | --- |
| `npm run typecheck` | **passes clean**, no errors |
| `npm run lint` | **runs non-interactively** — "No ESLint warnings or errors" |
| `npm run test` | **494 passed** across 19 files |
| `npm run validate:missions` | **0 errors, 0 warnings** — 20 missions checked, 14 fully playable |
| `npm run build` | **succeeds**, "Compiled successfully" |
| `npx playwright test` | **12 passed** (Chromium, against the production build) |

All six were re-run on 2026-07-28, after the stale-verification and sign-out fixes (§18), and are
recorded above as observed.

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
  start/                     Onboarding wizard (4 steps)
  sign-in/                   Real GitHub OAuth sign-in (SignInCard)
  demo/                      Placeholder route (PlaceholderPage)
  auth/callback/route.ts     OAuth code exchange → session cookie
  auth/sign-out/route.ts     POST only
  api/runs/route.ts          THE TRUST BOUNDARY — grade a run and record it
  api/ledger/route.ts        GET the derived ledger · POST an active day
  api/claim/route.ts         One-time import of a pre-account local ledger
  api/leaderboard/route.ts   Real standings, signed-in players only
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
  dashboard/                 DashboardShell, DashboardSidebar, DashboardTopBar, DashboardGreeting,
                             NextAction, DailyRaid, CareerProgress, RecommendedMissions,
                             SkillsSummary, usePlayer
  onboarding/                OnboardingWizard, OnboardingAside
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
  run.ts                     Per-mission run telemetry: timing, stages completed, hints used
  skills.ts                  CANONICAL Node.js skill taxonomy
  stage-access.ts            Pure stage-prerequisite rules (what StageGate enforces)
  mission-validation.ts      Pure content-validation rules (what validate:missions runs)
  code-theme.ts              Pure code tokenizer + editor-theme palettes (what CodeText renders)
  verification-runtime.ts    The replay that actually executes: workload, probe, measurement (§17)
  verification-offload.ts    The browser's Worker offloader for that replay
  server/replay.ts           server-only: which fix moves the work off the thread
  investigation.ts diagnosis.ts fix.ts verification.ts results.ts   Per-stage content + state
  dashboard.ts achievements.ts leaderboards.ts onboarding.ts settings.ts

lib/server/                  ALL of these begin with `import "server-only"`
  answers.ts                 THE SECRET: every mission's correct root cause, evidence and fix
  submission.ts              Parses untrusted submissions; bounds lists, clamps duration,
                             validates the player's local date to ±1 day
  ledger.ts                  Derives the Ledger from Postgres; stamps achievements
  claim.ts                   Validates a pre-account ledger; re-derives every XP figure
  standings.ts               Derives the leaderboard from best_runs + players

lib/supabase/                env.ts · client.ts (browser) · server.ts (session) ·
                             admin.ts (service-role — the only writer of anything scored)

supabase/migrations/
  0001_init.sql              Tables, best_runs view, RLS, handle_new_user trigger
  0002_claim_local_progress.sql  players.claimed_at, mission_runs.source, claim uniqueness

scripts/
  validate-missions.ts       CLI wrapper: grouped output, non-zero exit on errors
  tsconfig.json              Stubs `server-only` so the CLI can import lib/server/answers.ts

tests/                       Vitest — pure domain logic + end-to-end mission flows
  grading  progress  availability  verification  skills  achievements
  leaderboards  mission-validation  settings  mission-flow
  bundle-secrecy  ledger-derivation  claim
  stubs/server-only.ts       Aliased by vitest.config.ts so server modules import in Node

e2e/                         Playwright — mission-flow.spec.ts (signed out),
                             authenticated.spec.ts (session-backed, §15.5)
  support/                   session.ts (mint a session), fixtures.ts (player
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
    than keep a promise it could not keep.
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
| `PLAYABLE_MISSION_IDS` | const | `NODE_MISSIONS.filter(hasFullContent)` → currently all 14 Node.js missions — chapters 1, 2 and 3 — in catalogue order |
| `missionAvailability(mission, view?)` | fn | future-track chapter → `coming-soon`; authored `coming-soon` / `locked` → as authored; **lacking full content → `in-development`**; **in the ledger → `completed`**; **started but unfinished → `current`**; otherwise `available`. |
| `canStart(mission, view?)` | fn | Not coming-soon, locked or in-development, **and** `hasFullContent`. |
| `canReview(mission, view?)` | fn | Completed *and* content exists — which now always holds, since completion can only come from a real run. |
| `blockedReason(mission, view?)` | fn | Copy for a CTA that must stay disabled, or `null`. The old "Mission review is being prepared." special case is gone with the fake completions. |
| `recommendedMission(view?)` | fn | The mission to open next: Node.js track, fully playable, preferring one the player has **started**, then one they haven't finished. Can never dead-end. |
| `nextMissionId(currentId, view?)` | fn | Next mission by index that `canStart` and the player hasn't completed; `undefined` when nothing playable remains. |
| `playableSummary()` | fn | `{ playable, inDevelopment, total }` over `NODE_MISSIONS` → currently `{ 14, 0, 14 }`. Player-independent, and **derived** — no component hardcodes the count. |
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
- `components/onboarding/OnboardingWizard.tsx` — the completion card only links into a mission that
  `canStart`, falling back to `recommendedMission()` then `/missions`.
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
disabled, labelled button with an `AvailabilityNote` whenever `canStart` is false — today 6 of 20,
all of them in the future-track chapters 4 and 5.
"Start Investigation" calls `touchRun()` + `completeStage("Briefing")`: this is where the clock starts.

### Stage 2 — Investigation `/missions/[id]/investigation`
Five tools (`logs`, `metrics`, `code`, `database`, `trace`); each mission enables a subset. Rows that
carry an `evidenceId` are selectable; "Mark as Evidence" batches, de-duplicates, and commits the
selection to the collected-evidence rail. A key-clue counter gates progression:
`keyCollected >= min(requiredKeyClues, #keyEvidence)` — 3 on all fourteen playable missions — before
"Continue to Diagnosis" appears; following it records `completeStage("Investigation")`. The same
threshold now also gates the diagnosis *route*, not just the button (§15.3).
State: `{ activeTool, collectedEvidenceIds[] }`.

### Stage 3 — Diagnosis `/missions/[id]/diagnosis`
Single-select root cause + multi-select supporting evidence + a collapsible hint.
`canConfirm = rootCauseId != null && evidenceIds.length >= minimumEvidenceRequired` (2 on
`user-signup-latency-spike`, 3 on the other thirteen). The confirm bar names the single missing
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
**Changing the selection is the start of a new attempt** (§18.1): `applied` resets to false, because
applying is a deliberate act that has not happened yet for the new option, and the cached grade is
dropped, because it describes the option the player just moved away from. Both used to survive the
change.
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
without one there is nothing truthful to render, so the player runs verification again. **The grade
must also still describe the answers currently saved** (§18.1): a player who went back and changed
their fix gets the run screen, not the previous attempt's report.

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
playable mission it moves Available → In Progress → Completed as *this* player plays them.
**`Objective` is a plain string** — it carried a `done` flag until 2026-07-28, six of which were
authored `true` and rendered as completed ticks in the mission browser (§12 item 18). There are
currently **no missions in the `locked` state**; the value remains supported by the type and the UI.

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
investigation config), `sparklinePoints(series)` (§12 item 16 — the card's chart, scaled from the
mission's own authored latency samples) and `DAILY_RAID` (copy only — no route, no XP figure, a
disabled CTA and a note saying so). `RESPONSE_SERIES` and `PREMIUM` were **deleted** on 2026-07-28.

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
Persists to `coderaid:profile`; `completed: true` swaps the wizard for a "You're all set"
card permanently (the only way back is the Settings profile section).

### Settings — `/settings`

- **Profile** — name + avatar, written into `coderaid:profile` while preserving onboarding fields;
  explicit Save button with a transient confirmation.
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

---

## 9. Persistence — the complete storage contract

Storage is now split by a single question: **is it scored?** Anything scored lives in Postgres and
is written only by a route handler. Everything below is *working state* — what you have done so far
in a mission you are playing, and how you like the app configured. None of it decides a number, and
that is exactly why a mission can be played without an account.

| Key | Written by | Shape |
| --- | --- | --- |
| `coderaid:profile` | onboarding, settings profile | `{ name, avatarId, slogan, pathId, experienceId, step, completed }` |
| `coderaid:user-settings` | settings experience | `{ codeEditorTheme, showLineNumbers }` — stored values from a previous shape are dropped by the loader |
| `coderaid:player:progress` | **nothing, any more** | The pre-migration ledger. Read-only: shown to a signed-out player who earned it before accounts existed, and cleared once phase 4 imports it. No code path writes this key. |
| `coderaid:{missionId}:grade` | verification | `{ grade, answers }` — the grade **the server returned**, stamped with the diagnosis and fix it describes. Cached so the results screen renders the same verdict without a second round trip or a second run row; the stamp is what stops it describing a *previous* attempt (§18) |
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
  Achievements / Settings, with a sign-out form pinned to the bottom) plus a sticky top bar with
  streak / XP / rank pills.
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
- `/demo` is still a placeholder page. `/sign-in` is real. The footer's Privacy Policy, Terms of
  Service, GitHub, Twitter and Discord links all pointed at `/demo` and were **removed** on
  2026-07-28 (§12 item 15) — the pages are still unwritten, which is why the links are absent rather
  than repointed.
- **Profile edits never leave the browser.** Settings and onboarding write `coderaid:profile` in
  `localStorage`; `players.display_name` is only ever written once, by the sign-up trigger, and it
  is what the leaderboard shows (§12 item 17). **The last item on this list** — sign-out, the
  Premium card, the fabricated sparkline and the authored objective ticks were all cleared on
  2026-07-28 (§18).

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
   claim, the leaderboard and RLS as eight committed specs (§15.5). What remains under this item:
   there are still no *component* tests, and the browser coverage is still one mission deep — the
   other thirteen are covered by Vitest rules only.
   **And the authenticated specs run against the live Supabase project**, because no local stack is
   configured. Users are namespaced `coderaid-e2e+…@example.com` and deleted in teardown, but a
   dedicated CI project would be the right fix — a failed teardown currently leaves a row in
   production, and CI traffic and real players share a database.
3. **Content scale is still the bottleneck — but the bottleneck has moved.** All 14 Node.js
   missions are playable, so the problem is no longer *finishing* the MVP but *growing past it*:
   at 1,830 total XP the catalogue cannot reach the Backend Engineer rank (10,000 XP), and Chapters
   4 and 5 hold the next 6 missions. Every system above scales with content; nothing else is
   blocking. (This item read "6 of 14 playable" until 2026-07-21 — it was written before the
   Chapter 2 and 3 passes and was left stale by them.)
4. **Skill-level achievements may be unreachable at current content volume.** "Event Loop Master"
   wants level 7 = 280 skill XP, and the one authored mission that builds it awards 80 at a perfect
   score. Chapter 1 improved this for `async-javascript`, `promises` and `error-handling`, and
   Chapter 2 does the same for `api-design`, `authentication` and `process-lifecycle`, which now
   have several missions behind them. It is a true statement about the catalogue, not a bug — it
   resolves itself as missions are written. `chapter-one-cleared` is genuinely achievable, and a
   Chapter 2 clear is now reachable the same way.
5. **Every page load costs three Postgres round trips.** `ProgressProvider` POSTs `/api/ledger` on
   mount, which upserts the active day, rebuilds the ledger, syncs achievements and rebuilds it
   again. Honest at this scale; the fix when it isn't is caching, not a stored total.
6. **The leaderboard reads every row of `best_runs` on each request.** Fine at one row per player
   per completed mission; the fix when it isn't is a materialised view refreshed on write.
7. **There is no server-side reset.** Runs are append-only, so "Reset Progress" cannot erase earned
   XP for a signed-in player. The copy says so, but whether an account should be able to wipe its
   own history — and whether that is even coherent with an append-only ledger — is undecided.
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
    What remains is **1 high + 1 moderate in production, unreachable in this app and unfixable in
    the 14.x line**: the advisory range is `9.3.4-canary.0 – 16.3.0-canary.5`, so the fix is
    Next 16 — a major migration. Every remaining advisory needs a feature CodeRaid does not use:
    there is no `middleware.ts`, no `next/image` import anywhere, no i18n, no rewrites, no server
    actions, and the bundled `postcss` is build-time only. The dev tree still carries the rest of
    the findings via `eslint-config-next` and vite. **Re-measure with `npm audit --omit=dev` rather
    than trusting the total** — the headline count mixes dev and production.

### Found in the decoration audit, 2026-07-22

A deliberate sweep for anything still ornamental now that grading, the ledger and the leaderboard
are real. One of the five is a live defect rather than debt.

13. ~~**"Log out" does not log out — this is a bug, not decoration.**~~ **Resolved 2026-07-28
    (§18.2).** `DashboardSidebar` rendered it as `<Link href="/">`, which navigated to the landing
    page and **left the session intact**; returning to `/dashboard` was still signed in. The
    correct route had existed at `app/auth/sign-out/route.ts` the whole time — deliberately a
    `POST`, with a comment explaining that a `GET` would let any page on the internet log the
    player out with an `<img>` tag — and nothing called it. It is now a form that POSTs to it,
    covered by a browser spec that asserts `/api/ledger` answers 401 afterwards.

14. ~~**The Premium block advertises a product that does not exist.**~~ **Resolved 2026-07-28.**
    The sidebar's "Go Premium / Upgrade Now" (`PREMIUM` in `lib/dashboard.ts`) was a
    `<button type="button">` with **no handler**, promising "premium Node.js incidents, exclusive
    rewards and advanced analytics" — none of which exist and none of which can be bought. Deleted,
    on the same reasoning as the theme toggle, `defaultLanguage`, `soundEffects` and the three fake
    leaderboard scopes (§4.11). The `mt-auto` it carried moved to the sign-out form, which is what
    holds the sidebar's last item against the bottom.

15. ~~**The footer's legal links are not legal links.**~~ **Resolved 2026-07-28 — by removal.**
    `components/Footer.tsx` pointed **Privacy Policy** and **Terms of Service** at `/demo`, a
    `PlaceholderPage` reading "Watch the demo"; GitHub, Twitter and Discord too. All five links are
    gone rather than repointed. The legal pair is the one that acquired real weight once accounts
    and a database existed — a Terms link that is not terms is worse than no link, because it
    implies terms were agreed to. **Writing the actual pages is still open** and is a product/legal
    decision, not a code one; the links should return with the pages, not before them.

16. ~~**The dashboard sparkline is a hardcoded squiggle.**~~ **Resolved 2026-07-28 — by deriving
    it.** `RESPONSE_SERIES` was 21 authored points described in its own comment as a "noisy,
    elevated latency series", rendered on the Next Action card beside a **real** headline metric and
    identical for every mission whatever incident the card was showing. It is replaced by
    `sparklinePoints(series)`, a pure scaler fed from the mission's **own authored investigation
    chart** (`metrics.latency.series`), so the shape on the dashboard is the shape the player is
    about to investigate — flat then spiking for `event-loop-overload`, a steady climb for a leak.
    `null` when a mission has fewer than two samples, and the card then renders no chart rather than
    a straight line implying a measurement. `tests/dashboard.test.ts` pins the scaling and asserts
    that different missions produce different shapes.

17. **The profile never reaches the server.** `players` carries `display_name`, `avatar_id`,
    `slogan`, `path_id`, `experience_id` and `onboarding_completed`, and `0001_init.sql` grants
    `UPDATE` on exactly those six columns to `authenticated` — the one thing a player is allowed to
    write. **Nothing ever writes any of them.** Settings and onboarding persist to
    `coderaid:profile` in `localStorage`, while the leaderboard renders the GitHub-derived
    `display_name` written once by the `handle_new_user` trigger. So changing your name in Settings
    leaves everyone else seeing the old one. This is a feature gap rather than clutter: the schema
    and the RLS grant were built for it and the client was never connected.

18. ~~**80 dead `done` flags in the catalogue.**~~ **Resolved 2026-07-28 — and they were not dead.**
    The audit said `MissionObjectives` takes `steps: string[]` and never reads them, so nothing
    rendered. That was true of the *briefing*, and wrong about the app: `MissionBrowser` rendered
    them in the mission detail panel, drawing a violet `Check` for `done: true` and a grey `Circle`
    otherwise. **Six were authored `true`** — across `user-signup-latency-spike`,
    `jwt-session-expiry`, `health-check-flapping`, `graceful-shutdown-bug` and `rate-limiter-race` —
    so a player who had never opened those missions was shown objectives already ticked on their
    behalf. A live §4.10 violation, not latent debt. `Objective` is now just `string`, all 80 flags
    are gone, the browser renders plain markers (nothing tracks per-objective progress, so there is
    no honest tick to draw), and `validate:missions` fails an objective that is not a non-empty
    string — which is where authored player-state is already caught.

    **Deliberately not on this list:** `DAILY_RAID`. It carries no XP figure and no route and says
    outright that daily challenges "aren't playable yet" — it advertises an idea and admits it,
    which is the honest version of the same situation.

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

### 15.1 The test suite — `tests/`, Vitest, 494 tests across 19 files

Node environment, no DOM, no component testing library. `vitest.config.ts` re-declares the `@/*`
alias so tests import modules exactly the way the app does, **and aliases `server-only` to
`tests/stubs/server-only.ts`** so the server modules can be imported and tested in Node. Anything
needing `localStorage` supplies an in-memory `Storage` (either injected, as `loadLedger(storage)`
and `resetMissionProgress(storage)` already allow, or via a `globalThis.window` shim in the flow
tests).

Nothing in the suite talks to Supabase. The pure rules that decide what crosses the trust boundary
are tested directly; the round trip itself was verified by hand (§16.6) and is the debt in §12
item 2.

| File | Covers |
| --- | --- |
| `grading.test.ts` | Correct/wrong diagnosis, partial and padded evidence, correct fix under a wrong diagnosis, wrong fix, unapplied fix, one and many hints, abandoned runs, score clamped to 0–100 across six combinations, XP derived from `mission.xp × score`, `resolved` only when the applied fix resolves, skill reward shares, `scoreBand` |
| `progress.test.ts` | Empty ledger, `xpForLevel`/`levelFromXp` inverted at **every** threshold 1–20, level progress, rank bands incl. top rank, skill levels and caps, first credit, idempotent re-credit, better replay adding only the difference, skill-XP top-up, worse replay never regressing, `totalXp` recomputed from records, legacy/corrupt/malformed ledgers resetting safely, streak behaviour across four cases, period XP and success rate, achievement stamping, reset preserving profile + settings |
| `availability.test.ts` | `hasFullContent` true/false, `PLAYABLE_MISSION_IDS` derived, available → current → completed from the ledger, future track always coming-soon, **every authored status is a content state**, a mission lying about being available still degrades, recommendation and `nextMissionId` never returning incomplete content, progress counting, chapter states |
| `verification.test.ts` | Both branches of `resolveVerification`, dependent vs independent checks, purity (the authored config is never mutated), and — across *every* playable mission — that a failed run fails at least one check and that exactly one fix option resolves |
| `skills.test.ts` | Zero start, primary vs supporting reward shares, unrelated skills uncredited, derived levels after crediting, unique ids, valid categories, mission back-references, `skillsToImprove` only suggesting actionable skills, category averages |
| `achievements.test.ts` | Nothing unlocked at zero, resolved-only counting, completed-but-unresolved, hint-free from real telemetry, skill-level achievements, `perfect-diagnosis` at exactly 100, timestamps stamped once and never moved, ordering, idempotent re-derivation |
| `leaderboards.test.ts` | **Rewritten for real standings.** Ranking by the selected period, gapless ranks, deterministic tie-breaks (incidents then name, stable when the input order flips), period figures rather than all-time, podium/table split, filters narrowing the table **without renumbering ranks**, the similar-level band, percentile measured against the real population and floored at 1, empty-board cases — plus a guard that the fictional roster, `TOTAL_PLAYERS`, `HOME_COUNTRY`, `HOME_COMPANY` and `currentPlayerEntry` cannot come back |
| `ledger-derivation.test.ts` | **New.** `creditBetween` for a first completion, an improved replay, a worse replay adding nothing, and never reporting a negative award; `parseLocalDate` accepting a day either side of the server's and discarding anything further; `coerceLedger` recomputing `totalXp` from the records it was sent and rejecting anything that isn't a version-2 ledger |
| `claim.test.ts` | **New.** A genuine run kept with rewards re-derived; a submitted XP figure ignored entirely; scores clamped; unknown, coming-soon and prototype-polluting mission ids dropped; good rows kept when one is unusable; duration and hints bounded; `parseClaimDate` keeping real past dates but refusing the future and anything older than the app |
| `bundle-secrecy.test.ts` | **New.** Greps the real `.next` output for the four removed answer field names, and for any serialised `rootCauseId:"…"` / `fixId:"…"` pairing. Deliberately does **not** grep for bare answer ids — those are radio-button values and are legitimately in the bundle; the secret is which id is correct. Skips itself when `.next` is absent (see the warning in §2) |
| `settings.test.ts` | Option defaults valid, **the stored key set pinned so a preference nothing reads can't return**, the code tokenizer (lossless round-trip, keyword/string/comment/number classification, no keyword-inside-identifier) and the editor palettes (one per offered theme, unknown id falling back, no colour reused within a palette), reset protecting identity/preferences and sweeping unknown stage keys, plus every stage-prerequisite rule |
| `mission-validation.test.ts` | The live catalogue has zero errors and agrees with `availability` about playability; a valid fixture passes; **39 invalid-fixture cases** (10 catalogue, 7 investigation, 5 diagnosis, 5 fix, 6 verification, 6 results) each breaking exactly one rule, so a failure names the rule it broke — including an objective carrying player state, and an empty one |
| `dashboard.test.ts` | **New.** `sparklinePoints` — nothing drawn below two samples, the series spanning the full width oldest→newest, the peak at the top and trough at the bottom, every point inside the box, a flat series down the middle rather than pinned to an edge, and a monotonic climb rendering as one — plus that every playable mission's Next Action card carries **its own** latency samples and that different missions produce different shapes (§12 item 16) |
| `mission-flow.test.ts` | **The four flows, end to end through the real modules**, walked in detail for the reference mission — see below |
| `mission-flows-all.test.ts` | The same four flows plus a content contract, run against **every** playable mission via `describe.each(PLAYABLE_MISSION_IDS)` — see below |
| `chapter-three.test.ts` | Chapter 3 and the close of the MVP: the four missions are authored and available, the chapter reaches `complete` only when all four are, the Chapter 2 → Chapter 3 walk and the stop after `slow-api-incident`, `playableSummary()` deriving 14/0/14, the validator reporting zero warnings, `n-plus-one-carnage` staying non-playable — plus one content-correctness block per incident: a forced `global.gc()` and a bigger heap must not resolve a retained-reference leak, more workers must not resolve a queue backlog, a bigger pool must not resolve a connection leak, and an unrestricted `Promise.all()` must not resolve an N+1. Ends with a documented progression-and-achievement attainability audit |
| `chapter-two.test.ts` | Chapter 2 specifically: the five missions are authored and available, the chapter reaches `complete` only when all five are, the Chapter 1 → Chapter 2 walk and the stop at the content cliff, no Chapter 3 mission recommended while Chapter 2 is unfinished, all three onboarding suggestions playable without fallback, and one content-correctness block per mission — the JWT single-flight requirement and the fixes that must *not* resolve, the liveness/readiness split, the ordering of the shutdown drain sequence asserted against the code example, and the atomic rate-limit requirement including the in-memory mutex being insufficient |
| `stale-grade.test.ts` | **New.** That a cached grade never outlives the answers it describes: the fingerprint normalising evidence order and reading an absent state as empty; the cache refused after the fix changes, after the diagnosis changes, when written before grades carried their answers, and when truncated — and returned again if the player reverts to exactly the answers it was computed from; `clearGradedRun` taking the credit with it; and the reported reproduction, wrong fix → graded → correct fix, ending with nothing for the verification or results screen to report rather than the previous verdict (§18) |
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
spec fails at the "Sign in with GitHub" assertion. The smoke job now receives all three keys as
secrets (§15.5).

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
committed. They are now ten committed Playwright specs that cross the sign-in wall — the eight
below plus the two added with the §18 fixes.

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

What the original eight cover, mirroring §16.6 one for one:

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

**They run against the real Supabase project**, because there is no local stack configured. Users
are created as `coderaid-e2e+…@example.com` and deleted; still, see §12 item 2 for why a dedicated
CI project would be better.

The suite skips itself when the keys are absent (`hasCredentials()`), so a fork's pull request —
which cannot read secrets — skips these rather than failing red. That is the same skip-on-missing-
precondition pattern that hid the bundle-secrecy guard for weeks, so it is worth being explicit
about the difference: **that** one skipped silently on the machine that was supposed to run it,
where this one skips only where the credentials genuinely cannot exist, and the job that owns them
does not skip.

**Verified to fail when it should.** Mutating `parseClaim` to trust the submitted `xpEarned`
instead of recomputing it made the claim spec fail with `Expected: 72, Received: 9999`; the
mutation was then reverted. A green suite that cannot go red proves nothing.

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

---

## 16. The server-authoritative architecture (new 2026-07-21)

The one-sentence version: **the browser may state what the player chose; the server decides what it
was worth.**

### 16.1 The schema — `supabase/migrations/`

| Table | Holds | Written by |
| --- | --- | --- |
| `players` | Identity and preferences only. Nothing scored. **No email column** — `auth.users` is a SQL join away, and not duplicating it is one less thing to leak. | The `handle_new_user` trigger on sign-up; the player, for their own profile columns |
| `mission_runs` | **Append-only.** Every graded run: score, XP, resolved, per-skill award, what they submitted, telemetry, `completed_on`, and `source` (`played` \| `claimed`) | Route handlers only |
| `player_active_days` | `(player_id, day)`. Opening the app is activity, which is what a streak measures — so it is not derivable from runs alone | Route handlers only |
| `player_achievements` | `(player_id, achievement_id, unlocked_at)`, stamped on the crossing | Route handlers only |
| `best_runs` (view) | `distinct on (player_id, mission_id) … order by score desc, completed_at asc`, plus an `attempts` count | — |

**There is deliberately no `total_xp` column**, no stored rank and no stored streak. The runs are the
evidence; every figure is derived from them.

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

### 16.3 The endpoints

| Route | Does | Notes |
| --- | --- | --- |
| `POST /api/runs` | **The trust boundary.** Auth → parse → grade → insert → stamp achievements → return `{ grade, ledger, credit }` | Called when the player clicks **Run Verification** |
| `GET /api/ledger` | The derived ledger + whether a claim is available | 401 signed out, never an empty ledger — those are different facts |
| `POST /api/ledger` | Records the player's local date as an active day, then reads | One request, because that is what the provider needs on mount |
| `POST /api/claim` | One-time import of a pre-account ledger | §16.4 |
| `GET /api/leaderboard` | Real standings | 401 signed out — the rows name other people |

**Why grading happens at verification, not on the results screen.** Running verification is the
commit point: diagnosis and fix are both locked. Grading later would mean the results screen could
be refreshed to re-grade, and — worse — the obvious alternative, a "does fix X resolve the root
cause?" endpoint that recorded nothing, would be an **answer oracle anyone could enumerate**. The
run is recorded at the same moment its verdict is revealed.

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

---

## 18. Two trust-critical defects, fixed 2026-07-28

Both were cases of the app telling the player something untrue about their own work — the first
about their run, the second about their session. Neither was a design question; both were state
outliving the thing it described.

### 18.1 A grade outliving the answers it was about

**The reproduction.** Play `event-loop-overload`, pick a wrong fix, run verification, and correctly
get an unresolved report. Go back to the Fix stage, pick
`move-report-generation-to-worker-thread` — the authored correct fix, the one
`tests/verification-runtime.test.ts` proves actually keeps the thread responsive — apply it, and
verify again. The screen showed **the previous run's report**: event-loop lag unchanged, API
latency unchanged, checks failing, the old verdict. The player did the incident correctly and was
told they hadn't.

**Two independent causes, both fixed.**

1. **The cached grade was keyed by mission alone.** A mission has exactly one `coderaid:{id}:grade`
   entry however many times it is replayed, so the entry had no way to say which attempt it
   belonged to, and `VerificationWorkspace` restored `phase: "done"` from it on mount. Worse than
   showing the wrong verdict: in that state the screen renders the report *instead of* the run
   panel, so there was no **Run Verification** button — the player could not re-run from the screen
   whose entire job is re-running.
2. **`applied` survived a change of selection.** `FixWorkspace` wrote `{ fixId, applied }` from two
   independent pieces of state, so picking a different option kept `applied: true` from the
   previous one. A newly selected fix therefore arrived at verification already marked applied —
   past `StageGate`, and about to be graded as though the player had applied it.

**The fix.** `lib/grade-submission.ts` gained `GradedAnswers`, a fingerprint of the saved diagnosis
and fix (`rootCauseId`, sorted `evidenceIds`, `fixId`, `fixApplied`). `saveGrade` stamps it onto the
cache; `loadGrade` returns the grade **only while it still matches** what is saved now, and null
otherwise — which every existing caller already handles, because "no grade" is the state a player
who has not verified is in. So the verification screen offers the run and the results screen says
the run has not been graded yet, with no new UI for either. Alongside that, `selectFix` resets
`applied` and calls `clearGradedRun`, and the diagnosis stage clears it too when a cause or an
evidence item changes.

**Why both, when either would do.** They fail differently. Clearing on change is prompt and covers
the ordinary path; the fingerprint is the backstop for what clearing cannot see — another tab, a
hand-edited store, a cache written before grades carried their answers. That last case is treated as
stale deliberately: there is no way to prove what such an entry describes, and asking for one more
click costs the player far less than being shown a verdict about a run they have moved on from.

The fingerprint reads the two stage keys **directly** rather than through `loadDiagnosisState` /
`loadFixState`. Both sides of the comparison have to be produced identically for it to mean
anything, and going through the loaders would pull two large mission-content modules into every
route that renders a grade to obtain two key strings.

**Verified by reintroducing the defect.** With the freshness check reverted, four
`tests/stale-grade.test.ts` cases fail. The browser spec needed **both** halves reverted to go red —
either one alone prevents the bug, which is the point of having both — and then failed exactly as
reported: `getByRole("button", { name: "Run Verification" })` not found, because the screen was
still showing the first attempt's report.

### 18.2 A sign-out that signed nobody out

§12 item 13, now closed. The sidebar's "Log out" was `<Link href="/">`: it navigated to the landing
page and left the Supabase session completely intact, so returning to `/dashboard` was still signed
in and on a shared machine the next person inherited the account. `app/auth/sign-out/route.ts` had
been written correctly — a `POST`, because a `GET` sign-out would let any page on the internet log
the player out with an `<img>` tag — and never wired to anything.

It is now a `<form action="/auth/sign-out" method="post">`. A plain form rather than a `fetch`
because the 303 the route returns reloads the document, which is what clears the signed-in ledger
`ProgressProvider` is holding in memory; it also works with JavaScript disabled.

**Verified by reintroducing the defect**: pointed at `/` with `method="get"` the new spec fails with
`/api/ledger` answering 200 after "logging out" — the old behaviour, exactly.

### 18.3 Clearing the decoration audit

The rest of §12 items 14–18, in the same pass. Three were deletions, one was a derivation, and one
turned out to be a live defect the audit had misread.

- **The Premium card** (item 14) is gone from `lib/dashboard.ts` and the sidebar. Its `mt-auto` —
  what held the sidebar's last item against the bottom — moved to the sign-out form.
- **The footer's five `/demo` links** (item 15) are gone rather than repointed. Writing privacy and
  terms copy is a product and legal decision, so the links wait for the pages.
- **The sparkline** (item 16) is derived instead of deleted. `sparklinePoints(series)` scales the
  mission's **own** authored `metrics.latency.series` into the card's box, so the dashboard shows
  the shape of the incident the player is about to open.
- **The objective `done` flags** (item 18) were **not** dead, which is the finding worth keeping.
  The audit checked `MissionObjectives` — the briefing component, which genuinely ignores them —
  and concluded nothing rendered. `MissionBrowser` renders them, as a violet tick or a grey circle,
  and six were authored `true`. Players were being shown objectives completed on their behalf for
  five missions they had never opened. `Objective` is now `string`, and `validate:missions` rejects
  anything else.

The lesson generalises past this item: *"nothing renders it"* is a claim about the whole app, and
checking one of two consumers is not checking it. The validator rule exists because that is the
layer that catches authored player-state regardless of which component happens to read it.

---

*Updated 2026-07-28 — **two trust-critical defects fixed** (§18). A cached grade could outlive the
answers it described, so changing a wrong fix to the correct one and verifying again could show the
previous run's unresolved report — with no Run Verification button on screen to try again with.
Grades now carry a fingerprint of the diagnosis and fix behind them and are refused the moment
either changes, the Fix stage no longer carries `applied` across a change of selection, and both
halves were confirmed by reintroducing them: four Vitest cases and one browser spec go red without
the fix, the browser spec failing exactly as reported. And **"Log out" now ends the session** rather
than navigating away from it, closing §12 item 13 — the correct `POST` route had existed unused
since it was written. The same pass cleared the **decoration audit** (§12 items 14–18): the Premium
card and the footer's five `/demo` links deleted, the Next Action sparkline derived from each
mission's own authored latency series instead of a hardcoded squiggle, and the objective `done`
flags removed — the audit had called those dead code, but the mission browser rendered them and six
were authored `true`, so five missions showed players objectives ticked on their behalf.
`validate:missions` now rejects an objective that is not a plain non-empty string. 494 tests across
19 files, 12 Playwright specs; all six gates re-run green.*

---

*Re-verified 2026-07-28 (earlier the same day) — no code changed. `typecheck`, `lint`, `test` and `validate:missions` were
re-run and recorded in §2 as observed (471 tests across 17 files; 20 missions checked, 14 playable,
0 errors, 0 warnings). Nine stale figures left behind by earlier passes were corrected: the §2
command table still reported the pre-replay 460/16 and a 2-test Playwright run; the browser-smoke
row and the §17 footer both counted 11 Playwright specs where there are 10 (2 signed-out + the 8
§15.5 already listed correctly); and §5 and §6 still described the pre-Chapter-2 world — six
playable missions, `playableSummary()` at `{ 6, 8, 14 }`, and a briefing CTA disabled on 18 of 20
missions. The three 2026-07-22 passes had also never reached the preamble, which still read "as of
2026-07-21"; they are summarised there now.*

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
than by claim. 471 tests across 17 files, 10 Playwright tests; all six gates green. See §17.
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
