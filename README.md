# CodeRaid

**A realistic Node.js backend debugging and interview-preparation simulator.**

Master Node.js through realistic production incidents: investigate logs, metrics, traces and
backend code, diagnose the failure, apply a fix, and verify the result.

This repository is the **front-end MVP**. It has no backend, no authentication, no database and no
grading engine — all mission content is authored TypeScript and all progression is stored in the
browser's `localStorage`.

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
- **Lucide** icons
- **Framer Motion** for entrance/hover animations (reduced-motion aware)

## Getting started

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

```bash
npm run build   # production build
npm run start   # serve the production build
```

> `npm run lint` is wired to `next lint`, but ESLint has never been installed in this repo — the
> first run drops into Next.js's interactive setup prompt. Install `eslint` and `eslint-config-next`
> before using it.

## Mission content status

Only missions with complete end-to-end content are startable. Everything else renders a disabled CTA
with an explanation, so no player can reach an unwritten stage.

| State | Missions |
| --- | --- |
| **Playable** | `user-signup-latency-spike` |
| **Completed (demo history, review-only)** | `event-loop-overload`, `promise-all-cascade`, `jwt-session-expiry`, `slow-api-incident` |
| **In development** | 9 Node.js missions across chapters 1–3 |
| **Coming soon** | Chapter 4 Databases (4), Chapter 5 Caching and Distributed Systems (2) |

Chapters:

1. **Async JavaScript** — event loop, promises, async control flow
2. **Node.js APIs** — request handling, auth, health, shutdown
3. **Workers and Performance** — background jobs, worker pools, memory, connection pressure
4. *Databases* — coming soon
5. *Caching and Distributed Systems* — coming soon

## Mission flow

Every playable mission moves through six stages:

```
Briefing → Investigation → Diagnosis → Fix → Verification → Complete
```

Investigation offers five tools (logs, metrics, code, database, trace); the player collects evidence
until the key-clue threshold is met, then diagnoses a root cause, chooses a fix, runs verification
and lands on results.

> **Not yet implemented:** answer correctness is never evaluated. The `correctRootCauseId`,
> `correctEvidenceIds` and `correctFixId` fields are authored in the stage configs but no component
> reads them, so any diagnosis and any fix produce the same passing verification. Scoring, timing
> and hint tracking are also not implemented.

## Architecture

```
app/
  layout.tsx           Root layout: fonts, metadata, <SettingsEffects/>
  page.tsx             Landing page
  start/               Onboarding wizard (4 steps)
  dashboard/           Player home
  missions/            Mission browser
  missions/map/        Chapter map
  missions/[missionId]/briefing|investigation|diagnosis|fix|verification|results/
  skills/ achievements/ leaderboards/ settings/
  sign-in/ demo/       Placeholders — there is no auth

components/
  <landing sections>   Header, HeroSection, GamePreview, ComparisonSection, HowItWorks,
                       MissionPreview, SkillsGrid, CareerPath, FinalCTA, Footer
  ui/                  Logo, Reveal, AvailabilityBadge
  dashboard/ onboarding/ missions/ skills/ achievements/ leaderboards/ settings/

lib/
  missions.ts          Mission catalogue, chapters, tracks, flow, briefing resolution
  availability.ts      Canonical "can the player do this yet?" model
  skills.ts            Canonical Node.js skill taxonomy
  investigation.ts diagnosis.ts fix.ts verification.ts results.ts
  dashboard.ts achievements.ts leaderboards.ts onboarding.ts settings.ts data.ts types.ts
```

### Single sources of truth

Three modules are canonical and should not be duplicated:

- **`lib/missions.ts`** — the mission catalogue, chapters and their `track` (`nodejs` | `future`).
- **`lib/availability.ts`** — whether a mission is `available`, `current`, `completed`, `locked`,
  `in-development` or `coming-soon`. `hasFullContent()` derives playability from which stage configs
  exist, so authoring a mission's stages is the single act that makes it startable. Every surface
  renders these states through `components/ui/AvailabilityBadge.tsx`.
- **`lib/skills.ts`** — the 20 Node.js skills across 4 categories. Referenced by stable `id`, never
  by display name. `lib/data.ts` holds landing-page marketing content only.

### Conventions

- **Server components render, client components hold state.** Each mission stage route is a server
  component that looks up static config and renders a `"use client"` workspace.
- **Static generation.** Stage routes export `generateStaticParams()` for all 20 missions.
- **Icons cross the server→client boundary as string keys** (`ROOT_CAUSE_ICONS`, `FIX_ICONS`,
  `METRIC_ICONS`), because component functions aren't serializable as props.
- **Hydration-safe persistence.** Nothing reads `localStorage` during render: load in a `useEffect`
  after mount behind a `hydrated` flag, and only write once hydrated.

### Storage

All keys are namespaced `coderaid:` so progress reset can sweep them.

| Key | Shape |
| --- | --- |
| `coderaid:profile` | `{ name, avatarId, slogan, pathId, experienceId, step, completed }` |
| `coderaid:user-settings` | `{ theme, codeEditorTheme, defaultLanguage, showLineNumbers, soundEffects }` |
| `coderaid:player:progress` | `{ xpFromMissions, skillPoints, claimedMissions[] }` |
| `coderaid:{missionId}:investigation` | `{ activeTool, collectedEvidenceIds[] }` |
| `coderaid:{missionId}:diagnosis` | `{ rootCauseId, evidenceIds[], confirmed }` |
| `coderaid:{missionId}:fix` | `{ fixId, applied }` |
| `coderaid:{missionId}:verification` | `{ run, completed }` |
| `coderaid:{missionId}:results` | `{ claimed, skillBefore, skillAfter }` |

Settings reset protects `coderaid:profile` and `coderaid:user-settings` and clears everything else in
the namespace.

### Design system

- **Palette:** near-black navy surfaces (`base.*`) with purple (`violet.*`) and electric-blue
  (`electric.*`) accents, defined in [`tailwind.config.ts`](tailwind.config.ts).
- **Utilities:** `.surface` / `.surface-strong` (rounded, thin-bordered cards), `.chip`,
  `.text-gradient`, `.thin-scroll` in `globals.css`.
- **Motion:** entrance reveals are centralized in `ui/Reveal.tsx`; Framer Motion respects the user's
  reduced-motion preference.
- **Responsiveness:** multi-column grids collapse to single columns; the career rail and code/log
  panels scroll horizontally inside their own containers so the page body never scrolls sideways.

Light theme is selectable in settings and stored, but the light palette is not implemented yet — the
settings panel says so explicitly.

## Roadmap

1. Author stage content for the remaining Node.js missions.
2. Build a grading engine that reads the already-authored `correct*` fields, tracks hints and time,
   and produces a real score.
3. Replace the static progression with one player record and a real XP → level → rank model.
4. Add a backend and authentication so progress survives a browser.
5. Open the Databases, Caching, System Design and Cloud Reliability tracks.
