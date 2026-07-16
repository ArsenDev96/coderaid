import {
  CircleCheckBig,
  Clock,
  ListChecks,
  Star,
  Trophy,
  Zap,
} from "lucide-react";
import type { MissionResultConfig } from "@/lib/results";

function StatTile({
  icon,
  value,
  label,
  tone,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  tone: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span
        aria-hidden
        className={`grid h-11 w-11 place-items-center rounded-full border ${tone}`}
      >
        {icon}
      </span>
      <span className="text-lg font-bold text-white">{value}</span>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );
}

export function ResultsHeader({ config }: { config: MissionResultConfig }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-8">
      <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-center lg:gap-10">
        {/* Trophy */}
        <div className="relative shrink-0">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 rounded-full bg-violet-600/20 blur-2xl"
          />
          <span className="grid h-28 w-28 place-items-center rounded-3xl border border-violet-400/30 bg-gradient-to-br from-violet-600/30 to-violet-500/10 shadow-neon">
            <Trophy className="h-14 w-14 text-violet-200" strokeWidth={1.5} />
          </span>
        </div>

        {/* Copy + stats */}
        <div className="min-w-0 flex-1 text-center lg:text-left">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-emerald-300">
            Mission Complete
          </span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Great work! 🎉
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400 max-lg:mx-auto sm:text-base">
            {config.summary}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-4">
            <StatTile
              icon={<Star className="h-5 w-5 text-amber-300" fill="currentColor" />}
              value={`${config.score} / 100`}
              label="Score"
              tone="border-amber-400/30 bg-amber-500/10"
            />
            <StatTile
              icon={<Zap className="h-5 w-5 text-violet-300" fill="currentColor" />}
              value={`+${config.xpEarned} XP`}
              label="Earned"
              tone="border-violet-400/30 bg-violet-500/10"
            />
            <StatTile
              icon={<Clock className="h-5 w-5 text-electric-300" />}
              value={config.timeTaken}
              label="Time Taken"
              tone="border-electric-400/30 bg-electric-500/10"
            />
            <StatTile
              icon={<ListChecks className="h-5 w-5 text-emerald-300" />}
              value={`${config.stepsCompleted} / ${config.totalSteps}`}
              label="Steps Completed"
              tone="border-emerald-400/30 bg-emerald-500/10"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ResultsMissionRecap({
  title,
  blurb,
  difficulty,
  resolved,
}: {
  title: string;
  blurb: string;
  difficulty: string;
  resolved: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <span
            aria-hidden
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-violet-400/30 bg-violet-500/10 text-violet-300"
          >
            <Trophy className="h-5 w-5" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-white sm:text-lg">
                Mission: {title}
              </h2>
              <span className="rounded-md border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-amber-300">
                {difficulty}
              </span>
            </div>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-400">
              {blurb}
            </p>
          </div>
        </div>

        <div className="shrink-0 rounded-xl border border-emerald-400/25 bg-emerald-500/[0.06] px-5 py-3">
          <div className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Status
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-lg font-bold text-emerald-300">
              {resolved ? "Resolved" : "Unresolved"}
            </span>
            <CircleCheckBig className="h-5 w-5 text-emerald-400" strokeWidth={2.2} />
          </div>
        </div>
      </div>
    </div>
  );
}
