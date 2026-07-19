"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock,
  FileText,
  Gauge,
  Zap,
} from "lucide-react";
import {
  CATEGORIES,
  DIFFICULTIES,
  DIFFICULTY_BADGE,
  FUTURE_CHAPTERS,
  MISSIONS,
  NODE_CHAPTERS,
  NODE_MISSIONS,
  TAG_BADGE,
  isNodeMission,
  type Category,
  type Chapter,
  type Difficulty,
  type Mission,
} from "@/lib/missions";
import {
  blockedReason,
  canStart,
  chapterProgress,
  missionAvailability,
  recommendedMission,
} from "@/lib/availability";
import { useProgress } from "@/components/progress/ProgressProvider";
import { AvailabilityBadge, AvailabilityNote } from "@/components/ui/AvailabilityBadge";

type CategoryFilter = "All" | Category;
type DifficultyFilter = "All" | Difficulty;

const FUTURE_MISSIONS = MISSIONS.filter((m) => !isNodeMission(m));

export function MissionBrowser({ nextAction }: { nextAction: ReactNode }) {
  const { view } = useProgress();
  const [selectedId, setSelectedId] = useState(
    () => recommendedMission()?.id ?? NODE_MISSIONS[0]?.id ?? MISSIONS[0].id,
  );
  const [category, setCategory] = useState<CategoryFilter>("All");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("All");
  const [collapsed, setCollapsed] = useState<number[]>([]);

  // Only Node.js missions take part in category filtering — the future track is
  // a roadmap, never a filterable "available" set.
  const filtered = useMemo(
    () =>
      NODE_MISSIONS.filter(
        (m) =>
          (category === "All" || m.category === category) &&
          (difficulty === "All" || m.difficulty === difficulty),
      ),
    [category, difficulty],
  );

  // The roadmap region shows only when no Node.js category filter is applied,
  // so picking a category can never surface an unbuilt track as playable.
  const roadmap = useMemo(
    () =>
      category === "All"
        ? FUTURE_MISSIONS.filter(
            (m) => difficulty === "All" || m.difficulty === difficulty,
          )
        : [],
    [category, difficulty],
  );

  const selected = MISSIONS.find((m) => m.id === selectedId) ?? NODE_MISSIONS[0];

  const toggleChapter = (id: number) =>
    setCollapsed((c) =>
      c.includes(id) ? c.filter((x) => x !== id) : [...c, id],
    );

  const visibleChapters = NODE_CHAPTERS.filter((ch) =>
    filtered.some((m) => m.chapterId === ch.id),
  );
  const visibleFutureChapters = FUTURE_CHAPTERS.filter((ch) =>
    roadmap.some((m) => m.chapterId === ch.id),
  );

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      {/* Left column */}
      <div className="flex min-w-0 flex-col gap-5">
        {nextAction}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <FilterPill
            label="All"
            active={category === "All"}
            onClick={() => setCategory("All")}
          />
          {CATEGORIES.map((c) => (
            <FilterPill
              key={c}
              label={c}
              active={category === c}
              onClick={() => setCategory(c)}
            />
          ))}

          <div className="relative ml-auto">
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as DifficultyFilter)}
              aria-label="Filter by difficulty"
              className="appearance-none rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-4 pr-9 text-sm font-medium text-slate-200 outline-none transition-colors hover:border-white/20 focus:border-violet-400/60"
            >
              <option value="All" className="bg-base-900">
                All Difficulties
              </option>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d} className="bg-base-900">
                  {d}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          </div>
        </div>

        {/* Node.js chapters */}
        {visibleChapters.length === 0 ? (
          <div className="surface p-10 text-center text-sm text-slate-400">
            No Node.js missions match these filters.
          </div>
        ) : (
          visibleChapters.map((chapter) => (
            <ChapterSection
              key={chapter.id}
              chapter={chapter}
              rows={filtered.filter((m) => m.chapterId === chapter.id)}
              open={!collapsed.includes(chapter.id)}
              onToggle={() => toggleChapter(chapter.id)}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          ))
        )}

        {/* Roadmap — future tracks, visible but never playable */}
        {visibleFutureChapters.length > 0 && (
          <section
            aria-labelledby="missions-coming-soon"
            className="flex flex-col gap-5 border-t border-white/[0.06] pt-6"
          >
            <div className="flex flex-wrap items-center gap-3">
              <h2
                id="missions-coming-soon"
                className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400"
              >
                Coming Soon
              </h2>
              <AvailabilityBadge status="coming-soon" />
              <AvailabilityNote status="coming-soon" className="w-full sm:w-auto" />
            </div>

            {visibleFutureChapters.map((chapter) => (
              <ChapterSection
                key={chapter.id}
                chapter={chapter}
                rows={roadmap.filter((m) => m.chapterId === chapter.id)}
                open={!collapsed.includes(chapter.id)}
                onToggle={() => toggleChapter(chapter.id)}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            ))}
          </section>
        )}
      </div>

      {/* Right rail */}
      <div className="flex flex-col gap-4 xl:sticky xl:top-24 xl:self-start">
        <MissionRail mission={selected} />
        <div className="surface flex items-start gap-3 p-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-violet-400/25 bg-violet-500/10 text-violet-300">
            <Zap className="h-5 w-5" fill="currentColor" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-snug text-white">
              Every mission is a real Node.js backend incident.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Investigate. Diagnose. Ship the fix.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- Chapter section --------------------------- */

function ChapterSection({
  chapter,
  rows,
  open,
  onToggle,
  selectedId,
  onSelect,
}: {
  chapter: Chapter;
  rows: Mission[];
  open: boolean;
  onToggle: () => void;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const Icon = chapter.icon;
  const { view } = useProgress();
  const future = chapter.track === "future";
  const { done, total } = chapterProgress(chapter.id, view);
  const complete = !future && total > 0 && done === total;

  return (
    <div className={`surface overflow-hidden ${future ? "opacity-80" : ""}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-white/[0.02]"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${
              future
                ? "border-white/10 bg-white/[0.02] text-slate-500"
                : "border-violet-400/30 bg-violet-500/10 text-violet-300"
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={1.9} />
          </span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="shrink-0 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Chapter {chapter.id}
              </span>
              <span className="truncate text-sm font-semibold text-white">
                {chapter.name}
              </span>
              {future && <AvailabilityBadge status="coming-soon" />}
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-slate-500">
              {chapter.description}
            </span>
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-3">
          <span className="hidden text-xs text-slate-400 sm:block">
            {future ? "Not counted toward progress" : `${done} / ${total} completed`}
          </span>
          {complete ? (
            <span className="grid h-6 w-6 place-items-center rounded-full border border-emerald-400/40 bg-emerald-500/15 text-emerald-300">
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
          ) : open ? (
            <ChevronUp className="h-4 w-4 text-slate-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-500" />
          )}
        </span>
      </button>

      {open && (
        <div className="border-t border-white/[0.06] p-2">
          {rows.map((mission) => (
            <MissionRow
              key={mission.id}
              mission={mission}
              selected={mission.id === selectedId}
              onSelect={() => onSelect(mission.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Filter pill ----------------------------- */

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "border border-violet-400/50 bg-violet-500/15 text-white"
          : "border border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

/* ------------------------------ Mission row ----------------------------- */

function MissionRow({
  mission,
  selected,
  onSelect,
}: {
  mission: Mission;
  selected: boolean;
  onSelect: () => void;
}) {
  const { view } = useProgress();
  const availability = missionAvailability(mission, view);
  const muted = availability === "locked" || availability === "coming-soon";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
        selected
          ? "border border-violet-400/60 bg-violet-500/[0.08]"
          : "border border-transparent hover:bg-white/[0.03]"
      }`}
    >
      <span className="w-5 shrink-0 text-xs text-slate-600">
        {mission.index}.
      </span>
      <span
        className={`min-w-0 flex-1 truncate text-sm ${
          muted ? "text-slate-500" : "text-slate-100"
        }`}
      >
        {mission.title}
      </span>

      <AvailabilityBadge status={availability} className="hidden shrink-0 sm:inline-flex" />

      <span
        className={`hidden shrink-0 rounded-md border px-2 py-0.5 text-[0.68rem] font-medium md:block ${DIFFICULTY_BADGE[mission.difficulty]}`}
      >
        {mission.difficulty}
      </span>

      <span className="hidden w-16 shrink-0 items-center gap-1 text-xs text-slate-400 md:flex">
        <Clock className="h-3.5 w-3.5 shrink-0" /> {mission.minutes} min
      </span>

      <span className="w-16 shrink-0 text-right text-sm font-semibold text-violet-300">
        +{mission.xp} XP
      </span>
    </button>
  );
}

/* ------------------------------ Mission rail ---------------------------- */

const PRIMARY_ACTION =
  "group inline-flex w-full items-center justify-center gap-2 rounded-xl border border-violet-400/40 bg-gradient-to-r from-violet-600 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-neon transition-transform hover:scale-[1.02]";

const DISABLED_ACTION =
  "inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-slate-500";

const SECONDARY_ACTION =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-white/25 hover:text-white";

const DISABLED_LABEL: Record<string, string> = {
  locked: "Mission Locked",
  "in-development": "In Development",
  "coming-soon": "Coming Soon",
  completed: "Review Unavailable",
};

function MissionRail({ mission }: { mission: Mission }) {
  const { view } = useProgress();
  const availability = missionAvailability(mission, view);
  const blocked = blockedReason(mission, view);
  const startable = canStart(mission, view);
  const briefingHref = `/missions/${mission.id}/briefing`;
  const cta =
    availability === "current"
      ? "Continue Mission"
      : availability === "completed"
        ? "Replay Mission"
        : "Start Mission";

  return (
    <div className="surface p-5">
      <AvailabilityBadge status={availability} size="md" />

      <h2 className="mt-3 text-xl font-bold leading-tight text-white">
        {mission.title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">
        {mission.description}
      </p>

      <div className="mt-4 flex items-center gap-5 text-sm">
        <span className="flex items-center gap-1.5">
          <BarChart3 className="h-4 w-4 text-amber-400" />
          <span className="font-medium text-amber-300">{mission.difficulty}</span>
        </span>
        <span className="flex items-center gap-1.5 text-slate-400">
          <Clock className="h-4 w-4 text-slate-500" /> {mission.minutes} min
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {mission.tags.map((tag) => (
          <span
            key={tag}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
              TAG_BADGE[tag] ?? "border-white/10 bg-white/[0.03] text-slate-300"
            }`}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Objectives */}
      <div className="mt-6 border-t border-white/[0.06] pt-4">
        <div className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Objectives
        </div>
        <ul className="mt-3 space-y-2.5">
          {mission.objectives.map((o) => (
            <li key={o.text} className="flex items-start gap-2.5 text-sm">
              {o.done ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" strokeWidth={3} />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
              )}
              <span className={o.done ? "text-slate-200" : "text-slate-500"}>
                {o.text}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Rewards */}
      <div className="mt-5 border-t border-white/[0.06] pt-4">
        <div className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Rewards
        </div>
        <div className="mt-3 flex items-center gap-5">
          <span className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-violet-400/30 bg-violet-500/10 text-violet-300">
              <Zap className="h-4 w-4" fill="currentColor" />
            </span>
            +{mission.xp} XP
          </span>
          <span className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-electric-400/30 bg-electric-500/10 text-electric-300">
              <Gauge className="h-4 w-4" />
            </span>
            {mission.rewardSkill}
          </span>
        </div>
      </div>

      {/* Actions — only fully authored missions link into the flow */}
      <div className="mt-5 space-y-2.5">
        {startable ? (
          <Link href={briefingHref} className={PRIMARY_ACTION}>
            {cta}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ) : (
          <>
            <button
              type="button"
              disabled
              aria-describedby={`rail-note-${mission.id}`}
              className={DISABLED_ACTION}
            >
              {DISABLED_LABEL[availability] ?? "Unavailable"}
            </button>
            <div id={`rail-note-${mission.id}`}>
              <AvailabilityNote
                status={availability}
                note={blocked}
                className="px-1"
              />
            </div>
          </>
        )}

        {/* The brief is always readable — it never enters an unwritten stage. */}
        <Link href={briefingHref} className={SECONDARY_ACTION}>
          <FileText className="h-4 w-4" />
          View Mission Brief
        </Link>
      </div>
    </div>
  );
}

export { MissionRail };
