"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useProgress } from "@/components/progress/ProgressProvider";
import { AvailabilityBadge } from "@/components/ui/AvailabilityBadge";
import { canStart, missionAvailability, playableSummary } from "@/lib/availability";
import {
  CHAPTERS,
  NODE_MISSIONS,
  type Difficulty,
  type Mission,
} from "@/lib/missions";

const ACCENTS = [
  "border-violet-400/25 bg-violet-500/10 text-violet-300",
  "border-electric-400/25 bg-electric-500/10 text-electric-300",
  "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
];

const DIFFICULTY_META: Record<
  Difficulty,
  { label: string; dots: number; text: string; dot: string }
> = {
  Easy: { label: "Easy", dots: 1, text: "text-emerald-300", dot: "bg-emerald-400" },
  Medium: { label: "Medium", dots: 2, text: "text-amber-300", dot: "bg-amber-400" },
  Hard: { label: "Hard", dots: 3, text: "text-rose-300", dot: "bg-rose-400" },
  Expert: { label: "Expert", dots: 3, text: "text-fuchsia-300", dot: "bg-fuchsia-400" },
};

function DifficultyDots({ difficulty }: { difficulty: Difficulty }) {
  const meta = DIFFICULTY_META[difficulty];
  return (
    <div className="flex flex-col items-start gap-1">
      <span className={`text-xs font-medium ${meta.text}`}>{meta.label}</span>
      <span className="flex gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full ${
              i < meta.dots ? meta.dot : "bg-white/[0.12]"
            }`}
          />
        ))}
      </span>
    </div>
  );
}

function chapterIcon(mission: Mission) {
  return CHAPTERS.find((c) => c.id === mission.chapterId)?.icon;
}

/**
 * Only missions the player can actually run end to end. The card is never
 * padded with in-development or coming-soon content — when there are fewer
 * playable incidents than slots, it says so instead.
 */
export function RecommendedMissions() {
  const { view } = useProgress();
  const missions = NODE_MISSIONS.filter((m) => canStart(m, view)).slice(0, 3);
  const { inDevelopment } = playableSummary();

  return (
    <div className="surface flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">
          Recommended Node.js Missions
        </h2>
        <Link
          href="/missions"
          className="shrink-0 text-xs font-semibold text-violet-300 transition-colors hover:text-violet-200"
        >
          View all
        </Link>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {missions.map((mission, i) => {
          const Icon = chapterIcon(mission);
          return (
            <Link
              key={mission.id}
              href={`/missions/${mission.id}/briefing`}
              className="group flex items-center gap-3.5 rounded-xl border border-white/[0.06] bg-base-950/50 p-3.5 text-left transition-colors hover:border-violet-500/30"
            >
              <span
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${
                  ACCENTS[i % ACCENTS.length]
                }`}
              >
                {Icon ? <Icon className="h-5 w-5" strokeWidth={1.9} /> : null}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="min-w-0 truncate text-sm font-semibold text-white">
                    {mission.title}
                  </span>
                  <AvailabilityBadge
                    status={missionAvailability(mission, view)}
                    className="shrink-0"
                  />
                </span>
                <span className="block truncate text-xs text-slate-400">
                  {mission.description}
                </span>
              </span>

              <span className="hidden shrink-0 sm:block">
                <DifficultyDots difficulty={mission.difficulty} />
              </span>

              <span className="shrink-0 text-sm font-semibold text-violet-300">
                +{mission.xp} XP
              </span>

              <ChevronRight className="h-4 w-4 shrink-0 text-slate-600 transition-colors group-hover:text-slate-300" />
            </Link>
          );
        })}

        {missions.length < 3 && (
          <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 text-xs leading-relaxed text-slate-500">
            More Node.js incidents are currently being prepared.
            {inDevelopment > 0
              ? ` ${inDevelopment} more are in development.`
              : ""}
          </p>
        )}
      </div>
    </div>
  );
}
