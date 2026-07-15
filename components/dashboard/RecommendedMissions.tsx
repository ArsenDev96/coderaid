import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  RECOMMENDED_MISSIONS,
  type Difficulty,
  type RecommendedMission,
} from "@/lib/dashboard";

const ICON_ACCENT: Record<RecommendedMission["accent"], string> = {
  violet: "border-violet-400/25 bg-violet-500/10 text-violet-300",
  electric: "border-electric-400/25 bg-electric-500/10 text-electric-300",
  emerald: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
};

const DIFFICULTY_META: Record<
  Difficulty,
  { label: string; dots: number; text: string; dot: string }
> = {
  Easy: { label: "Easy", dots: 1, text: "text-emerald-300", dot: "bg-emerald-400" },
  Medium: { label: "Medium", dots: 2, text: "text-amber-300", dot: "bg-amber-400" },
  Hard: { label: "Hard", dots: 3, text: "text-rose-300", dot: "bg-rose-400" },
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

export function RecommendedMissions() {
  return (
    <div className="surface flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Recommended Missions</h2>
        <Link
          href="/missions"
          className="shrink-0 text-xs font-semibold text-violet-300 transition-colors hover:text-violet-200"
        >
          View all
        </Link>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {RECOMMENDED_MISSIONS.map((mission) => {
          const Icon = mission.icon;
          return (
            <button
              key={mission.id}
              type="button"
              className="group flex items-center gap-3.5 rounded-xl border border-white/[0.06] bg-base-950/50 p-3.5 text-left transition-colors hover:border-violet-500/30"
            >
              <span
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${ICON_ACCENT[mission.accent]}`}
              >
                <Icon className="h-5 w-5" strokeWidth={1.9} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-white">
                  {mission.title}
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
            </button>
          );
        })}
      </div>
    </div>
  );
}
