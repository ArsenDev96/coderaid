import { ArrowRight, Crosshair, Gift, Sparkles, Zap } from "lucide-react";
import { DAILY_RAID } from "@/lib/dashboard";

export function DailyRaid() {
  const r = DAILY_RAID;
  return (
    <div className="surface flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Crosshair className="h-5 w-5 shrink-0 text-violet-300" strokeWidth={2} />
            <h2 className="text-lg font-semibold text-white">{r.title}</h2>
          </div>
          <p className="mt-2 max-w-[16rem] text-sm leading-relaxed text-slate-400">
            {r.description}
          </p>
        </div>

        {/* Treasure chest */}
        <div className="relative grid h-24 w-28 shrink-0 place-items-center">
          <div
            aria-hidden
            className="absolute inset-0 rounded-2xl bg-violet-600/20 blur-2xl"
          />
          <Gift
            className="relative h-16 w-16 text-violet-400 drop-shadow-[0_0_18px_rgba(139,92,246,0.6)]"
            strokeWidth={1.3}
          />
          <Sparkles className="absolute right-2 top-1 h-4 w-4 animate-pulse-soft text-violet-200" />
        </div>
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
        <span className="inline-flex items-center gap-2 rounded-xl border border-amber-400/25 bg-amber-500/[0.08] px-3 py-2 text-sm font-semibold text-amber-200">
          <Zap className="h-4 w-4" fill="currentColor" /> +{r.xp} XP
        </span>
        <button
          type="button"
          className="group inline-flex items-center gap-2 rounded-xl border border-violet-400/50 bg-violet-500/[0.08] px-5 py-2.5 text-sm font-semibold text-violet-200 transition-colors hover:bg-violet-500/[0.16] hover:text-white"
        >
          Start Daily Raid
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}
