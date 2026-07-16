import Link from "next/link";
import { ArrowRight, Clock, Coffee, Laptop, Search, Target } from "lucide-react";
import { NEXT_ACTION } from "@/lib/dashboard";

export function MissionsNextAction() {
  const a = NEXT_ACTION;
  const pct = Math.round((a.step / a.totalSteps) * 100);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-400/50 bg-gradient-to-br from-violet-900/25 to-base-900/60 p-5 shadow-neon sm:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-violet-300">
            <Target className="h-4 w-4" strokeWidth={2.2} />
            <span className="text-xs font-semibold uppercase tracking-[0.16em]">
              Your Next Action
            </span>
          </div>

          <h2 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
            Continue: {a.title}
          </h2>

          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="font-semibold text-white">
              Step {a.step} of {a.totalSteps}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">{a.phase}</span>
          </div>

          <div className="mt-3 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-electric-400"
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-slate-400">
            <span className="flex items-center gap-1.5">
              <Search className="h-4 w-4 text-violet-300" />
              {a.cluesFound} clues found
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-slate-500" />~ {a.estTimeLeft} left
            </span>
          </div>
        </div>

        {/* Illustration + CTA */}
        <div className="flex shrink-0 flex-col items-center gap-4 sm:flex-row lg:flex-col lg:items-end">
          <div
            aria-hidden
            className="relative hidden h-24 w-40 items-center justify-center sm:flex"
          >
            <div className="absolute inset-0 rounded-2xl bg-violet-600/15 blur-2xl" />
            <Laptop
              className="relative h-16 w-16 text-violet-400/70"
              strokeWidth={1.1}
            />
            <Search
              className="absolute right-8 top-3 h-8 w-8 text-violet-300"
              strokeWidth={1.6}
            />
            <Coffee
              className="absolute bottom-3 right-1 h-6 w-6 text-slate-600"
              strokeWidth={1.4}
            />
          </div>

          <Link
            href={a.href}
            className="group inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-violet-400/40 bg-gradient-to-r from-violet-600 to-violet-500 px-7 py-3.5 text-sm font-semibold text-white shadow-neon transition-transform hover:scale-[1.02] sm:w-auto"
          >
            Continue Mission
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
