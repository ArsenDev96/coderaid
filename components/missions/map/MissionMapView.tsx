"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Circle, Lock, Trophy } from "lucide-react";
import {
  CHAPTERS,
  CURRENT_MISSION_ID,
  MISSIONS,
  chapterProgress,
  chapterState,
  missionsForChapter,
  nextUnlockHint,
  type ChapterState,
  type Mission,
} from "@/lib/missions";
import { MissionDetailsPanel } from "./MissionDetailsPanel";
import { useMissionResume } from "./useMissionResume";

/* Lookup built once from the mission list. */
const MISSIONS_BY_ID: Record<string, Mission> = Object.fromEntries(
  MISSIONS.map((m) => [m.id, m]),
);

/* ------------------------------ Spine node ------------------------------ */

function SpineNode({ state, last }: { state: ChapterState; last: boolean }) {
  return (
    <div className="relative flex w-8 shrink-0 flex-col items-center">
      <span
        className={`z-10 grid h-8 w-8 place-items-center rounded-full border ${
          state === "complete"
            ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-300"
            : state === "in-progress"
              ? "border-violet-400/60 bg-violet-500/20 text-violet-200"
              : "border-white/10 bg-white/[0.03] text-slate-600"
        }`}
      >
        {state === "complete" ? (
          <Check className="h-4 w-4" strokeWidth={3} />
        ) : state === "locked" ? (
          <Lock className="h-3.5 w-3.5" />
        ) : (
          <span className="h-2.5 w-2.5 rounded-full bg-violet-300" />
        )}
      </span>
      {/* connector to the next chapter */}
      {!last && (
        <span
          aria-hidden
          className={`absolute top-8 bottom-[-2.5rem] w-px ${
            state === "complete" ? "bg-emerald-400/30" : "bg-white/10"
          }`}
        />
      )}
    </div>
  );
}

/* ------------------------------ Chapter card ---------------------------- */

function ChapterCard({ chapterId }: { chapterId: number }) {
  const chapter = CHAPTERS.find((c) => c.id === chapterId)!;
  const Icon = chapter.icon;
  const state = chapterState(chapterId);
  const { done, total } = chapterProgress(chapterId);

  const accent =
    state === "complete"
      ? "border-l-emerald-400/60"
      : state === "in-progress"
        ? "border-l-violet-400/60"
        : "border-l-white/10";

  return (
    <div
      className={`rounded-xl border border-white/[0.06] border-l-2 bg-white/[0.02] p-4 ${accent} ${
        state === "locked" ? "opacity-70" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${
            state === "locked"
              ? "border-white/10 bg-white/[0.02] text-slate-600"
              : "border-violet-400/30 bg-violet-500/10 text-violet-300"
          }`}
        >
          {state === "locked" ? (
            <Lock className="h-4 w-4" />
          ) : (
            <Icon className="h-4 w-4" strokeWidth={1.9} />
          )}
        </span>
        <span className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Chapter {chapter.id}
        </span>
      </div>

      <h3 className="mt-2 text-sm font-bold text-white">{chapter.name}</h3>

      <div className="mt-2 text-xs leading-relaxed text-slate-500">
        {CHAPTER_BLURB[chapter.id] ?? "Level up your engineering skills."}
      </div>

      <div
        className={`mt-3 text-xs font-semibold ${
          state === "complete"
            ? "text-emerald-300"
            : state === "in-progress"
              ? "text-violet-300"
              : "text-slate-500"
        }`}
      >
        {done} / {total} completed
      </div>
    </div>
  );
}

const CHAPTER_BLURB: Record<number, string> = {
  1: "Master the fundamentals of JavaScript and solve real bugs.",
  2: "Handle async work, concurrency, and background jobs.",
  3: "Build resilient services and design reliable APIs.",
  4: "Tune queries, indexes, and database performance.",
  5: "Scale services and design resilient architectures.",
};

/* ------------------------------ Mission row ----------------------------- */

function StatusEnd({ mission }: { mission: Mission }) {
  if (mission.status === "completed")
    return (
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-emerald-400/40 bg-emerald-500/15 text-emerald-300">
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    );
  if (mission.status === "available")
    return <span className="shrink-0 text-xs font-medium text-electric-300">Available</span>;
  if (mission.status === "locked")
    return <span className="shrink-0 text-xs font-medium text-slate-500">Locked</span>;
  return null;
}

function MissionMapRow({
  mission,
  number,
  selected,
  onSelect,
}: {
  mission: Mission;
  number: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const isCurrent = mission.status === "current";
  const locked = mission.status === "locked";
  const resume = useMissionResume(mission.id);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
        selected
          ? "border-violet-400/60 bg-violet-500/[0.08]"
          : isCurrent
            ? "border-violet-400/40 bg-violet-500/[0.05] hover:border-violet-400/60"
            : "border-white/[0.06] bg-white/[0.02] hover:border-white/15"
      }`}
    >
      {/* leading marker */}
      {isCurrent ? (
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-violet-400/50 bg-violet-500/20 text-violet-200">
          <span className="h-2 w-2 rounded-full bg-violet-300" />
        </span>
      ) : mission.status === "completed" ? (
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-emerald-400/40 bg-emerald-500/15 text-emerald-300">
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
          <span className="sr-only">Completed</span>
        </span>
      ) : locked ? (
        <Lock className="h-4 w-4 shrink-0 text-slate-600" />
      ) : (
        <Circle className="h-5 w-5 shrink-0 text-slate-600" />
      )}

      <span className="w-8 shrink-0 font-mono text-xs text-slate-500">{number}</span>

      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-sm ${
            locked ? "text-slate-500" : "text-slate-100"
          }`}
        >
          {mission.title}
        </span>
        {isCurrent && (
          <span className="mt-0.5 block text-xs text-violet-300/80">
            In Progress · Step {resume.step} of {resume.totalSteps}
          </span>
        )}
      </span>

      {isCurrent ? (
        <Link
          href={resume.href}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 text-xs font-semibold text-violet-300 hover:text-violet-200"
        >
          Continue
        </Link>
      ) : (
        <StatusEnd mission={mission} />
      )}
    </button>
  );
}

/* ------------------------------- Map view ------------------------------- */

export function MissionMapView({
  initialMissionId,
}: {
  initialMissionId?: string;
}) {
  const [selectedId, setSelectedId] = useState(() =>
    initialMissionId && MISSIONS_BY_ID[initialMissionId]
      ? initialMissionId
      : CURRENT_MISSION_ID,
  );
  const selected = MISSIONS_BY_ID[selectedId] ?? null;
  const unlock = nextUnlockHint();

  // Keep the selection deep-linkable (?mission=…) without a full navigation, so
  // a reload or shared link restores the same mission.
  const select = (id: string) => {
    setSelectedId(id);
    if (typeof window !== "undefined") {
      const url = id ? `/missions/map?mission=${id}` : "/missions/map";
      window.history.replaceState(null, "", url);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]">
      {/* Map board */}
      <div className="min-w-0">
        <div className="surface p-5 sm:p-6">
          <h2 className="text-lg font-bold text-white">Mission Map</h2>
          <p className="mt-1 text-sm text-slate-400">
            Complete missions to unlock new challenges and advance your skills.
          </p>

          <div className="mt-6 flex flex-col gap-10">
            {CHAPTERS.map((chapter, ci) => {
              const rows = missionsForChapter(chapter.id);
              const state = chapterState(chapter.id);
              return (
                <div
                  key={chapter.id}
                  className="grid grid-cols-1 gap-4 lg:grid-cols-[15rem_auto_minmax(0,1fr)]"
                >
                  <ChapterCard chapterId={chapter.id} />

                  {/* spine (desktop only) */}
                  <div className="hidden lg:block">
                    <SpineNode state={state} last={ci === CHAPTERS.length - 1} />
                  </div>

                  <div className="flex min-w-0 flex-col gap-2">
                    {rows.map((mission, mi) => (
                      <MissionMapRow
                        key={mission.id}
                        mission={mission}
                        number={`${chapter.id}.${mi + 1}`}
                        selected={mission.id === selectedId}
                        onSelect={() => select(mission.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Unlock hint */}
        {unlock && unlock.remaining > 0 && (
          <div className="surface mt-6 flex items-start gap-4 p-5">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-violet-400/30 bg-violet-500/10 text-violet-300">
              <Trophy className="h-6 w-6" strokeWidth={1.7} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">
                Complete {unlock.remaining} more{" "}
                {unlock.remaining === 1 ? "mission" : "missions"} in{" "}
                {unlock.fromChapter.name} to unlock {unlock.lockedChapter.name}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Keep going! You&apos;re building real-world engineering skills.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Details rail */}
      <div className="xl:sticky xl:top-24 xl:self-start">
        {selected ? (
          <MissionDetailsPanel mission={selected} onClose={() => select("")} />
        ) : (
          <div className="surface flex flex-col items-center justify-center p-10 text-center">
            <Circle className="h-6 w-6 text-slate-600" strokeWidth={1.8} />
            <p className="mt-3 text-sm text-slate-400">
              Select a mission from the map to see its details.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
