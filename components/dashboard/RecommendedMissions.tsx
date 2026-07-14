import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RECOMMENDED_MISSIONS, type RecommendedMission } from "@/lib/dashboard";

const ICON_ACCENT: Record<RecommendedMission["accent"], string> = {
  emerald: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
  electric: "border-electric-400/25 bg-electric-500/10 text-electric-300",
  slate: "border-white/[0.08] bg-white/[0.03] text-slate-500",
};

const DIFFICULTY: Record<RecommendedMission["difficulty"], string> = {
  Low: "text-emerald-300",
  Medium: "text-amber-300",
  High: "text-rose-300",
};

export function RecommendedMissions() {
  return (
    <div className="surface p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-violet-300">
          Recommended Missions
        </div>
        <Link
          href="/missions"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-300 transition-colors hover:text-white"
        >
          View all missions <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {RECOMMENDED_MISSIONS.map((mission) => {
          const Icon = mission.icon;
          return (
            <button
              key={mission.id}
              type="button"
              className={`flex h-full flex-col rounded-xl border border-white/[0.08] bg-base-950/50 p-4 text-left transition-colors hover:border-violet-500/30 ${
                mission.locked ? "opacity-80" : ""
              }`}
            >
              <span
                className={`grid h-10 w-10 place-items-center rounded-xl border ${ICON_ACCENT[mission.accent]}`}
              >
                <Icon className="h-5 w-5" strokeWidth={1.9} />
              </span>
              <h4
                className={`mt-3 text-sm font-semibold leading-snug ${
                  mission.locked ? "text-slate-400" : "text-white"
                }`}
              >
                {mission.title}
              </h4>
              <span
                className={`mt-1 text-xs font-medium ${DIFFICULTY[mission.difficulty]}`}
              >
                {mission.difficulty}
              </span>
              <span className="mt-3 border-t border-white/[0.06] pt-2.5 text-sm font-semibold text-violet-300">
                + {mission.xp} XP
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
