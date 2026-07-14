# CodeRaid — Landing Page

**Software Engineer Simulator.** Investigate production incidents, diagnose bugs, apply real fixes, and level up your backend engineering skills.

This repository contains the **CodeRaid marketing landing page** — a polished, presentation-ready front page. It does **not** include authentication, a dashboard, mission gameplay, or backend logic (those are future work). The interactive-looking mission panels are static, high-fidelity mockups.

## Tech stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Lucide** icons
- **Framer Motion** for subtle entrance/hover animations

## Getting started

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

Other scripts:

```bash
npm run build   # production build
npm run start   # serve the production build
npm run lint    # lint
```

## Architecture

The page is composed of small, single-responsibility React components assembled in [`app/page.tsx`](app/page.tsx). Repeated content (stats, steps, ranks, skills, benefits, nav) lives in typed data arrays so the markup stays declarative and easy to edit.

```
app/
  layout.tsx          # Root layout, fonts (Inter + JetBrains Mono), metadata
  page.tsx            # Assembles all landing sections in order
  globals.css         # Tailwind layers + reusable .surface / .chip / .text-gradient utilities
  start/  demo/  sign-in/   # Placeholder routes the CTAs link to

components/
  Header.tsx          # Sticky header, responsive nav + mobile menu
  HeroSection.tsx     # Hero copy, CTAs, tech tags
  GamePreview.tsx     # "The Slow API Incident" mission mockup (hero visual)
  StatsSection.tsx    # Compact game-stat cards
  HowItWorks.tsx      # 4 connected gameplay-loop steps
  MissionPreview.tsx  # Detailed N+1 query mission walkthrough
  CareerPath.tsx      # Rank progression path (Intern → Tech Lead)
  SkillsGrid.tsx      # Skill cards with progress bars
  BenefitsSection.tsx # 3 value-proposition cards
  FinalCTA.tsx        # Closing call-to-action
  Footer.tsx          # Brand, link columns, socials, copyright
  PlaceholderPage.tsx # Shared placeholder for /start, /demo, /sign-in
  ui/
    Reveal.tsx        # Framer Motion scroll-into-view wrapper (reduced-motion aware)
    SectionHeading.tsx# Consistent eyebrow + title + subtitle heading

lib/
  types.ts            # Shared TypeScript types
  data.ts             # Content data arrays (nav, stats, steps, ranks, skills, benefits)
```

### Design system

- **Palette:** near-black navy surfaces (`base.*`) with purple (`violet.*`) and electric-blue (`electric.*`) accents, defined in [`tailwind.config.ts`](tailwind.config.ts).
- **Reusable utilities:** `.surface` / `.surface-strong` (rounded, thin-bordered cards), `.chip` (technical pills), `.text-gradient` (accent text) in `globals.css`.
- **Motion:** entrance reveals are centralized in `ui/Reveal.tsx`; hover states use Tailwind transitions. Framer Motion respects the user's reduced-motion preference.

### Responsiveness

Layouts collapse from multi-column grids to stacked single columns on smaller screens. The hero stacks vertically, the career path becomes a horizontally scrollable track on mobile, and code/log panels scroll horizontally inside their own containers so the page body never scrolls sideways.

### Navigation

Header links use in-page anchors (`#how-it-works`, `#mission`, `#career`, `#skills`) with smooth scrolling and scroll-padding to clear the sticky header. CTAs point to placeholder routes (`/start`, `/demo`, `/sign-in`).
