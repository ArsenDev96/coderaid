import { ArrowRight, Clock, ScrollText, Sparkles, Star, Zap } from "lucide-react";
import { DAILY_RAID } from "@/lib/dashboard";

export function DailyRaid() {
  const r = DAILY_RAID;
  return (
    <div className="surface flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-violet-300">
          Daily Raid
        </div>
        <span className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[0.62rem] font-medium text-slate-400">
          <Clock className="h-3 w-3" /> {r.timeLeft}
        </span>
      </div>

      <h3 className="mt-2 text-lg font-semibold text-white">{r.title}</h3>
      <p className="mt-1 text-sm text-slate-400">{r.description}</p>

      {/* Illustration */}
      <div className="relative mt-4 grid h-28 place-items-center overflow-hidden rounded-2xl border border-emerald-400/15 bg-gradient-to-br from-emerald-950/20 to-base-900">
        <div
          aria-hidden
          className="absolute inset-0 bg-grid-fade opacity-40 [background-size:18px_18px]"
        />
        <div className="relative">
          <ScrollText className="h-14 w-14 text-emerald-400/50" strokeWidth={1.1} />
          <Sparkles className="absolute -right-3 -top-2 h-5 w-5 animate-pulse-soft text-emerald-300" />
        </div>
      </div>

      {/* Rewards */}
      <div className="mt-4">
        <div className="text-xs text-slate-500">Rewards</div>
        <div className="mt-1.5 flex items-center gap-3">
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-violet-200">
            <Zap className="h-4 w-4 text-violet-300" /> {r.rewards.xp}
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-200">
            <Star className="h-4 w-4 text-amber-300" fill="currentColor" />{" "}
            {r.rewards.stars}
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-electric-200">
            <Zap className="h-4 w-4 text-electric-300" fill="currentColor" />{" "}
            {r.rewards.energy}
          </span>
        </div>
      </div>

      <button
        type="button"
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-violet-400/40 bg-gradient-to-r from-violet-600 to-electric-500 px-5 py-2.5 text-sm font-semibold text-white shadow-neon transition-transform hover:scale-[1.02]"
      >
        Start Daily Raid
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
