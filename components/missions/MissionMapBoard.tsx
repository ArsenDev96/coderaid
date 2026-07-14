"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  Gauge,
  Lock,
  Play,
  ShieldAlert,
  Skull,
  Star,
  Zap,
} from "lucide-react";
import {
  CHAPTERS,
  DIFFICULTY_COLORS,
  MISSIONS,
  RECOMMENDED_MISSION_ID,
  TAG_COLORS,
  missionsForChapter,
  type Chapter,
  type Mission,
} from "@/lib/missions";

export function MissionMapBoard() {
  const [selectedId, setSelectedId] = useState(RECOMMENDED_MISSION_ID);
  const selected = useMemo(
    () => MISSIONS.find((m) => m.id === selectedId) ?? MISSIONS[0],
    [selectedId],
  );

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[190px_minmax(0,1fr)_350px]">
      <ChapterRail activeChapterId={selected.chapterId} />

      {/* Board */}
      <div className="min-w-0 space-y-5">
        {CHAPTERS.map((chapter) => (
          <ChapterRow
            key={chapter.id}
            chapter={chapter}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        ))}
      </div>

      <MissionDetail mission={selected} />
    </div>
  );
}

/* ------------------------------ Chapter rail ---------------------------- */

function ChapterRail({ activeChapterId }: { activeChapterId: number }) {
  return (
    <div className="thin-scroll flex gap-3 overflow-x-auto pb-2 xl:flex-col xl:overflow-visible xl:pb-0">
      {CHAPTERS.map((chapter) => {
        const Icon = chapter.icon;
        const active = chapter.id === activeChapterId;
        const complete = chapter.pct === 100;
        return (
          <a
            key={chapter.id}
            href={`#chapter-${chapter.id}`}
            className={`block min-w-[15rem] shrink-0 rounded-2xl border p-4 transition-colors xl:min-w-0 ${
              chapter.boss
                ? "border-rose-500/25 bg-rose-950/20 hover:border-rose-500/40"
                : active
                  ? "border-violet-400/50 bg-violet-500/[0.08] shadow-neon"
                  : "border-white/[0.08] bg-white/[0.02] hover:border-white/20"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${
                  chapter.boss
                    ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                    : complete
                      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                      : "border-violet-500/25 bg-violet-500/10 text-violet-300"
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={1.9} />
              </span>
              <div className="min-w-0">
                <div className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Chapter {chapter.id}
                </div>
                <div className="truncate text-sm font-semibold text-white">
                  {chapter.name}
                </div>
              </div>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              {chapter.blurb}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={`h-full rounded-full ${
                    chapter.boss
                      ? "bg-rose-500"
                      : "bg-gradient-to-r from-electric-400 to-violet-500"
                  }`}
                  style={{ width: `${chapter.pct}%` }}
                />
              </div>
              <span className="font-mono text-[0.62rem] text-slate-500">
                {chapter.done}/{chapter.total}
              </span>
              <span className="font-mono text-[0.62rem] font-semibold text-slate-300">
                {chapter.pct}%
              </span>
            </div>
          </a>
        );
      })}
    </div>
  );
}

/* ------------------------------ Chapter row ----------------------------- */

function ChapterRow({
  chapter,
  selectedId,
  onSelect,
}: {
  chapter: Chapter;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const missions = missionsForChapter(chapter.id);
  const nodeColor = chapter.boss
    ? "border-rose-400 bg-rose-500/20"
    : chapter.pct === 100
      ? "border-emerald-400 bg-emerald-500/20"
      : chapter.pct > 0
        ? "border-violet-400 bg-violet-500/20"
        : "border-slate-600 bg-base-900";

  return (
    <section id={`chapter-${chapter.id}`} className="flex scroll-mt-24 gap-3 sm:gap-4">
      {/* Node spine */}
      <div className="hidden w-4 flex-col items-center pt-5 sm:flex">
        <span className={`h-3.5 w-3.5 rounded-full border-2 ${nodeColor}`} />
        <span className="mt-2 w-px flex-1 bg-gradient-to-b from-violet-500/30 to-transparent" />
      </div>

      {/* Cards */}
      <div className="min-w-0 flex-1">
        {chapter.boss ? (
          <BossCard
            mission={missions[0]}
            selected={selectedId === missions[0]?.id}
            onSelect={onSelect}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {missions.map((mission) => (
              <MissionCard
                key={mission.id}
                mission={mission}
                selected={selectedId === mission.id}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------ Mission card ---------------------------- */

function StatusMark({ mission }: { mission: Mission }) {
  if (mission.status === "completed")
    return (
      <span className="grid h-6 w-6 place-items-center rounded-full border border-emerald-400/40 bg-emerald-500/15 text-emerald-300">
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    );
  if (mission.status === "locked")
    return (
      <span className="grid h-6 w-6 place-items-center rounded-full border border-white/10 bg-white/[0.03] text-slate-500">
        <Lock className="h-3 w-3" />
      </span>
    );
  return (
    <span className="grid h-6 w-6 place-items-center rounded-full border border-electric-400/40 bg-electric-500/15 text-electric-300">
      <Play className="h-3 w-3" fill="currentColor" />
    </span>
  );
}

function MissionCard({
  mission,
  selected,
  onSelect,
}: {
  mission: Mission;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const locked = mission.status === "locked";
  const completed = mission.status === "completed";

  const border = selected
    ? "border-violet-400/70 ring-2 ring-violet-400/40"
    : completed
      ? "border-emerald-400/30"
      : locked
        ? "border-white/[0.07]"
        : "border-electric-400/30";

  return (
    <button
      type="button"
      onClick={() => onSelect(mission.id)}
      aria-pressed={selected}
      className={`group relative flex h-full flex-col rounded-xl border bg-base-950/60 p-3.5 text-left transition-colors hover:border-violet-400/50 ${border} ${
        locked ? "opacity-80" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <StatusMark mission={mission} />
        {mission.badge === "recommended" && (
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-500/10 px-1.5 py-0.5 text-[0.58rem] font-semibold uppercase tracking-wide text-amber-300">
            <Star className="h-2.5 w-2.5" fill="currentColor" /> Recommended
          </span>
        )}
        {mission.badge === "new" && (
          <span className="rounded-md border border-violet-400/30 bg-violet-500/10 px-1.5 py-0.5 text-[0.58rem] font-semibold uppercase tracking-wide text-violet-200">
            New
          </span>
        )}
      </div>

      <h4
        className={`mt-3 text-sm font-semibold leading-snug ${
          locked ? "text-slate-400" : "text-white"
        }`}
      >
        {mission.title}
      </h4>

      <div className="mt-1.5 flex items-center gap-2 text-[0.7rem]">
        <span className={`font-medium ${DIFFICULTY_COLORS[mission.difficulty]}`}>
          {mission.difficulty}
        </span>
        <span className="text-slate-600">·</span>
        <span className="flex items-center gap-1 text-slate-400">
          <Clock className="h-3 w-3" /> {mission.minutes} min
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2.5">
        <span
          className={`rounded border px-1.5 py-0.5 text-[0.62rem] font-semibold ${TAG_COLORS[mission.primaryTag]}`}
        >
          {mission.primaryTag}
        </span>
        <span
          className={`inline-flex items-center gap-1 text-[0.7rem] font-semibold ${
            locked ? "text-slate-600" : "text-violet-200"
          }`}
        >
          {!locked && <Zap className="h-3 w-3" />}
          {locked ? <Lock className="h-3 w-3" /> : null}+{mission.xp} XP
        </span>
      </div>
    </button>
  );
}

/* ------------------------------- Boss card ------------------------------ */

function BossCard({
  mission,
  selected,
  onSelect,
}: {
  mission: Mission;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  if (!mission) return null;
  return (
    <button
      type="button"
      onClick={() => onSelect(mission.id)}
      aria-pressed={selected}
      className={`relative flex w-full flex-col gap-4 overflow-hidden rounded-2xl border bg-gradient-to-br from-rose-950/30 to-base-900/80 p-5 text-left transition-colors sm:flex-row sm:items-center ${
        selected
          ? "border-rose-400/70 ring-2 ring-rose-400/40"
          : "border-rose-500/30 hover:border-rose-400/50"
      }`}
    >
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-400">
        <Skull className="h-7 w-7 animate-pulse-soft" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-rose-300">
          Boss Fight
        </div>
        <h4 className="mt-0.5 text-base font-semibold text-white">
          {mission.title}
        </h4>
        <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-400">
          {mission.description}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.7rem]">
          <span className={`font-medium ${DIFFICULTY_COLORS[mission.difficulty]}`}>
            {mission.difficulty}
          </span>
          <span className="text-slate-600">·</span>
          <span className="flex items-center gap-1 text-slate-400">
            <Clock className="h-3 w-3" /> {mission.minutes} min
          </span>
          {mission.tags.map((tag) => (
            <span
              key={tag}
              className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-slate-300"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div className="grid shrink-0 place-items-center rounded-xl border border-white/[0.08] bg-base-950/60 px-4 py-3 text-center">
        <Lock className="h-4 w-4 text-slate-500" />
        <span className="mt-1 text-sm font-bold text-white">+{mission.xp} XP</span>
      </div>
    </button>
  );
}

/* ----------------------------- Mission detail --------------------------- */

function MissionDetail({ mission }: { mission: Mission }) {
  const locked = mission.status === "locked" || mission.status === "boss";
  const isBoss = mission.status === "boss";

  return (
    <div className="xl:sticky xl:top-24 xl:self-start">
      <div className="surface-strong p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <span
            className={`grid h-16 w-16 place-items-center rounded-2xl border ${
              isBoss
                ? "border-rose-500/40 bg-rose-500/10 text-rose-400"
                : "border-electric-400/40 bg-electric-500/10 text-electric-300"
            }`}
          >
            {isBoss ? (
              <Skull className="h-8 w-8" />
            ) : (
              <Play className="h-7 w-7" fill="currentColor" />
            )}
          </span>
          {mission.badge === "recommended" && (
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-amber-300">
              <Star className="h-2.5 w-2.5" fill="currentColor" /> Recommended
            </span>
          )}
          {mission.badge === "new" && (
            <span className="rounded-md border border-violet-400/30 bg-violet-500/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-violet-200">
              New
            </span>
          )}
        </div>

        <h3 className="mt-4 text-xl font-bold leading-tight text-white">
          {mission.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          {mission.description}
        </p>

        {/* Meta */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <span className="flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5 text-slate-500" />
            <span className={`font-semibold ${DIFFICULTY_COLORS[mission.difficulty]}`}>
              {mission.difficulty}
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <Clock className="h-3.5 w-3.5 text-slate-500" /> {mission.minutes} min
          </span>
        </div>

        {/* Tags */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {mission.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[0.7rem] font-medium text-slate-300"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Required rank */}
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs">
          <ShieldAlert className="h-3.5 w-3.5 text-violet-300" />
          <span className="text-slate-400">Required rank</span>
          <span className="ml-auto font-semibold text-white">
            {mission.requiredRank}
          </span>
        </div>

        {/* Rewards */}
        <div className="mt-5">
          <div className="text-sm font-semibold text-white">Rewards</div>
          <div className="mt-2 flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-sm font-semibold text-violet-200">
              <Zap className="h-4 w-4" /> +{mission.xp} XP
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-electric-400/30 bg-electric-500/10 px-3 py-1.5 text-sm font-semibold text-electric-200">
              <Gauge className="h-4 w-4" /> {mission.rewardSkill}
            </span>
          </div>
        </div>

        {/* Mission preview */}
        <div className="mt-5">
          <div className="text-sm font-semibold text-white">Mission Preview</div>
          <ul className="mt-2 space-y-2">
            {mission.preview.map((step) => (
              <li key={step.text} className="flex items-center gap-2.5 text-sm">
                {step.done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-slate-600" />
                )}
                <span className={step.done ? "text-slate-300" : "text-slate-400"}>
                  {step.text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Practice */}
        <div className="mt-5">
          <div className="text-sm font-semibold text-white">You&apos;ll Practice</div>
          <ul className="mt-2 space-y-1.5">
            {mission.practice.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-slate-400">
                <ChevronRight className="h-3.5 w-3.5 text-violet-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Unlock hint */}
        {locked && mission.unlockHint && (
          <div className="mt-5 flex items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-200">
            <Lock className="h-3.5 w-3.5" />
            {mission.unlockHint}
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 space-y-2.5">
          <button
            type="button"
            disabled={locked}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-transform ${
              locked
                ? "cursor-not-allowed border border-white/10 bg-white/[0.03] text-slate-500"
                : "border border-violet-400/40 bg-gradient-to-r from-violet-600 to-electric-500 text-white shadow-neon hover:scale-[1.02]"
            }`}
          >
            {locked ? (
              <>
                <Lock className="h-4 w-4" /> Mission Locked
              </>
            ) : (
              <>
                <Play className="h-4 w-4" fill="currentColor" /> Start Mission
              </>
            )}
          </button>
          <button
            type="button"
            className="w-full rounded-xl border border-white/12 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-white/25 hover:text-white"
          >
            View Full Details
          </button>
        </div>
      </div>
    </div>
  );
}
