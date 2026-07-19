# CodeRaid — Current State of the Codebase

> **Purpose of this document.** A complete, self-contained snapshot of what exists in the CodeRaid
> repository as of 2026-07-19. It is written to be handed to a planning model (ChatGPT) that has
> **no access to the code**, so it can plan next steps without re-deriving anything. Everything
> below is verified against the source, not aspirational.
>
> **TL;DR:** CodeRaid is a Next.js 14 front-end prototype of a **Node.js backend debugging and
> interview-preparation simulator**. The product was just repositioned: the MVP scope is *Node.js and
> JavaScript-runtime problems inside backend services only*. Databases, caching, system design and
> cloud reliability are visible as clearly marked **future tracks** — not playable, CTAs disabled,
> excluded from progress. The full UI surface exists (landing, onboarding, dashboard, mission browser
> + map, a 6-stage mission flow, skills, achievements, leaderboards, settings). **There is no backend,
> no database, no auth, no API layer.** All content is hand-authored TypeScript; all progression is
> `localStorage`. **Exactly 1 of 20 missions is playable end to end**, but that one is now a real
> simulator: **answers are graded** against the authored correct root cause, evidence and fix, and
> **all progression is earned** — XP, level, rank, streak, per-skill XP, completed missions and
> achievement unlock times all derive from runs the player actually finished. A new player starts at
> zero. See §14 for the progression and grading model.

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
| Framework | Next.js **14.2.5**, App Router |
| Language | TypeScript 5.5, `strict: true`, path alias `@/*` → repo root |
| UI | React 18.3, Tailwind CSS 3.4 |
| Icons | `lucide-react` |
| Animation | `framer-motion` (reduced-motion aware) |
| Fonts | `next/font/google` — Inter (`--font-inter`), JetBrains Mono (`--font-jetbrains`) |
| Backend | **none** — zero `route.ts`, zero server actions, zero DB, zero auth |
| Tests | **none** — no test runner, no test files |
| Lint | script exists (`next lint`) but **ESLint is not installed** |

Scripts: `npm run dev | build | start | lint`. 150 tracked files; 143 `.ts`/`.tsx` files across
`app/`, `components/`, `lib/`.

### Verified build facts (run 2026-07-19)

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` | **passes clean**, no errors |
| `npm run build` | **succeeds**, "Compiled successfully", **134 static pages generated** |
| `npm run lint` | **not runnable** — ESLint was never installed in this repo, so `next lint` drops into an interactive setup prompt instead of linting |

The 134 pages = 20 missions × 6 stage routes (120) + the landing, onboarding, dashboard, missions,
skills, achievements, leaderboards, settings, sign-in, demo and framework pages. `/missions/map` is
the only dynamically rendered route.

---

## 3. Repository layout

```
app/
  layout.tsx                 Root layout: fonts, metadata, <SettingsEffects/>, <ProgressProvider/>
  globals.css                Tailwind layers + .surface / .chip / .text-gradient utilities
  page.tsx                   Marketing landing page
  start/                     Onboarding wizard (4 steps)
  sign-in/  demo/            Placeholder routes (PlaceholderPage)
  dashboard/                 Player home
  missions/                  Mission browser
  missions/map/              Mission map (chapter rail + details panel)
  missions/[missionId]/briefing|investigation|diagnosis|fix|verification|results/
  skills/  achievements/  leaderboards/  settings/

components/
  <landing sections>         Header, HeroSection, GamePreview, ComparisonSection, HowItWorks,
                             MissionPreview, SkillsGrid, CareerPath, FinalCTA, Footer,
                             PlaceholderPage
  ui/                        Logo, Reveal, AvailabilityBadge (+ AvailabilityNote)
  progress/                  ProgressProvider — hydrates the ledger, useProgress()
  dashboard/                 DashboardShell, DashboardSidebar, DashboardTopBar, DashboardGreeting,
                             NextAction, DailyRaid, CareerProgress, RecommendedMissions,
                             SkillsSummary, usePlayer
  onboarding/                OnboardingWizard, OnboardingAside
  missions/                  MissionBrowser, MissionsHeader, MissionsNextAction
  missions/map/              MissionMapView, MissionDetailsPanel, useMissionResume
  missions/briefing|investigation|diagnosis|fix|verification|results/
  skills/                    SkillsExplorer, SkillCard, SkillDetailDrawer, SkillFilters,
                             SkillRadar, SkillSummaryBar, SkillsAside, FutureTracks
  achievements/ leaderboards/ settings/

lib/
  types.ts data.ts           Landing-page types + marketing content
  missions.ts                Mission catalogue, chapters, tracks, flow, briefing resolution
  availability.ts            CANONICAL gating model (playability, CTAs, progress, PlayerView)
  progress.ts                CANONICAL progression ledger: XP, levels, ranks, skill XP, streak
  grading.ts                 CANONICAL grading engine: scores a run against the authored answers
  run.ts                     Per-mission run telemetry: timing, stages completed, hints used
  skills.ts                  CANONICAL Node.js skill taxonomy
  investigation.ts diagnosis.ts fix.ts verification.ts results.ts   Per-stage content + state
  dashboard.ts achievements.ts leaderboards.ts onboarding.ts settings.ts
```

---

## 4. Architecture principles currently in force

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
now `in-development`, which is what they actually are.

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
| `PLAYABLE_MISSION_IDS` | const | `NODE_MISSIONS.filter(hasFullContent)` → currently `["user-signup-latency-spike"]` |
| `missionAvailability(mission, view?)` | fn | future-track chapter → `coming-soon`; authored `coming-soon` / `locked` → as authored; **lacking full content → `in-development`**; **in the ledger → `completed`**; **started but unfinished → `current`**; otherwise `available`. |
| `canStart(mission, view?)` | fn | Not coming-soon, locked or in-development, **and** `hasFullContent`. |
| `canReview(mission, view?)` | fn | Completed *and* content exists — which now always holds, since completion can only come from a real run. |
| `blockedReason(mission, view?)` | fn | Copy for a CTA that must stay disabled, or `null`. The old "Mission review is being prepared." special case is gone with the fake completions. |
| `recommendedMission(view?)` | fn | The mission to open next: Node.js track, fully playable, preferring one the player has **started**, then one they haven't finished. Can never dead-end. |
| `nextMissionId(currentId, view?)` | fn | Next mission by index that `canStart` and the player hasn't completed; `undefined` when nothing playable remains. |
| `playableSummary()` | fn | `{ playable, inDevelopment, total }` over `NODE_MISSIONS` → currently `{ 1, 13, 14 }`. Player-independent. |
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
disabled, labelled button with an `AvailabilityNote` whenever `canStart` is false — today 19 of 20.
"Start Investigation" calls `touchRun()` + `completeStage("Briefing")`: this is where the clock starts.

### Stage 2 — Investigation `/missions/[id]/investigation`
Five tools (`logs`, `metrics`, `code`, `database`, `trace`); each mission enables a subset. Rows that
carry an `evidenceId` are selectable; "Mark as Evidence" batches, de-duplicates, and commits the
selection to the collected-evidence rail. A key-clue counter gates progression:
`keyCollected >= min(requiredKeyClues, #keyEvidence)` (`requiredKeyClues: 3`) before "Continue to
Diagnosis" appears; following it records `completeStage("Investigation")`.
State: `{ activeTool, collectedEvidenceIds[] }`.

### Stage 3 — Diagnosis `/missions/[id]/diagnosis`
Single-select root cause + multi-select supporting evidence + a collapsible hint.
`canConfirm = rootCauseId != null && evidenceIds.length >= minimumEvidenceRequired` (2). The confirm
bar names the single missing blocker. Opening the hint calls `recordHint(missionId, "diagnosis")` —
once, no matter how often it is toggled — and costs 5 points at grading time.
State: `{ rootCauseId, evidenceIds[], confirmed }`.
**`correctRootCauseId` and `correctEvidenceIds` are now read** — by `gradeMission()` (§14.2). The
gate is still permissive on purpose: the player commits to an answer here and finds out later,
which is how an incident actually works.

### Stage 4 — Fix `/missions/[id]/fix`
Single-select from 5 fix options; selecting one swaps in an explanation panel with bullets and a code
example. The gate is still `Boolean(fixId)` — any option can be applied — but which one is applied
now decides everything downstream.
State: `{ fixId, applied }`.
The "Confirmed Root Cause" card shows **the player's own diagnosis**, read back from the saved
diagnosis state, falling back to the authored line only when nothing was saved. Choosing a fix for
a cause you didn't pick would be incoherent.

### Stage 5 — Verification `/missions/[id]/verification`
Phase machine `idle → running → done`. "Run Verification" still fires a `setTimeout(1400ms)` — there
is no backend to replay traffic against — but **what it reports is derived**:
`resolveVerification(config, fixResolves)` reads the player's saved fix, and when it doesn't resolve
the root cause the metrics hold at their "before" values, the chart's after-line matches its
before-line, the request breakdown still shows the slow span on the critical path, the logs are the
pre-fix logs, and every check with `dependsOnFix !== false` fails. Checks about unrelated subsystems
stay true either way. Reaching `done` records `completeStage("Verification")`.
State: `{ run, completed }`.

### Stage 6 — Results `/missions/[id]/results`
On mount: `completeStage("Complete")`, then `gradeMission()` over the saved diagnosis, fix and run
telemetry, then `creditRun()` into the ledger — best-run-wins, so a refresh cannot farm XP. Shows
the real score with its **full breakdown**, the real XP earned, the real elapsed time, the real
stage count, per-skill XP gains with before/after levels, and a narrative chosen by the verdict
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
| 1 | `event-loop-overload` | Event Loop Overload | Easy | 20 | 80 | in-development | **In Development** | disabled |
| 2 | `promise-all-cascade` | Promise.all Failure Cascade | Easy | 25 | 100 | in-development | **In Development** | disabled |
| 3 | `async-map-trap` | The Async Map Trap | Easy | 25 | 100 | in-development | **In Development** | disabled |
| 4 | `overlapping-scheduler-runs` | Overlapping Scheduler Runs | Medium | 30 | 120 | in-development | **In Development** | disabled |
| 5 | `unhandled-rejection-storm` | Unhandled Rejection Storm | Hard | 35 | 140 | in-development | **In Development** | disabled |
| 6 | **`user-signup-latency-spike`** | User Signup Latency Spike | Medium | 35 | 140 | current | **In Progress** | **playable end to end** |
| 7 | `jwt-session-expiry` | JWT Session Expiry Bug | Easy | 25 | 100 | in-development | **In Development** | disabled |
| 8 | `health-check-flapping` | Health Check Flapping | Medium | 30 | 120 | in-development | **In Development** | disabled |
| 9 | `graceful-shutdown-bug` | Graceful Shutdown Bug | Medium | 35 | 130 | in-development | **In Development** | disabled |
| 10 | `rate-limiter-race` | Rate Limiter Race Condition | Hard | 35 | 140 | in-development | **In Development** | disabled |
| 11 | `memory-leak-worker` | Memory Leak in Worker Pool | Hard | 40 | 160 | in-development | **In Development** | disabled |
| 12 | `worker-queue-backlog` | Worker Queue Backlog | Hard | 40 | 160 | in-development | **In Development** | disabled |
| 13 | `connection-pool-exhaustion` | Connection Pool Exhaustion | Hard | 40 | 160 | in-development | **In Development** | disabled |
| 14 | `slow-api-incident` | The Slow API Incident | Medium | 25 | 180 | in-development | **In Development** | disabled (investigation only) |
| 15 | `n-plus-one-carnage` | N+1 Query Carnage | Medium | 35 | 140 | coming-soon | **Coming Soon** | disabled |
| 16 | `index-miss-investigation` | Index Miss Investigation | Medium | 30 | 120 | coming-soon | **Coming Soon** | disabled |
| 17 | `db-deadlocks-checkout` | Database Deadlocks in Checkout | Hard | 50 | 200 | coming-soon | **Coming Soon** | disabled |
| 18 | `read-replica-lag` | Read Replica Lag | Hard | 45 | 180 | coming-soon | **Coming Soon** | disabled |
| 19 | `redis-cache-meltdown` | Redis Cache Meltdown | Hard | 40 | 160 | coming-soon | **Coming Soon** | disabled |
| 20 | `payment-service-meltdown` | Payment Service Meltdown | Expert | 90 | 500 | coming-soon | **Coming Soon** | disabled |

Missions 1–5 are chapter 1, 6–10 chapter 2, 11–14 chapter 3, 15–18 chapter 4, 19–20 chapter 5.
Every mission has 4 objectives, tags, an XP value and a `rewardSkill` string. Status and objective
completion are **static literals** — finishing a mission does not flip its status or unlock anything.
There are currently **no missions in the `locked` or `available` states**; the values remain
supported by the type and the UI.

### Playability, precisely

- **Playable end to end (1):** `user-signup-latency-spike` — the only id in all five stage registries.
- **In development (13):** the other 13 Node.js missions. This now includes the four that used to be
  authored `status: "completed"` (`event-loop-overload`, `promise-all-cascade`, `jwt-session-expiry`,
  `slow-api-incident`). They were a demo player's fake history: they advertised a Completed badge
  and a review CTA that was permanently disabled, and they inflated skills, achievements and chapter
  progress for someone who had never played them. They are now labelled with what they actually are.
  (`slow-api-incident` has an authored investigation but not the other four stages, so it still
  fails `hasFullContent`.)
- **Coming soon (6):** every mission in chapters 4 and 5 — the entire Databases and
  Caching/Distributed Systems tracks.

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
  looking at rows, and `"complete"` only when the player has finished every mission in it.
- `playableSummary()` → `{ playable: 1, inDevelopment: 13, total: 14 }`. Player-independent: it
  describes the catalogue, so it stays a module-level function.

### The content cliff

| Stage | Missions with authored content |
| --- | --- |
| Briefing | **20** (derived by `resolveBriefing`) |
| Investigation | **2** — `user-signup-latency-spike`, `slow-api-incident` |
| Diagnosis | **1** — `user-signup-latency-spike` |
| Fix | **1** |
| Verification | **1** |
| Results | **1** |

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
- **Results** — score 92, +140 XP, "14m 32s", 5/5 steps, 4 metrics with sparklines, 4 lessons,
  `skillImprovement { skill: "Request Performance", increase: 1 }`.

`slow-api-incident` has a parallel investigation (an N+1 query loop in `order.service.js`, 4 tools,
5 evidence items) and nothing after it.

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
rises only when a mission that lists it — or names it as its `rewardSkillId` — is completed.

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

**Unlock times are recorded, not authored.** The authored `unlockedAt` literals are gone;
`useAchievements()` derives the set, and `stampAchievements(ledger, ids)` writes an ISO timestamp
the first time an id crosses its threshold. A stamped time never moves on a later visit, so
"unlocked 2 days ago" is a fact. UI: hexagon SVG badges, category tabs with counts, a summary with
a 7-dot streak strip fed by the real streak, and "latest" / "next to unlock" aside.

Note the honest consequence: three skill-level achievements need level 7, and some skills have only
one authored mission behind them. Those stay locked until more content exists — which is a true
statement about the catalogue rather than something to paper over.

### Leaderboards — `lib/leaderboards.ts`

A **30-entry hardcoded roster of fictional players** — with no current-user row in it. The player's
own entry is built at render time by `currentPlayerEntry(ledger, username, avatarId)`:

- `level` from the XP curve, `xp` per period from `xpSince(ledger, 7 | 30)` and `totalXp`,
- `missions` per period from when each mission was actually completed,
- `successRate` from the share of their runs that resolved,
- `focus` from their strongest skill category, so the category filter tells the truth about them.

`rosterWith(me)` appends it and the whole field is ranked together, so **rank, percentile, period XP
and mission counts are genuinely theirs**. A new player ranks last with 0 XP at level 1 — not, as
before, row 4 at level 24. `useCurrentPlayerEntry()` returns null until the ledger hydrates, so the
server and first client paint agree.

Each roster entry's `focus` uses the skill category ids (`runtime` | `node-core` | `apis` |
`debugging`), and `CATEGORY_OPTIONS` derives from `SKILL_CATEGORIES`, so the filter can't drift from
the taxonomy. Scopes: global / friends / country (`Armenia`) / company (`Koreez`). Periods: week /
month (default) / all. Filters (category / difficulty / player scope incl. "similar level ±5",
measured against the player's **real** level) apply **after** ranking, so a displayed rank means a
true scope position; the podium is always the unfiltered top 3. Percentile uses
`TOTAL_PLAYERS = 12,480` for global scope.

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

`recommendedStartingMission(experienceId)` is new: `beginner` → `event-loop-overload`,
`junior` → `promise-all-cascade`, `mid` → `user-signup-latency-spike`, with an unknown-id fallback to
the beginner entry. The completion card runs that suggestion through `canStart` and swaps in
`recommendedMission()` when it isn't playable, with copy explaining that more incidents are being
written. Persists to `coderaid:profile`; `completed: true` swaps the wizard for a "You're all set"
card permanently (the only way back is the Settings profile section).

### Settings — `/settings`

- **Profile** — name + avatar, written into `coderaid:profile` while preserving onboarding fields;
  explicit Save button with a transient confirmation.
- **Experience** — auto-saving: `theme` (dark/light — *light is stored but not implemented*, shown
  with an inline notice), `codeEditorTheme` (5 options), `defaultLanguage`, `showLineNumbers`,
  `soundEffects`. **`LANGUAGE_OPTIONS` is now TypeScript + JavaScript only — `sql` was removed**,
  because database content is a future track and offering it would promise a language no mission is
  written in. Cross-tab sync via a custom `coderaid:settings-changed` event **and** the native
  `storage` event; `SettingsEffects` in the root layout applies `data-theme` + `color-scheme`.
- **Progress** — `resetMissionProgress(storage?)` behind an `alertdialog`. It sweeps every
  `coderaid:` key **except** `coderaid:profile` and `coderaid:user-settings`, collecting first and
  deleting after the loop (deleting mid-loop would reindex and skip entries), returns the number of
  keys removed, and the caller then `router.refresh()`es. The storage handle is injectable so the
  sweep is testable.

---

## 9. Persistence — the complete storage contract

Everything is `localStorage`. There is no network I/O of any kind.

| Key | Written by | Shape |
| --- | --- | --- |
| `coderaid:profile` | onboarding, settings profile | `{ name, avatarId, slogan, pathId, experienceId, step, completed }` |
| `coderaid:user-settings` | settings experience | `{ theme, codeEditorTheme, defaultLanguage, showLineNumbers, soundEffects }` |
| `coderaid:player:progress` | the results screen, via `creditRun` | **The progression ledger** — `{ version: 2, totalXp, skillXp: Record<skillId, number>, missions: Record<missionId, MissionRecord>, activeDays: string[], achievements: Record<achievementId, isoDate> }` |
| `coderaid:{missionId}:run` | every stage | `{ startedAt, lastActiveAt, stagesCompleted: MissionStage[], hintsUsed: string[] }` — the run telemetry the grade is computed from |
| `coderaid:{missionId}:investigation` | investigation | `{ activeTool, collectedEvidenceIds: string[] }` |
| `coderaid:{missionId}:diagnosis` | diagnosis | `{ rootCauseId, evidenceIds: string[], confirmed }` |
| `coderaid:{missionId}:fix` | fix | `{ fixId, applied }` |
| `coderaid:{missionId}:verification` | verification | `{ run, completed }` |
| `coderaid:{missionId}:results` | results | `{ claimed, score }` |

`MissionRecord` is `{ missionId, completedAt, completedOn, score, xpEarned, durationMs, hintsUsed,
resolved, attempts }` — the evidence behind every derived number, kept at the player's **best**
score per mission.

Two invariants are enforced on read (`parseLedger`), not trusted:

- `totalXp` is recomputed as the sum of the mission records, so a partial or hand-edited write can
  never leave the headline XP disagreeing with the history behind it.
- Anything without `version: 2` — corrupt JSON, or the old
  `{ xpFromMissions, skillPoints, claimedMissions }` shape — resets to `EMPTY_LEDGER` rather than
  throwing or half-loading.

Events, not storage keys: `coderaid:settings-changed` (settings sync) and `coderaid:progress-changed`
(fired after every ledger write, so every mounted view refreshes together; the native `storage`
event covers other tabs).

`resetMissionProgress()` sweeps the whole `coderaid:` namespace except `coderaid:profile` and
`coderaid:user-settings` — which now means it genuinely resets the player to zero XP, level 1, no
skills and no completed missions, keeping only who they are and how they like the app configured.

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

- **Grading.** `lib/grading.ts` scores the run against the authored answers: root cause 45,
  evidence 25 (a balanced F-score, so padding the case with irrelevant findings costs precision),
  fix 30, minus 5 per hint opened. A wrong diagnosis with a wrong fix now scores 0 and resolves
  nothing. XP earned is `mission.xp × score / 100`.
- **Verification measures something.** `resolveVerification()` branches on whether the applied fix
  actually resolves the root cause. A wrong fix reports unchanged metrics, the slow span still on
  the critical path, the pre-fix logs and failed checks — except checks about unrelated subsystems
  (`dependsOnFix: false`), which stay true either way.
- **Progression.** One ledger (`lib/progress.ts`, `coderaid:player:progress`, `version: 2`) holds
  total XP, per-skill XP, one record per completed mission, active days and achievement unlock
  times. XP → level → rank are formulas over it: `xpForLevel(L) = 50·L·(L−1)`, rank from
  `CAREER_RANKS.minXp`. Crediting keeps the best run per mission, so a refresh cannot farm XP and a
  worse replay cannot reduce progress.
- **Run telemetry.** `lib/run.ts` records when a mission was started, which stages were completed
  and which hints were opened — so score, elapsed time and step count are measured, not authored.
- **Skills accumulate.** `lib/skills.ts` authors definitions only (`SKILL_DEFS`); level, XP and
  progress are resolved against the ledger by `skillsFor(ledger)`. 40 XP per skill level, cap 10.
- **Achievements** derive from the ledger and stamp their real unlock time on first crossing.
  "Unassisted Debugger" now measures genuinely hint-free runs; the "Resolved" achievements count
  runs that actually resolved.
- **The player's leaderboard row** is built from their ledger by `currentPlayerEntry()` and
  re-ranked against the roster, so rank, percentile, period XP and mission counts are all real.

**Mocked or static:**
- All logs, metrics, traces, code, DB stats and chart series are hand-authored literals. They are
  the *scenario*; what is now dynamic is which of them the verification reports back.
- **The verification "run" is still a `setTimeout(1400ms)`.** Nothing executes or replays anything
  — but what it reports is derived from the player's fix rather than fixed in advance.
- **The other 12,479 leaderboard players are fictional.** Without a backend they have to be. The
  player's own row is not.
- Availability gating is client-side UI only; all 120 stage URLs are statically generated and
  directly navigable, so a typed URL still reaches the "still being written" placeholder.
- `DAILY_RAID` is copy only — now labelled Coming Soon with a disabled CTA and no XP figure, so it
  no longer advertises a reward the ledger could never credit.
- Light theme is selectable and stored but not implemented.
- `/sign-in` and `/demo` are placeholder pages. There is no auth.

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

Genuinely outstanding:

1. **No backend, no auth, no server-authoritative state.** Progress lives in one browser, and the
   ledger is trivially editable from devtools. This is the migration surface (§9).
2. **The leaderboard field is fictional.** The player's own row is real and really ranked, but the
   30 others are authored. Real standings need item 1.
3. **Content scale is still the bottleneck** — 1 of 14 Node.js missions is playable. Every system
   above now scales with content; nothing else is blocking.
4. **Skill-level achievements may be unreachable at current content volume.** "Event Loop Master"
   wants level 7, and only one authored mission builds that skill. This is a true statement about
   the catalogue, not a bug — it resolves itself as missions are written.
5. **No test runner is wired up.** A 45-check suite covering the XP curve, streaks, grading,
   ledger crediting, storage round-trips, skills, achievements, leaderboards and availability was
   written and run against this change, but it lives outside the repo and there is no `npm test`.
6. **ESLint is not installed**, so `npm run lint` cannot run; there is no lint gate.
7. **The verification run is still a 1400ms timer.** What it *reports* is real; the replay is not.
8. No error boundaries, no loading states, no analytics.

---

## 13. The gap between here and a real product

Items 2 and 3 of the previous list — the grading engine and a real progression model — are **done**
(§14). What remains, ordered roughly by how much each unblocks everything else:

1. **Content scale.** 13 of 14 Node.js MVP missions still need investigation / diagnosis / fix /
   verification / results content. `user-signup-latency-spike` defines the schema precisely, and
   `hasFullContent()` already makes authoring the single act that ships a mission. Everything built
   in this pass scales with content automatically: a new mission's `correct*` fields are graded, its
   `rewardSkillId` credits a real skill, and its completion moves the player, the leaderboard and
   the achievements without another line of wiring. The bottleneck is authoring volume, which argues
   for an authoring format (MDX/JSON/CMS) plus a validator rather than more hand-written TS literals.
2. **Backend + auth.** The ledger is honest but local and trivially editable from devtools:
   persistence beyond one browser, real leaderboards and server-authoritative progress all need it.
   The storage contract in §9 is the migration surface, and it maps cleanly — `Ledger` is already
   the shape a `players` row wants to be, and `MissionRecord` is already an append-only run log.
3. **Quality gates.** Install ESLint and wire `npm run lint`. Wire a test runner: a 45-check suite
   covering the XP curve, streaks, grading, ledger crediting, storage round-trips, skills,
   achievements, leaderboards and availability was written and run against this change (it caught a
   real bug — an abandoned run scoring 25 instead of 0 — before it shipped), but it lives outside
   the repo. The pure logic is now genuinely worth testing: `gradeMission`, `creditRun`,
   `levelFromXp`, `streakDays`, `parseLedger`, `missionAvailability`, `resolveVerification`,
   `achievementSources`, `currentPlayerEntry`, `resetMissionProgress`.
4. **Difficulty and pacing.** Now that scores are real, they can be tuned: the 45/25/30 weighting,
   the 5-point hint penalty, the XP curve and the 40-XP skill level are all first guesses,
   calibrated against a 14-mission catalogue and one playable mission. Real play data should move
   them.
5. **Ship the future tracks deliberately.** Databases and caching/distributed systems are already
   modelled end to end (`chapterTrack`, `FUTURE_CHAPTERS`, `FUTURE_TRACKS`, `FUTURE_SKILL_TRACKS`,
   `coming-soon` availability). Promoting a chapter is a `track` flip plus content — but only after
   the Node.js MVP is genuinely playable.
6. **Unlocking.** `locked` exists in `MissionStatus` and is currently unused. With real completion
   data, gating a mission behind finishing its predecessors is now a small change — deliberately not
   made yet, because with one playable mission it would hide the only thing there is to play.
7. **Polish.** Light theme, sign-in flow, error/loading states, and a real Daily Challenge (the card
   is honest about being unbuilt, but it is still a card advertising something that doesn't exist).

---

## 14. The progression and grading model

The organising rule: **the catalogue describes missions, the ledger describes the player, and
nothing authored is allowed to claim a player did something.** Where those used to be mixed —
`DEMO_PLAYER`, authored skill levels, `status: "completed"` on missions, a hardcoded leaderboard
row — the authored half was removed and the player half moved to the ledger.

### 14.1 The ledger — `lib/progress.ts`

`Ledger` is the single source of truth for earned progress. `EMPTY_LEDGER` is a *valid* ledger — a
brand-new player — which is what keeps the app server-renderable: the server renders the zero state
and the client re-renders with the real one after mount. Every consumer takes a `Ledger` (or a
`PlayerView`) argument and defaults to the empty one.

| Derived value | From |
| --- | --- |
| `levelFromXp(xp)` / `xpForLevel(L)` | `xpForLevel(L) = 50·L·(L−1)`. L2 = 100, L5 = 1,000, L10 = 4,500. Clearing all 14 Node.js missions perfectly is 1,830 XP → **level 6**. |
| `rankBand(xp)` | `CAREER_RANKS.minXp`, unchanged thresholds. |
| `streakDays(ledger)` | Consecutive `activeDays` ending today *or* yesterday. Opening the app marks today active. |
| `skillLevelFromXp(xp)` | 40 XP per level, capped at 10. |
| `bestScore` / `successRate` / `xpSince` / `missionsSince` | The mission records. |

`creditRun()` keeps the **best run per mission**: a replay that scores higher tops the award up to
the new total, a replay that scores the same or lower changes nothing. That makes crediting
idempotent — a refresh on the results screen cannot farm XP — while still rewarding a genuinely
better second attempt, and it means a bad replay can never reduce progress.

### 14.2 The grading engine — `lib/grading.ts`

| Component | Weight | Measured against |
| --- | --- | --- |
| Root cause | 45 | `correctRootCauseId` |
| Supporting evidence | 25 | Balanced F-score vs `correctEvidenceIds` — recall *and* precision, so padding the case costs marks |
| Fix applied | 30 | The chosen option's `resolvesRootCause`, and that it was actually applied |
| Hints | −5 each | `run.hintsUsed` |

`resolved` is true only when the applied fix resolves the root cause. `xpEarned` is
`mission.xp × score / 100`. Skill XP goes to the mission's `rewardSkillId` at full rate and to
every other skill listing the mission at 40%.

The results screen shows the working (`ScoreBreakdown`), reports the real elapsed time and stage
count, and switches its narrative, its "what you fixed" panel and its impact panel between the
resolved and unresolved cases. An unresolved run gets a "Run It Again" action.

### 14.3 The provider — `components/progress/ProgressProvider.tsx`

Mounted in the root layout. Hydrates the ledger and the onboarding identity once, exposes
`{ ledger, view, player, avatar, slogan, hydrated, update, refresh }` via `useProgress()`, and
listens for both `coderaid:progress-changed` (same tab) and `storage` (other tabs). `update()` does
a read-modify-write against storage rather than state, so two updates in one tick cannot drop each
other. Called outside a provider it returns the zero state, so no component can crash on it.

### 14.4 What this closed

Wrong diagnosis + wrong fix used to yield the same passing verification and the same 92/100 as a
perfect run. It now scores 0, resolves nothing, awards no XP, fails the verification checks that
depend on the fix, and unlocks no achievement. That single change is what makes the rest of the
product's claims — interview preparation, "not another coding quiz" — true rather than aspirational.


---

*Updated 2026-07-19 — the "real progress and data" pass: a grading engine, an earned
progression ledger, and an honest leaderboard row. Node.js-first MVP; databases, caching, system
design and cloud reliability remain visible, non-playable future tracks.*
