"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock,
  FileText,
  Gauge,
  Lock,
  PlayCircle,
  Zap,
} from "lucide-react";
import {
  CATEGORIES,
  CHAPTERS,
  CURRENT_MISSION_ID,
  DIFFICULTIES,
  DIFFICULTY_BADGE,
  MISSIONS,
  TAG_BADGE,
  chapterProgress,
  type Category,
  type Difficulty,
  type Mission,
} from "@/lib/missions";

type CategoryFilter = "All" | Category;
type DifficultyFilter = "All" | Difficulty;

const STATUS_BADGE: Record<Mission["status"], { label: string; cls: string }> = {
  current: {
    label: "In Progress",
    cls: "border-violet-400/40 bg-violet-500/10 text-violet-300",
  },
  available: {
    label: "Available",
    cls: "border-electric-400/40 bg-electric-500/10 text-electric-300",
  },
  completed: {
    label: "Completed",
    cls: "border-emerald-400/40 bg-emerald-500/10 text-emerald-300",
  },
  locked: {
    label: "Locked",
    cls: "border-white/10 bg-white/[0.03] text-slate-400",
  },
};

export function MissionBrowser({ nextAction }: { nextAction: ReactNode }) {
  const [selectedId, setSelectedId] = useState(CURRENT_MISSION_ID);
  const [category, setCategory] = useState<CategoryFilter>("All");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("All");
  const [collapsed, setCollapsed] = useState<number[]>([]);

  const filtered = useMemo(
    () =>
      MISSIONS.filter(
        (m) =>
          (category === "All" || m.category === category) &&
          (difficulty === "All" || m.difficulty === difficulty),
      ),
    [category, difficulty],
  );

  const selected =
    MISSIONS.find((m) => m.id === selectedId) ?? MISSIONS[0];

  const toggleChapter = (id: number) =>
    setCollapsed((c) =>
      c.includes(id) ? c.filter((x) => x !== id) : [...c, id],
    );

  const visibleChapters = CHAPTERS.filter((ch) =>
    filtered.some((m) => m.chapterId === ch.id),
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

        {/* Chapters */}
        {visibleChapters.length === 0 ? (
          <div className="surface p-10 text-center text-sm text-slate-400">
            No missions match these filters.
          </div>
        ) : (
          visibleChapters.map((chapter) => {
            const Icon = chapter.icon;
            const rows = filtered.filter((m) => m.chapterId === chapter.id);
            const { done, total } = chapterProgress(chapter.id);
            const isOpen = !collapsed.includes(chapter.id);
            const complete = done === total;

            return (
              <div key={chapter.id} className="surface overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleChapter(chapter.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-white/[0.02]"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-violet-400/30 bg-violet-500/10 text-violet-300">
                      <Icon className="h-4 w-4" strokeWidth={1.9} />
                    </span>
                    <span className="shrink-0 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Chapter {chapter.id}
                    </span>
                    <span className="truncate text-sm font-semibold text-white">
                      {chapter.name}
                    </span>
                  </span>

                  <span className="flex shrink-0 items-center gap-3">
                    <span className="hidden text-xs text-slate-400 sm:block">
                      {done} / {total} completed
                    </span>
                    {complete ? (
                      <span className="grid h-6 w-6 place-items-center rounded-full border border-emerald-400/40 bg-emerald-500/15 text-emerald-300">
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </span>
                    ) : isOpen ? (
                      <ChevronUp className="h-4 w-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    )}
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-white/[0.06] p-2">
                    {rows.map((mission) => (
                      <MissionRow
                        key={mission.id}
                        mission={mission}
                        selected={mission.id === selectedId}
                        onSelect={() => setSelectedId(mission.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
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
              All missions are based on real engineering problems.
            </p>
            <p className="mt-1 text-xs text-slate-400">Solve. Learn. Level up.</p>
          </div>
        </div>
      </div>
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

function StatusMark({ status }: { status: Mission["status"] }) {
  if (status === "completed")
    return (
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-emerald-400/50 bg-emerald-500/20 text-emerald-300">
        <Check className="h-3 w-3" strokeWidth={3.5} />
      </span>
    );
  if (status === "current")
    return <PlayCircle className="h-5 w-5 shrink-0 text-violet-300" />;
  if (status === "locked")
    return <Lock className="h-4 w-4 shrink-0 text-slate-600" />;
  return <Circle className="h-5 w-5 shrink-0 text-slate-600" />;
}

function MissionRow({
  mission,
  selected,
  onSelect,
}: {
  mission: Mission;
  selected: boolean;
  onSelect: () => void;
}) {
  const locked = mission.status === "locked";
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
      <StatusMark status={mission.status} />
      <span className="w-5 shrink-0 text-xs text-slate-600">
        {mission.index}.
      </span>
      <span
        className={`min-w-0 flex-1 truncate text-sm ${
          locked ? "text-slate-500" : "text-slate-100"
        }`}
      >
        {mission.title}
      </span>

      <span
        className={`hidden shrink-0 rounded-md border px-2 py-0.5 text-[0.68rem] font-medium sm:block ${DIFFICULTY_BADGE[mission.difficulty]}`}
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

const SECONDARY_ACTION =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-white/25 hover:text-white";

function MissionRail({ mission }: { mission: Mission }) {
  const badge = STATUS_BADGE[mission.status];
  const locked = mission.status === "locked";
  const briefingHref = `/missions/${mission.id}/briefing`;
  const cta =
    mission.status === "current"
      ? "Continue Mission"
      : mission.status === "completed"
        ? "Replay Mission"
        : "Start Mission";

  return (
    <div className="surface p-5">
      <span
        className={`inline-flex rounded-md border px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.12em] ${badge.cls}`}
      >
        {badge.label}
      </span>

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

      {/* Actions — missions with a briefing route into the mission flow */}
      <div className="mt-5 space-y-2.5">
        {locked ? (
          <span className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-slate-500">
            <Lock className="h-4 w-4" /> Mission Locked
          </span>
        ) : (
          <Link href={briefingHref} className={PRIMARY_ACTION}>
            {cta}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}

        {/* The brief is always readable, even for locked missions. */}
        <Link href={briefingHref} className={SECONDARY_ACTION}>
          <FileText className="h-4 w-4" />
          View Mission Brief
        </Link>
      </div>
    </div>
  );
}

export { MissionRail };
