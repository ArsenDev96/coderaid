import { BadgeCheck, Flag, Lock } from "lucide-react";
import { MISSION_STATS } from "@/lib/missions";

export function MissionStats() {
  const s = MISSION_STATS;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {/* Overall progress ring */}
      <div className="surface flex items-center gap-3 p-4">
        <div
          className="grid h-14 w-14 shrink-0 place-items-center rounded-full"
          style={{
            background: `conic-gradient(#8b5cf6 ${s.overallPct}%, rgba(148,163,184,0.12) ${s.overallPct}%)`,
          }}
        >
          <div className="grid h-11 w-11 place-items-center rounded-full bg-base-900 text-sm font-bold text-white">
            {s.overallPct}%
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Overall Progress</div>
          <div className="text-xl font-bold text-white">
            {s.completedMissions}
          </div>
          <div className="font-mono text-[0.68rem] text-slate-500">
            {s.completedMissions} / {s.totalMissions} missions
          </div>
        </div>
      </div>

      {/* Missions completed */}
      <div className="surface p-4">
        <div className="flex items-center gap-2 text-electric-300">
          <BadgeCheck className="h-5 w-5" />
        </div>
        <div className="mt-2 text-xs text-slate-400">Missions Completed</div>
        <div className="text-2xl font-bold text-white">
          {s.completedMissions}
        </div>
        <div className="mt-0.5 text-[0.7rem] font-medium text-emerald-400">
          +{s.completedDelta}
        </div>
      </div>

      {/* Chapters completed */}
      <div className="surface p-4">
        <div className="flex items-center gap-2 text-violet-300">
          <Flag className="h-5 w-5" />
        </div>
        <div className="mt-2 text-xs text-slate-400">Chapters Completed</div>
        <div className="text-2xl font-bold text-white">
          {s.chaptersDone} / {s.chaptersTotal}
        </div>
        <div className="mt-0.5 text-[0.7rem] text-slate-500">
          {s.chaptersPct}% complete
        </div>
      </div>

      {/* Next unlock */}
      <div className="surface p-4">
        <div className="flex items-center gap-2 text-amber-300">
          <Lock className="h-5 w-5" />
        </div>
        <div className="mt-2 text-xs text-slate-400">Next Unlock</div>
        <div className="text-sm font-semibold leading-tight text-white">
          {s.nextUnlock}
        </div>
        <div className="mt-0.5 text-[0.7rem] text-slate-500">
          {s.nextUnlockHint}
        </div>
      </div>
    </div>
  );
}
