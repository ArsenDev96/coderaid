# CodeRaid — Current State of the Codebase

> **Purpose of this document.** A complete, self-contained snapshot of what exists in the CodeRaid
> repository as of 2026-07-20. It is written to be handed to a planning model (ChatGPT) that has
> **no access to the code**, so it can plan next steps without re-deriving anything. Everything
> below is verified against the source, not aspirational.
>
> **TL;DR:** CodeRaid is a Next.js 14 front-end prototype of a **Node.js backend debugging and
> interview-preparation simulator**. The MVP scope is *Node.js and JavaScript-runtime problems inside
> backend services only*. Databases, caching, system design and cloud reliability are visible as
> clearly marked **future tracks** — not playable, CTAs disabled, excluded from progress. The full UI
> surface exists (landing, onboarding, dashboard, mission browser + map, a 6-stage mission flow,
> skills, achievements, leaderboards, settings). **There is no backend, no database, no auth, no API
> layer.** All content is hand-authored TypeScript; all progression is `localStorage`.
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
| Tests | **Vitest 2** — `tests/`, 13 files, 425 tests, Node environment, `@/*` alias |
| Browser smoke | **Playwright 1.61** — `e2e/`, 2 Chromium tests against the production build |
| Lint | **ESLint 8 + `eslint-config-next`**, committed `.eslintrc.json` extending `next/core-web-vitals` |
| Content validation | `tsx scripts/validate-missions.ts` over `lib/mission-validation.ts` |

Scripts: `npm run dev | build | start | lint | typecheck | test | test:watch | validate:missions`.

Dev dependencies added in this pass: `eslint`, `eslint-config-next`, `vitest`, `tsx`,
`vite-tsconfig-paths`. No runtime dependency changed.

### Verified command results (re-run 2026-07-20, after the Chapter 2 pass)

| Command | Result |
| --- | --- |
| `npm run typecheck` | **passes clean**, no errors |
| `npm run lint` | **runs non-interactively** — "No ESLint warnings or errors" |
| `npm run test` | **425 passed** across 13 files |
| `npm run validate:missions` | **0 errors, 0 warnings** — 20 missions checked, 14 fully playable |
| `npm run build` | **succeeds**, "Compiled successfully", **134 static pages generated** |

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
  progress.ts                CANONICAL progression ledger: XP, levels, ranks, skill XP, streak
  grading.ts                 CANONICAL grading engine: scores a run against the authored answers
  run.ts                     Per-mission run telemetry: timing, stages completed, hints used
  skills.ts                  CANONICAL Node.js skill taxonomy
  stage-access.ts            Pure stage-prerequisite rules (what StageGate enforces)
  mission-validation.ts      Pure content-validation rules (what validate:missions runs)
  investigation.ts diagnosis.ts fix.ts verification.ts results.ts   Per-stage content + state
  dashboard.ts achievements.ts leaderboards.ts onboarding.ts settings.ts

scripts/
  validate-missions.ts       CLI wrapper: grouped output, non-zero exit on errors

tests/                       Vitest — pure domain logic + end-to-end mission flows
  grading  progress  availability  verification  skills  achievements
  leaderboards  mission-validation  settings  mission-flow

.eslintrc.json               next/core-web-vitals
vitest.config.ts             Node environment, @/* alias mirroring tsconfig
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
9. **Rules are pure, effects are components.** `lib/stage-access.ts` and `lib/mission-validation.ts`
   both hold only pure functions over plain data; the component (`StageGate`) and the CLI
   (`scripts/validate-missions.ts`) supply the `localStorage` reads and the process exit. That is
   what makes both directly testable in a Node environment.
10. **Nothing about a player may be authored.** No fixture score, XP total, streak, rank, skill
    level or completion history exists anywhere. The validator actively fails a results config that
    reintroduces a `score`, `xpEarned`, `duration` or `steps` field.

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

### Stage 3 — Diagnosis `/missions/[id]/diagnosis`
Single-select root cause + multi-select supporting evidence + a collapsible hint.
`canConfirm = rootCauseId != null && evidenceIds.length >= minimumEvidenceRequired` (2 on
`user-signup-latency-spike`, 3 on `event-loop-overload`). The confirm bar names the single missing
blocker. Opening the hint calls `recordHint(missionId, "diagnosis")` —
once, no matter how often it is toggled — and costs 5 points at grading time.
State: `{ rootCauseId, evidenceIds[], confirmed }`.
**`correctRootCauseId` and `correctEvidenceIds` are now read** — by `gradeMission()` (§14.2). The
gate is still permissive on purpose: the player commits to an answer here and finds out later,
which is how an incident actually works.

### Stage 4 — Fix `/missions/[id]/fix`
Single-select from 5 fix options (both playable missions author 5); selecting one swaps in an
explanation panel with bullets and a code example. The gate is still `Boolean(fixId)` — any option
can be applied — but which one is applied now decides everything downstream. Reaching the stage at
all requires a confirmed diagnosis (§15.3).
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
  and still `resolvesRootCause: false`, so only the worker path resolves.
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
  directly navigable, so a typed URL still reaches the "still being written" placeholder. For
  missions that *do* have content, `StageGate` (§15.3) now blocks a later stage whose prerequisite
  state doesn't exist — but that too is client-side consistency protection, not security, and the
  ledger remains editable from devtools.
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

Genuinely outstanding:

1. **No backend, no auth, no server-authoritative state.** Progress lives in one browser, and the
   ledger is trivially editable from devtools. This is the migration surface (§9).
2. **The leaderboard field is fictional.** The player's own row is real and really ranked, but the
   30 others are authored. Real standings need item 1.
3. **Content scale is still the bottleneck** — 6 of 14 Node.js missions are playable, and
   Chapters 2 and 3 hold the remaining 8. Every system above scales with content; nothing else is
   blocking.
4. **Skill-level achievements may be unreachable at current content volume.** "Event Loop Master"
   wants level 7 = 280 skill XP, and the one authored mission that builds it awards 80 at a perfect
   score. Chapter 1 improved this for `async-javascript`, `promises` and `error-handling`, and
   Chapter 2 does the same for `api-design`, `authentication` and `process-lifecycle`, which now
   have several missions behind them. It is a true statement about the catalogue, not a bug — it
   resolves itself as missions are written. `chapter-one-cleared` is genuinely achievable, and a
   Chapter 2 clear is now reachable the same way.
5. **The verification run is still a 1400ms timer.** What it *reports* is real; the replay is not.
6. No error boundaries, no loading states, no analytics.
7. ~~**No CI.**~~ **Resolved.** `.github/workflows/ci.yml` runs
   `typecheck → lint → test → validate:missions → build` on pushes to `main` and pull requests
   targeting it, on Node 20 with npm caching and no deployment step (§15.4).
8. **No component tests; browser coverage is one mission deep.** The Vitest suite covers pure logic
   and the full mission flows through the real modules against an in-memory `localStorage`. A
   Playwright Chromium smoke test now drives `event-loop-overload` from briefing to results through
   the real UI and checks that a directly typed results URL is blocked — but that is one mission of
   fourteen, and there are still no component-level tests.
9. ~~**`recommendedStartingMission("junior")` points at a mission in development.**~~ **Resolved.**
   All three onboarding suggestions — `event-loop-overload` (beginner), `promise-all-cascade`
   (junior) and `user-signup-latency-spike` (mid) — are fully authored and start without falling
   back. `tests/chapter-two.test.ts` pins all three, including that each suggestion's title matches
   the catalogue entry it names. The map is still a static literal rather than being derived from
   `recommendedMission()`; that remains an option, not a defect.
10. ~~**One known content warning** from the validator.~~ **Resolved.** `slow-api-incident`'s four
    missing stages were authored in the Chapter 3 pass, so the validator now reports **0 errors and
    0 warnings** across all 20 catalogued missions. (The earlier `user-signup-latency-spike` warning
    — a diagnosis evidence option, `no-errors-in-logs`, with no matching investigation evidence —
    had already been fixed by authoring the missing investigation item under the same id.)
11. **13 npm audit findings in the new dev dependency tree** (transitive, dev-only, mostly via
    `eslint-config-next` and vite). Nothing reaches the shipped bundle.

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
command.** All five commands in §2 run non-interactively and were run to produce the results recorded
there.

### 15.1 The test suite — `tests/`, Vitest, 425 tests

Node environment, no DOM, no component testing library. `vitest.config.ts` re-declares the `@/*`
alias so tests import modules exactly the way the app does. Anything needing `localStorage` supplies
an in-memory `Storage` (either injected, as `loadLedger(storage)` and `resetMissionProgress(storage)`
already allow, or via a `globalThis.window` shim in the flow tests).

| File | Covers |
| --- | --- |
| `grading.test.ts` | Correct/wrong diagnosis, partial and padded evidence, correct fix under a wrong diagnosis, wrong fix, unapplied fix, one and many hints, abandoned runs, score clamped to 0–100 across six combinations, XP derived from `mission.xp × score`, `resolved` only when the applied fix resolves, skill reward shares, `scoreBand` |
| `progress.test.ts` | Empty ledger, `xpForLevel`/`levelFromXp` inverted at **every** threshold 1–20, level progress, rank bands incl. top rank, skill levels and caps, first credit, idempotent re-credit, better replay adding only the difference, skill-XP top-up, worse replay never regressing, `totalXp` recomputed from records, legacy/corrupt/malformed ledgers resetting safely, streak behaviour across four cases, period XP and success rate, achievement stamping, reset preserving profile + settings |
| `availability.test.ts` | `hasFullContent` true/false, `PLAYABLE_MISSION_IDS` derived, available → current → completed from the ledger, future track always coming-soon, **every authored status is a content state**, a mission lying about being available still degrades, recommendation and `nextMissionId` never returning incomplete content, progress counting, chapter states |
| `verification.test.ts` | Both branches of `resolveVerification`, dependent vs independent checks, purity (the authored config is never mutated), and — across *every* playable mission — that a failed run fails at least one check and that exactly one fix option resolves |
| `skills.test.ts` | Zero start, primary vs supporting reward shares, unrelated skills uncredited, derived levels after crediting, unique ids, valid categories, mission back-references, `skillsToImprove` only suggesting actionable skills, category averages |
| `achievements.test.ts` | Nothing unlocked at zero, resolved-only counting, completed-but-unresolved, hint-free from real telemetry, skill-level achievements, `perfect-diagnosis` at exactly 100, timestamps stamped once and never moved, ordering, idempotent re-derivation |
| `leaderboards.test.ts` | New player ranked last rather than hidden, period XP from completion dates, mission count from records, success rate from resolved runs, focus from strongest category, the fictional roster unchanged by the player, real re-ranking per period, percentile floored at 1, ranks surviving filters |
| `settings.test.ts` | Option defaults valid, no SQL language offered, reset protecting identity/preferences and sweeping unknown stage keys, plus every stage-prerequisite rule |
| `mission-validation.test.ts` | The live catalogue has zero errors and agrees with `availability` about playability; a valid fixture passes; **37 invalid-fixture cases** (8 catalogue, 7 investigation, 5 diagnosis, 5 fix, 6 verification, 6 results) each breaking exactly one rule, so a failure names the rule it broke |
| `mission-flow.test.ts` | **The four flows, end to end through the real modules**, walked in detail for the reference mission — see below |
| `mission-flows-all.test.ts` | The same four flows plus a content contract, run against **every** playable mission via `describe.each(PLAYABLE_MISSION_IDS)` — see below |
| `chapter-three.test.ts` | Chapter 3 and the close of the MVP: the four missions are authored and available, the chapter reaches `complete` only when all four are, the Chapter 2 → Chapter 3 walk and the stop after `slow-api-incident`, `playableSummary()` deriving 14/0/14, the validator reporting zero warnings, `n-plus-one-carnage` staying non-playable — plus one content-correctness block per incident: a forced `global.gc()` and a bigger heap must not resolve a retained-reference leak, more workers must not resolve a queue backlog, a bigger pool must not resolve a connection leak, and an unrestricted `Promise.all()` must not resolve an N+1. Ends with a documented progression-and-achievement attainability audit |
| `chapter-two.test.ts` | Chapter 2 specifically: the five missions are authored and available, the chapter reaches `complete` only when all five are, the Chapter 1 → Chapter 2 walk and the stop at the content cliff, no Chapter 3 mission recommended while Chapter 2 is unfinished, all three onboarding suggestions playable without fallback, and one content-correctness block per mission — the JWT single-flight requirement and the fixes that must *not* resolve, the liveness/readiness split, the ordering of the shutdown drain sequence asserted against the code example, and the atomic rate-limit requirement including the in-memory mutex being insufficient |
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

- **Content**: at least five root causes and five fixes; exactly one fix with `resolvesRootCause`,
  matching `correctFixId`; key evidence spanning at least three different tools (so no single log
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
| Diagnosis | Unique root-cause and evidence ids; `correctRootCauseId` exists; ≥2 options; every `correctEvidenceId` exists and appears once; `minimumEvidenceRequired` positive and ≤ options; **the correct evidence set is large enough to satisfy the minimum** (else a perfect score is unreachable); non-empty hint and prompt |
| Fix | Unique option ids; at least one option resolves; `correctFixId` exists **and** resolves — the two must agree, because grading reads the flag and the UI teaches the id; non-empty title, description, explanation and code example per option |
| Verification | Unique metric and check ids; before/after/label/delta present; **at least one check depends on the fix**; success and unresolved logs both present; both summaries complete; chart series non-empty, equal-length, non-negative, positive `yMax`, `fixFraction` in 0–1; both request breakdowns non-empty with non-negative durations and a positive total (a warning if the spans exceed it) |
| Results | `missionId` matches the catalogue key; `skillImprovement.skillId` is canonical; lessons non-empty; both narratives complete; fix recap complete; metrics present with before/after and valid sparklines; `nextMissionId` resolves; **no obsolete `score` / `xpEarned` / `duration` / `steps` / `status` field** |
| Cross-stage | A diagnosis evidence option with no matching investigation evidence is a warning — the player could never have collected it |

Current output: **20 missions checked · 14 fully playable · 0 errors · 0 warnings**. The last
warning — `slow-api-incident`, partially authored — was closed by writing its remaining four stages
in the Chapter 3 pass. The earlier `user-signup-latency-spike` evidence warning had been fixed by
adding the matching `no-errors-in-logs` investigation item.

### 15.4 CI — `.github/workflows/ci.yml`

Runs on pushes to `main` and pull requests targeting `main`, on `ubuntu-latest` with Node 20 and
`actions/setup-node@v4`'s built-in npm cache. Steps, in order: `npm ci`, `npm run typecheck`,
`npm run lint`, `npm run test`, `npm run validate:missions`, `npm run build`. In-progress runs for
the same ref are cancelled. **There is no deployment step** — the workflow only verifies.

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
moment of blank. This is consistency protection for the front end, **not security**; there is no
server to enforce anything against.

---

*Updated 2026-07-20 — the "Chapter 3 complete" pass: `memory-leak-worker`, `worker-queue-backlog`,
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
