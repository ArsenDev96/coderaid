# CodeRaid

**A realistic Node.js backend debugging and interview-preparation simulator.**

Master Node.js through realistic production incidents: investigate logs, metrics, traces and
backend code, diagnose the failure, apply a fix, and verify the result.

Mission content is authored TypeScript; everything about a *player* is earned. Score, XP, level,
rank, skill XP, streaks, achievements and leaderboard position all derive from runs the player
genuinely finished — nothing is authored, and a new account starts at zero.

**Progress is server-authoritative.** The correct answers live behind `import "server-only"` and
never reach the browser bundle; grading runs in a route handler holding the Supabase service-role
key; and the progression ledger is derived in Postgres from an append-only run history. The browser
can say what the player *chose*. It cannot decide what that was worth.

Missions are free to play without an account. The sign-in wall is at **Run Verification** — the
point where a score starts being recorded.

## Scope

The MVP is deliberately narrow: **Node.js and JavaScript runtime problems inside backend systems.**
Async JavaScript, the event loop, APIs, background jobs, error handling and runtime performance.

Databases, caching, system design and cloud reliability are visible in the product as clearly
marked future tracks. They are not playable, their CTAs are disabled, and they do not count toward
progress.

## Tech stack

- **Next.js 14** (App Router)
- **TypeScript** (`strict`)
- **Tailwind CSS**
- **Supabase** — Postgres + GitHub OAuth (`@supabase/ssr`, `@supabase/supabase-js`)
- **Lucide** icons
- **Framer Motion** for entrance/hover animations (reduced-motion aware)
- **Vitest** for domain-logic tests, **Playwright** for browser smoke, **ESLint**
  (`next/core-web-vitals`) for linting

## Getting started

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

### Environment

Create `.env.local` with your Supabase project's credentials (Settings → API):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

> **The service-role key bypasses row-level security.** It is read only by `lib/supabase/admin.ts`,
> which starts with `import "server-only"` so no import path can pull it toward the browser bundle.
> Never give it a `NEXT_PUBLIC_` prefix.

Apply the migrations in [`supabase/migrations/`](supabase/migrations/) in order, and enable the
GitHub provider in Authentication → Providers.

## Development checks

```bash
npm run typecheck         # tsc --noEmit
npm run lint              # ESLint, next/core-web-vitals
npm run test              # Vitest — pure domain logic in lib/
npm run validate:missions # mission content validation
npm run build             # production build
npm run test:e2e          # Playwright — one mission through the real browser
```

All of them run non-interactively. `npm run test:watch` runs Vitest in watch mode.

The Vitest suite is **460 tests across 16 files**, including a parameterised suite that puts every
one of the 14 playable missions through the same perfect / wrong / hint / replay / stage-guard
contract.

> **Run `build` before `test`.** `tests/bundle-secrecy.test.ts` greps the real `.next` output for the
> answer fields that were removed from the client bundle, and skips itself when `.next` is absent so
> a clean checkout still passes. A *stale* `.next` therefore produces phantom failures — a build
> predating the Supabase migration still contains them. If that test fails, delete `.next` and
> rebuild before believing it.

`npm run test:e2e` needs a browser once: `npx playwright install chromium`. It builds the app and
serves it through Playwright's `webServer`, then plays `event-loop-overload` from briefing to
results in Chromium and checks that a directly typed results URL is blocked beforehand.

CI runs `typecheck → lint → validate:missions → build → test` on every push to `main` and every pull
request targeting it — see [`.github/workflows/ci.yml`](.github/workflows/ci.yml). It builds on
Node 20 with npm dependency caching, needs no environment variables, and has no deployment step. The
browser smoke test runs as a **separate job**, so a browser download can never mask a failure in the
pure checks.

`build` runs **before** `test` deliberately: the bundle-secrecy guard needs `.next` to exist, and
skips itself when it doesn't. With the old ordering it skipped on every CI run.

`validate:missions` reads the live catalogue, the five stage registries **and the server-side
answers**, and reports every content mistake the type system can't see — an `answers.rootCauseId`
that names no offered option, a mission requiring more key clues than it authors, an
`answers.fixId` that isn't one of the fixes, a results config that has re-introduced a hardcoded
score. It is the one place the secret answers are cross-checked against the public options, which
is why it runs through `scripts/tsconfig.json` — that stubs `server-only` **for the CLI only**, so
the app's own build is untouched. Errors exit non-zero; warnings are printed but don't fail the run.

## Mission content status

Only missions with complete end-to-end content are startable. Everything else renders a disabled CTA
with an explanation, so no player can reach an unwritten stage. The counts below are **derived** at
runtime from which stage configs exist — no component hardcodes them.

| State | Missions |
| --- | --- |
| **Playable (14)** | All of Chapter 1, Chapter 2 and Chapter 3 — the whole Node.js MVP |
| **In development (0)** | None — every Node.js mission is authored end to end |
| **Coming soon** | Chapter 4 Databases (4), Chapter 5 Caching and Distributed Systems (2) |

`playableSummary()` derives `{ playable: 14, inDevelopment: 0, total: 14 }`, and
`npm run validate:missions` reports **0 errors and 0 warnings**.

Chapters:

1. **Async JavaScript** — event loop, promises, async control flow *(complete)*
   `event-loop-overload` · `promise-all-cascade` · `async-map-trap` · `overlapping-scheduler-runs` · `unhandled-rejection-storm`
2. **Node.js APIs** — request handling, auth, health, shutdown, rate limiting *(complete)*
   `user-signup-latency-spike` · `jwt-session-expiry` · `health-check-flapping` · `graceful-shutdown-bug` · `rate-limiter-race`
3. **Workers and Performance** — worker memory, queue backlogs, pool pressure, request performance *(complete)*
   `memory-leak-worker` · `worker-queue-backlog` · `connection-pool-exhaustion` · `slow-api-incident`
4. *Databases* — coming soon
5. *Caching and Distributed Systems* — coming soon

### Where to start

**Event Loop Overload** is the beginner mission: a new reporting endpoint aggregates 480,000
analytics records synchronously inside the request handler, blocking the event loop and slowing down
every unrelated endpoint with it. It is what `recommendedStartingMission("beginner")` resolves to,
what the onboarding completion CTA opens, and what `recommendedMission()` hands a brand-new player.

From there `nextMissionId()` walks the catalogue in order — Promise.all Failure Cascade, The Async
Map Trap, Overlapping Scheduler Runs, Unhandled Rejection Storm, User Signup Latency Spike, JWT
Session Expiry Bug, Health Check Flapping, Graceful Shutdown Bug, Rate Limiter Race Condition,
Memory Leak in Worker Pool, Worker Queue Backlog, Connection Pool Exhaustion, then The Slow API
Incident — skipping anything already finished and never pointing at unwritten content. It returns
nothing after The Slow API Incident: that is the last Node.js mission, and Chapters 4 and 5 are
future tracks rather than playable content.

The other two onboarding suggestions resolve the same way: `junior` opens Promise.all Failure Cascade
and `mid` opens User Signup Latency Spike. All three are fully authored, so none of them falls back.

## Mission flow

Every playable mission moves through six stages:

```
Briefing → Investigation → Diagnosis → Fix → Verification → Complete
```

Investigation offers five tools (logs, metrics, code, database, trace); the player collects evidence
until the key-clue threshold is met, then diagnoses a root cause, chooses a fix, runs verification
and lands on results.

**The UI never says which evidence is right.** Every meaningful observation is selectable — the
decisive findings, the healthy subsystems, the plausible alternatives that turn out to be wrong —
and all of them render identically, so a plus button carries no information about correctness.
Collecting an irrelevant finding is allowed and simply costs evidence precision when the server
grades the case. `npm run validate:missions` fails a mission whose selectable rows are an answer key.

**Answers are graded on the server.** Clicking **Run Verification** submits the run to
`POST /api/runs`, which pairs it with answers the browser has never seen, scores it, records it, and
returns the breakdown. `lib/grading.ts` scores out of 100 — root cause 45, supporting evidence 25 (a
balanced F-score, so padding the case with irrelevant findings costs marks), fix 30, minus 5 per
hint opened. The *formula* is public on purpose: knowing the root cause is worth 45 points tells you
nothing about which root cause is right, and it lets the results screen render the working.

Verification is graded there — not on the results screen — because that is the commit point.
Grading later would let a refresh re-grade, and the obvious alternative (a "does this fix work?"
endpoint that recorded nothing) would be an answer oracle anyone could enumerate.

When the applied fix doesn't resolve the root cause, `resolveVerification()` reports the incident
*unchanged*: metrics hold at their before values, the chart's after-line matches its before-line, the
pre-fix logs replay, and every check marked `dependsOnFix` fails. Checks about the rest of the system
stay true either way.

Stage routes are statically generated, so they can be opened directly. `components/missions/StageGate.tsx`
checks the prerequisite each stage builds on — investigation progress before diagnosis, a confirmed
diagnosis before the fix, an applied fix before verification, a completed verification before
results — and links back to the stage that produces it. A mission already in the ledger passes
through at every stage, so review and replay are untouched. This is consistency protection for the
front end rather than security — and it no longer needs to be security: skipping straight to
verification submits an empty diagnosis, which the server grades as zero.

## Authoring a new mission

A mission becomes playable the moment `hasFullContent(missionId)` returns true, which happens when
its id appears as a key in **all five** stage registries:

| Registry | Module |
| --- | --- |
| `investigationConfigs` | `lib/investigation.ts` |
| `diagnosisConfigs` | `lib/diagnosis.ts` |
| `fixConfigs` | `lib/fix.ts` |
| `verificationConfigs` | `lib/verification.ts` |
| `resultsConfigs` | `lib/results.ts` |

Nothing else needs to be switched on. `PLAYABLE_MISSION_IDS`, the recommended mission, the next
mission, the mission browser, the map, the skills page and the "N of M playable" summary all derive
from it.

The checklist for a new mission:

1. Add the mission to `MISSIONS` in `lib/missions.ts` with an authored `status` — `available`,
   `locked`, `in-development` or `coming-soon`. Never `current` or `completed`: those are facts
   about a *player* and are derived by `missionAvailability()` from the progression ledger.
2. Set `rewardSkillId` to a stable id from `lib/skills.ts`, and add the mission id to the
   `missionIds` of any other skill it exercises — that is how supporting skill XP gets credited.
3. Author the five stage configs and register them.
4. Run `npm run validate:missions`, then `npm run test`.

Step 4 is not a formality. `tests/mission-flows-all.test.ts` parameterises over
`PLAYABLE_MISSION_IDS`, so a newly registered mission automatically inherits the full contract —
five root causes, five fixes with exactly one resolving, key evidence spanning at least three tools,
and the perfect / wrong / hint / replay flows all behaving. If any of it fails, the mission is not
finished.

## Architecture

```
app/
  layout.tsx           Root layout: fonts, metadata, <ProgressProvider/>
  page.tsx             Landing page
  start/               Onboarding wizard (4 steps)
  dashboard/           Player home
  missions/            Mission browser
  missions/map/        Chapter map
  missions/[missionId]/briefing|investigation|diagnosis|fix|verification|results/
  skills/ achievements/ leaderboards/ settings/
  sign-in/             Real GitHub OAuth · demo/ is still a placeholder
  auth/callback|sign-out/  OAuth code exchange, sign-out (POST only)
  api/runs/            THE TRUST BOUNDARY — grade a run and record it
  api/ledger/          GET the derived ledger · POST an active day
  api/claim/           One-time import of a pre-account local ledger
  api/leaderboard/     Real standings, signed-in players only

components/
  <landing sections>   Header, HeroSection, GamePreview, ComparisonSection, HowItWorks,
                       MissionPreview, SkillsGrid, CareerPath, FinalCTA, Footer
  ui/                  Logo, Reveal, AvailabilityBadge, CodeText
  auth/SignInCard      GitHub sign-in
  progress/            ProgressProvider — one ledger for the whole app, fetched from the server
                       ClaimProgressBanner — the one-time import offer
  missions/StageGate   Client-side stage prerequisite guard
  dashboard/ onboarding/ missions/ skills/ achievements/ leaderboards/ settings/

lib/
  missions.ts          Mission catalogue, chapters, tracks, flow, briefing resolution
  availability.ts      Canonical "can the player do this yet?" model
  progress.ts          The ledger's shape and pure maths: XP curve, levels, ranks, streaks
  run.ts               Per-mission run telemetry: start time, stages completed, hints opened
  grading.ts           The grading engine. Takes the answers as an INPUT
  grade-submission.ts  Client: submit a run, cache the grade the server returned
  ledger-client.ts     Client: fetch the ledger, record an active day, claim a local one
  skills.ts            Canonical Node.js skill taxonomy
  stage-access.ts      Stage prerequisites (pure)
  mission-validation.ts Content validation rules (pure)
  code-theme.ts        Code tokenizer + editor-theme palettes (pure)
  investigation.ts diagnosis.ts fix.ts verification.ts results.ts
  dashboard.ts achievements.ts leaderboards.ts onboarding.ts settings.ts data.ts types.ts

lib/server/            ALL of these begin with `import "server-only"`
  answers.ts           THE SECRET — every mission's correct root cause, evidence and fix
  submission.ts        Parses untrusted submissions; bounds every field
  ledger.ts            Derives the Ledger from Postgres; stamps achievements
  claim.ts             Validates a pre-account ledger; re-derives every XP figure
  standings.ts         Derives the leaderboard from best_runs + players

lib/supabase/          env · client (browser) · server (session) · admin (service-role)

supabase/migrations/   0001_init.sql · 0002_claim_local_progress.sql

scripts/
  validate-missions.ts CLI wrapper around lib/mission-validation.ts
  tsconfig.json        Stubs `server-only` for the CLI only

tests/                 Vitest — pure domain logic and storage helpers
  helpers/mission-run  Shared harness: play a mission end to end in Node
  mission-flows-all    The contract every playable mission inherits
  chapter-two          Chapter 2 ordering and content-correctness tests
  chapter-three        Chapter 3 correctness, MVP closure, progression audit

e2e/                   Playwright — one mission through a real browser
  mission-flow.spec.ts Briefing → results, plus the results-URL guard

.github/workflows/
  ci.yml               Typecheck, lint, test, validate:missions, build (+ smoke job)
```

### Single sources of truth

These modules are canonical and should not be duplicated:

- **`lib/missions.ts`** — the mission catalogue, chapters and their `track` (`nodejs` | `future`).
  `MissionStatus` describes *content*, never a player.
- **`lib/availability.ts`** — whether a mission is `available`, `current`, `completed`, `locked`,
  `in-development` or `coming-soon` **for this player**. `hasFullContent()` derives playability from
  which stage configs exist. Every surface renders these states through
  `components/ui/AvailabilityBadge.tsx`.
- **`lib/progress.ts`** — the ledger's shape and the formulas over it (XP curve, levels, ranks,
  streaks). The *values* are derived in Postgres by `lib/server/ledger.ts`; a new player's ledger is
  genuinely empty, and `EMPTY_LEDGER` is a valid one rather than a placeholder.
- **`lib/grading.ts`** — the only place a score, an XP award or a `resolved` verdict is produced.
  It takes the answers as an argument, so only a route handler can actually grade anything.
- **`lib/server/answers.ts`** — the only place the correct answers exist.
- **`lib/skills.ts`** — the 20 Node.js skills across 4 categories. Referenced by stable `id`, never
  by display name. `lib/data.ts` holds landing-page marketing content only.

### Conventions

- **Server components render, client components hold state.** Each mission stage route is a server
  component that looks up static config and renders a `"use client"` workspace.
- **Static generation.** Stage routes export `generateStaticParams()` for every mission.
- **Icons cross the server→client boundary as string keys** (`ROOT_CAUSE_ICONS`, `FIX_ICONS`,
  `METRIC_ICONS`), because component functions aren't serializable as props.
- **Hydration-safe persistence.** Nothing reads `localStorage` during render: load in a `useEffect`
  after mount behind a `hydrated` flag, and only write once hydrated. `EMPTY_LEDGER` is the
  server-rendered state and a genuinely valid new-player one.
- **Nothing about a player is authored.** No fixture scores, XP totals, streaks, ranks, skill levels
  or completion history — and, since the leaderboard became real, no fictional players either.
  `validate:missions` fails a results config that reintroduces a score.
- **A control nothing can honour is worse than no control.** The light theme, `defaultLanguage`,
  `soundEffects` and the Friends/Country/Company leaderboard scopes were deleted rather than left
  as switches that did nothing.
- **The evidence is stored; the conclusion is derived.** There is no `total_xp` column, no stored
  rank and no stored streak — a stored total is a second source of truth that starts disagreeing
  with the runs behind it the moment anybody plays.

### Where data lives

Split by one question: **is it scored?**

**Postgres** — everything scored, written only by route handlers holding the service-role key:

| Table | Holds |
| --- | --- |
| `players` | Identity and preferences. No email column — `auth.users` is a join away |
| `mission_runs` | **Append-only.** Every graded run, plus `source` (`played` \| `claimed`) |
| `player_active_days` | Opening the app is activity — what a streak measures |
| `player_achievements` | Stamped on the crossing, so "unlocked 3 days ago" is true |
| `best_runs` (view) | The best run per player per mission — what the ledger sums |

RLS grants `SELECT` on your own rows and `UPDATE` on your own *profile columns only*. There is
deliberately **no insert policy on any scored table**, because RLS decides which *row* you may
touch, never which *values* you may write into it — which is exactly why grading can't live there.

**`localStorage`** — working state only, all namespaced `coderaid:`. None of it decides a number,
which is why a mission can be played without an account:

| Key | Shape |
| --- | --- |
| `coderaid:profile` | `{ name, avatarId, slogan, pathId, experienceId, step, completed }` |
| `coderaid:user-settings` | `{ codeEditorTheme, showLineNumbers }` |
| `coderaid:{missionId}:run` | `{ startedAt, lastActiveAt, stagesCompleted[], hintsUsed[] }` |
| `coderaid:{missionId}:investigation` | `{ activeTool, collectedEvidenceIds[] }` |
| `coderaid:{missionId}:diagnosis` | `{ rootCauseId, evidenceIds[], confirmed }` |
| `coderaid:{missionId}:fix` | `{ fixId, applied }` |
| `coderaid:{missionId}:verification` | `{ run, completed }` |
| `coderaid:{missionId}:results` | `{ claimed, score }` |
| `coderaid:{missionId}:grade` / `:credit` | The grade **the server returned**, and what the run added |

`coderaid:player:progress` still exists but **nothing writes it**. It is the pre-migration ledger,
shown read-only to a signed-out player who earned it before accounts existed, and cleared once
`POST /api/claim` imports it.

Best-run-wins is now a **query**, not a mutation: a better replay improves your standing, a worse one
changes nothing, and refreshing the results screen can't farm XP — properties that fall out of the
schema rather than being enforced by client code.

Every one of those eight per-mission keys is named in
[`lib/mission-storage.ts`](lib/mission-storage.ts), which is what makes the three resets exhaustive:

| Reset | Clears | Keeps |
| --- | --- | --- |
| A changed answer (`clearVerdict`) | `grade`, `credit`, `verification`, `results` | the answers, `run` |
| **Restart Investigation** (`clearInvestigationOnward`) | the above + `investigation`, `diagnosis`, `fix` | `run` — the clock spans the mission |
| **Run It Again** (`clearMissionWorkingState`) | all eight, including `run` | every recorded attempt |

None of them touch `mission_runs`. A replay adds an attempt; nothing in the browser can erase one.

Progress reset protects `coderaid:profile` and `coderaid:user-settings` and clears everything else in
the namespace. **Signed in, that clears saved stage state only** — runs are append-only, so earned XP
survives, and the dialog says exactly that instead of promising a reset it can't perform.

### Design system

- **Palette:** near-black navy surfaces (`base.*`) with purple (`violet.*`) and electric-blue
  (`electric.*`) accents, defined in [`tailwind.config.ts`](tailwind.config.ts).
- **Utilities:** `.surface` / `.surface-strong` (rounded, thin-bordered cards), `.chip`,
  `.text-gradient`, `.thin-scroll` in `globals.css`.
- **Motion:** entrance reveals are centralized in `ui/Reveal.tsx`; Framer Motion respects the user's
  reduced-motion preference.
- **Responsiveness:** multi-column grids collapse to single columns; the career rail and code/log
  panels scroll horizontally inside their own containers so the page body never scrolls sideways.

CodeRaid is dark-only, declared once as `:root { color-scheme: dark }`. There is no theme control:
every surface is hand-tuned dark, so an option would only have saved a value nothing rendered.

## Progression reachable from the current content

Clearing all 14 missions perfectly is worth **1,830 XP**, which lands a player at **level 6** and the
**Backend Apprentice** rank. These are audited by `tests/chapter-three.test.ts` rather than assumed,
and the thresholds below are documented as-is — nothing has been lowered to make them reachable.

| Signal | Reachable today | Note |
| --- | --- | --- |
| Player level | 6 (of an open-ended curve) | 1,830 XP total across the catalogue |
| Career rank | Node.js Explorer, Backend Apprentice | Node.js Developer needs 3,000 XP |
| Skill levels | 8+ skills reach the level-10 cap | `streams` and `validation` have no missions yet |
| Achievements | 8 of 12 | See below |

Unreachable from content alone, and why:

- **Backend Engineer Rank** — needs 10,000 XP; the whole catalogue is worth 1,830. This is a
  *content* gap, not a threshold problem: roughly 5× the current mission count would close it.
  Recommendation: leave the threshold alone and grow the catalogue.
- **Event Loop Master** — needs Event Loop at level 7 (280 skill XP), but `event-loop` is the primary
  reward of exactly one 80 XP mission. Recommendation: wire more missions to the skill rather than
  lowering the level requirement.
- **7-day / 30-day streak** — time-gated by design, not content-gated.

## Roadmap

1. Grow the catalogue so the XP-gated rank and the Event Loop skill achievement become reachable.
2. Mission unlocking, now that there is a full 14-mission order for it to mean something.
3. ~~Add a backend and authentication so progress survives a browser.~~ **Done** — Supabase, GitHub
   OAuth, server-side grading and a ledger derived from an append-only run history.
4. Cover the authenticated round trip in the gates. The Playwright suite still stops at the sign-in
   wall because it has no session; minting one in CI would let the graded path be tested rather
   than verified by hand.
5. Make the verification replay real. It is still a 1,400 ms timer — what it *reports* is derived,
   but nothing executes or measures anything.
6. Open the Databases, Caching, System Design and Cloud Reliability tracks.
