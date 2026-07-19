import {
  CircleAlert,
  CircleCheckBig,
  Clock,
  ListChecks,
  Star,
  Trophy,
  Zap,
} from "lucide-react";
import { scoreBand, type MissionGrade } from "@/lib/grading";
import { formatDuration } from "@/lib/run";

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

const BAND_TONE: Record<string, { badge: string; icon: string; glow: string }> = {
  emerald: {
    badge: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
    icon: "border-emerald-400/30 bg-gradient-to-br from-emerald-600/30 to-emerald-500/10",
    glow: "bg-emerald-600/20",
  },
  electric: {
    badge: "border-electric-400/30 bg-electric-500/10 text-electric-300",
    icon: "border-electric-400/30 bg-gradient-to-br from-electric-600/30 to-electric-500/10",
    glow: "bg-electric-600/20",
  },
  amber: {
    badge: "border-amber-400/30 bg-amber-500/10 text-amber-300",
    icon: "border-amber-400/30 bg-gradient-to-br from-amber-600/30 to-amber-500/10",
    glow: "bg-amber-600/20",
  },
  rose: {
    badge: "border-rose-400/30 bg-rose-500/10 text-rose-300",
    icon: "border-rose-400/30 bg-gradient-to-br from-rose-600/30 to-rose-500/10",
    glow: "bg-rose-600/20",
  },
};

/**
 * The run's real outcome. Every number here comes from the grading engine —
 * the score the player earned, the XP that score bought, the wall-clock time
 * the run actually took and the stages they actually completed.
 */
export function ResultsHeader({
  grade,
  summary,
}: {
  grade: MissionGrade;
  summary: string;
}) {
  const band = scoreBand(grade.score);
  const tone = BAND_TONE[band.tone];

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-8">
      <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-center lg:gap-10">
        {/* Outcome mark */}
        <div className="relative shrink-0">
          <div
            aria-hidden
            className={`absolute inset-0 -z-10 rounded-full blur-2xl ${tone.glow}`}
          />
          <span
            className={`grid h-28 w-28 place-items-center rounded-3xl border shadow-neon ${tone.icon}`}
          >
            {grade.resolved ? (
              <Trophy className="h-14 w-14 text-violet-100" strokeWidth={1.5} />
            ) : (
              <CircleAlert className="h-14 w-14 text-rose-200" strokeWidth={1.5} />
            )}
          </span>
        </div>

        {/* Copy + stats */}
        <div className="min-w-0 flex-1 text-center lg:text-left">
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.12em] ${tone.badge}`}
          >
            {grade.resolved ? "Incident Resolved" : "Incident Still Open"}
          </span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {band.label}
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400 max-lg:mx-auto sm:text-base">
            {summary}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-4">
            <StatTile
              icon={<Star className="h-5 w-5 text-amber-300" fill="currentColor" />}
              value={`${grade.score} / 100`}
              label="Score"
              tone="border-amber-400/30 bg-amber-500/10"
            />
            <StatTile
              icon={<Zap className="h-5 w-5 text-violet-300" fill="currentColor" />}
              value={`+${grade.xpEarned} XP`}
              label="Earned"
              tone="border-violet-400/30 bg-violet-500/10"
            />
            <StatTile
              icon={<Clock className="h-5 w-5 text-electric-300" />}
              value={formatDuration(grade.durationMs)}
              label="Time Taken"
              tone="border-electric-400/30 bg-electric-500/10"
            />
            <StatTile
              icon={<ListChecks className="h-5 w-5 text-emerald-300" />}
              value={`${grade.stepsCompleted} / ${grade.totalSteps}`}
              label="Steps Completed"
              tone="border-emerald-400/30 bg-emerald-500/10"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * How the score was arrived at. Showing the working is the difference between
 * a number the player is handed and one they can learn from.
 */
export function ScoreBreakdown({ grade }: { grade: MissionGrade }) {
  return (
    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-white sm:text-base">
        <Star className="h-4 w-4 text-amber-300" strokeWidth={2.2} />
        How this was scored
      </h3>

      <ul className="mt-4 flex flex-col gap-3">
        {grade.breakdown.map((entry) => (
          <li
            key={entry.id}
            className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-base-950/40 p-3.5"
          >
            <span
              aria-hidden
              className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg border ${
                entry.correct
                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                  : "border-rose-400/25 bg-rose-500/10 text-rose-300"
              }`}
            >
              {entry.correct ? (
                <CircleCheckBig className="h-3.5 w-3.5" strokeWidth={2.4} />
              ) : (
                <CircleAlert className="h-3.5 w-3.5" strokeWidth={2.4} />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold text-white">
                  {entry.label}
                </span>
                <span
                  className={`shrink-0 font-mono text-sm font-bold ${
                    entry.points < 0
                      ? "text-rose-300"
                      : entry.points > 0
                        ? "text-emerald-300"
                        : "text-slate-500"
                  }`}
                >
                  {entry.points > 0 ? "+" : ""}
                  {entry.points}
                  {entry.max > 0 ? ` / ${entry.max}` : ""}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                {entry.detail}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
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

        <div
          className={`shrink-0 rounded-xl border px-5 py-3 ${
            resolved
              ? "border-emerald-400/25 bg-emerald-500/[0.06]"
              : "border-rose-400/25 bg-rose-500/[0.06]"
          }`}
        >
          <div className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Status
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`text-lg font-bold ${
                resolved ? "text-emerald-300" : "text-rose-300"
              }`}
            >
              {resolved ? "Resolved" : "Unresolved"}
            </span>
            {resolved ? (
              <CircleCheckBig className="h-5 w-5 text-emerald-400" strokeWidth={2.2} />
            ) : (
              <CircleAlert className="h-5 w-5 text-rose-400" strokeWidth={2.2} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
