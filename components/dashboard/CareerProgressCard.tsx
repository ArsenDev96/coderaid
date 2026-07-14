import Link from "next/link";
import { ChevronRight, Hexagon } from "lucide-react";
import { DEMO_PLAYER } from "@/lib/dashboard";

export function CareerProgressCard() {
  const p = DEMO_PLAYER;
  return (
    <div className="surface p-5">
      <div className="flex items-center justify-between">
        <div className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-violet-300">
          Career Progress
        </div>
        <Link
          href="/missions"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-300 transition-colors hover:text-white"
        >
          View path <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-base font-semibold text-white">{p.rank}</span>
        <span className="text-sm font-medium text-slate-400">
          Level {p.level}
        </span>
      </div>

      <div className="relative mt-3">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-electric-400 to-violet-500"
            style={{ width: `${p.levelPct}%` }}
          />
        </div>
        <span
          className="absolute top-1/2 -translate-y-1/2"
          style={{ left: `calc(${p.levelPct}% - 10px)` }}
        >
          <span className="grid h-5 w-5 place-items-center rounded-full border border-violet-400 bg-base-900 text-violet-300 shadow-neon">
            <Hexagon className="h-3 w-3" fill="currentColor" />
          </span>
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="font-mono text-slate-300">
          {p.xpIntoLevel.toLocaleString()} / {p.xpForLevel.toLocaleString()} XP
        </span>
        <span className="text-slate-500">
          {p.xpToNext} XP to Level {p.nextLevel}
        </span>
      </div>
    </div>
  );
}
