import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { formatXp, type LeaderboardPeriod, type LeaderboardScope, getRankSummary } from "@/lib/leaderboards";

/** Compact "where do I stand" panel: rank, percentile, period XP, movement. */
export function RankSummary({
  scope,
  period,
}: {
  scope: LeaderboardScope;
  period: LeaderboardPeriod;
}) {
  const summary = getRankSummary(scope, period);

  if (!summary) {
    return (
      <section className="surface p-5">
        <h2 className="text-sm font-semibold text-white">Your Rank</h2>
        <p className="mt-3 text-sm text-slate-400">
          You&apos;re not ranked on this leaderboard yet. Complete a mission to
          join the standings.
        </p>
      </section>
    );
  }

  const { rank, percentile, xp, rankChange, periodLabel } = summary;

  return (
    <section className="surface p-5">
      <h2 className="text-sm font-semibold text-white">Your Rank</h2>

      {/* Hexagon rank badge */}
      <div className="mt-4 flex flex-col items-center">
        <div className="relative">
          <svg viewBox="0 0 100 112" className="h-28 w-[6.25rem]" aria-hidden>
            <defs>
              <linearGradient id="rank-hex" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(139,92,246,0.30)" />
                <stop offset="100%" stopColor="rgba(139,92,246,0.06)" />
              </linearGradient>
            </defs>
            <polygon
              points="50,3 95,29 95,83 50,109 5,83 5,29"
              fill="url(#rank-hex)"
              stroke="#a78bfa"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          </svg>
          <span className="absolute inset-0 grid place-items-center text-4xl font-bold text-white">
            {rank}
          </span>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Top <span className="font-semibold text-violet-300">{percentile}%</span>{" "}
          of developers
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/[0.06] pt-4">
        <div>
          <div className="text-xs text-slate-500">XP {periodLabel}</div>
          <div className="mt-0.5 font-mono text-base font-bold text-violet-300">
            {formatXp(xp)} XP
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Rank Change</div>
          <RankChange value={rankChange} />
        </div>
      </div>
    </section>
  );
}

function RankChange({ value }: { value: number }) {
  if (value === 0) {
    return (
      <div className="mt-0.5 flex items-center gap-1 text-base font-bold text-slate-400">
        <Minus className="h-4 w-4" strokeWidth={2.4} />
        <span className="sr-only">No change</span>
        <span aria-hidden>0</span>
      </div>
    );
  }

  const up = value > 0;
  const Icon = up ? TrendingUp : TrendingDown;

  return (
    <div
      className={`mt-0.5 flex items-center gap-1 text-base font-bold ${
        up ? "text-emerald-300" : "text-rose-300"
      }`}
    >
      <Icon className="h-4 w-4" strokeWidth={2.4} />
      <span className="sr-only">{up ? "Up" : "Down"}</span>
      <span aria-hidden>{Math.abs(value)}</span>
    </div>
  );
}
