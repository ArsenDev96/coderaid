"use client";

import {
  formatXp,
  getRankSummary,
  type LeaderboardPeriod,
  type StandingsRow,
} from "@/lib/leaderboards";

/** Below this, a percentile describes too few people to be worth showing. */
const PERCENTILE_MIN_PLAYERS = 20;

/**
 * Compact "where do I stand" panel: rank, percentile, period XP and incidents.
 *
 * Every figure is the player's own real position among real players. The
 * percentile is measured against the actual number of ranked players rather
 * than the old seeded 12,480, so it is sometimes unflattering and always true.
 *
 * There is deliberately no rank-movement arrow — nothing records last week's
 * rank, so it could only ever be decoration.
 */
export function RankSummary({
  rows,
  period,
}: {
  rows: StandingsRow[];
  period: LeaderboardPeriod;
}) {
  const summary = getRankSummary(rows, period);

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

  const { rank, percentile, population, xp, missions, periodLabel } = summary;

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
        {/*
          A percentile only means something once there are enough people for it
          to describe. Below that it says less than the plain count does — "Top
          50%" of two players is a decorative way of writing "2nd of 2" — so the
          count is what shows, and the percentile appears when it earns its
          place.
        */}
        <p className="mt-3 text-xs text-slate-400">
          <span className="font-semibold text-violet-300">
            {rank} of {population}
          </span>{" "}
          {population === 1 ? "ranked player" : "ranked players"}
        </p>
        {population >= PERCENTILE_MIN_PLAYERS && (
          <p className="mt-1 text-xs text-slate-500">
            Top <span className="font-semibold text-violet-300">{percentile}%</span>
          </p>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/[0.06] pt-4">
        <div>
          <div className="text-xs text-slate-500">XP {periodLabel}</div>
          <div className="mt-0.5 font-mono text-base font-bold text-violet-300">
            {formatXp(xp)} XP
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Incidents {periodLabel}</div>
          <div className="mt-0.5 font-mono text-base font-bold text-emerald-300">
            {missions}
          </div>
        </div>
      </div>
    </section>
  );
}
