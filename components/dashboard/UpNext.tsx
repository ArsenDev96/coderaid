import { ArrowRight, Flag, Zap } from "lucide-react";
import { UP_NEXT } from "@/lib/dashboard";

export function UpNext() {
  const m = UP_NEXT;
  return (
    <div className="surface flex h-full flex-col p-5">
      <div className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-violet-300">
        Up Next
      </div>

      <div className="mt-4 flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-violet-500/25 bg-violet-500/10 text-violet-300">
          <Flag className="h-5 w-5" strokeWidth={1.9} />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-white">{m.title}</h3>
          <span className="text-xs font-medium text-amber-300">
            {m.difficulty}
          </span>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-slate-400">
        {m.description}
      </p>

      <div className="mt-auto flex items-center justify-between pt-4">
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-violet-300">
          <Zap className="h-3.5 w-3.5" /> + {m.xp} XP
        </span>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-sm font-semibold text-slate-200 transition-colors hover:text-white"
        >
          View Mission <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
