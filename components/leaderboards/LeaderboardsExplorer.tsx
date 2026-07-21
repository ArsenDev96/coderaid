"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, SlidersHorizontal } from "lucide-react";
import {
  DEFAULT_FILTERS,
  DEFAULT_PERIOD,
  getLeaderboard,
  type LeaderboardFilters,
  type LeaderboardPeriod,
} from "@/lib/leaderboards";
import {
  LeaderboardFilterDrawer,
  LeaderboardFilterPanel,
} from "./LeaderboardFilterPanel";
import { LeaderboardAbout } from "./LeaderboardAbout";
import { LeaderboardPodium } from "./LeaderboardPodium";
import { LeaderboardTable } from "./LeaderboardTable";
import { LeaderboardTabs } from "./LeaderboardTabs";
import { RankSummary } from "./RankSummary";
import { useStandings } from "./useStandings";

function activeFilterCount(f: LeaderboardFilters): number {
  return [f.category, f.difficulty, f.playerScope].filter((v) => v !== "all")
    .length;
}

/**
 * The leaderboard page.
 *
 * Every row is a real player, ranked by runs this server graded. When that is
 * two people, it says two people — the board used to pad itself with thirty
 * invented players and a 12,480-strong "population" so the numbers felt
 * impressive, and none of it was true.
 *
 * Standings name other players, so they are shown only to signed-in players.
 * A signed-out visitor gets an explanation and a way in rather than a board
 * that looks empty.
 */
export function LeaderboardsExplorer() {
  const [period, setPeriod] = useState<LeaderboardPeriod>(DEFAULT_PERIOD);
  const [filters, setFilters] = useState<LeaderboardFilters>(DEFAULT_FILTERS);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const standings = useStandings();
  // Memoised so the empty case is a stable reference — a fresh `[]` each render
  // would invalidate every downstream memo on every render.
  const rows = useMemo(
    () => (standings.status === "ready" ? standings.rows : []),
    [standings],
  );

  const { podium, rows: tableRows, total } = useMemo(
    () => getLeaderboard(rows, period, filters),
    [rows, period, filters],
  );

  const filterCount = activeFilterCount(filters);

  if (standings.status === "loading") {
    return (
      <div className="surface flex items-center justify-center gap-3 p-12 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.2} />
        Loading standings…
      </div>
    );
  }

  if (standings.status === "unauthenticated") {
    return (
      <div className="surface p-12 text-center">
        <h2 className="text-base font-semibold text-white">
          Sign in to see the standings
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">
          The leaderboard shows other players by name, so it is only visible to
          people with an account. Missions are free to play either way.
        </p>
        <Link
          href="/sign-in?next=%2Fleaderboards"
          className="mt-5 inline-flex items-center gap-2 rounded-xl border border-violet-400/40 bg-gradient-to-r from-violet-600 to-violet-500 px-6 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
        >
          Sign in with GitHub
        </Link>
      </div>
    );
  }

  if (standings.status === "failed") {
    return (
      <div className="surface p-12 text-center">
        <p className="text-sm text-slate-400">
          The standings couldn&apos;t be loaded just now.
        </p>
        <p className="mt-1 text-xs text-slate-600">
          Nothing is lost — refresh to try again.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Main column: controls → podium → table */}
        <div className="flex min-w-0 flex-col gap-6">
          <LeaderboardTabs period={period} onPeriod={setPeriod} total={total} />

          {total === 0 ? (
            <div className="surface p-12 text-center">
              <p className="text-sm text-slate-400">
                Nobody has finished an incident yet.
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Complete a mission and you&apos;ll be the first on the board.
              </p>
            </div>
          ) : (
            <>
              <LeaderboardPodium players={podium} />

              {/* Filters live in the aside on desktop; a drawer below that. */}
              <div className="flex items-center justify-between gap-3 xl:hidden">
                <span className="text-xs text-slate-500">
                  {total} ranked {total === 1 ? "player" : "players"}
                </span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-white/20"
                >
                  <SlidersHorizontal className="h-4 w-4" strokeWidth={2.1} />
                  Filters
                  {filterCount > 0 && (
                    <span className="grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-violet-500/25 px-1 text-[0.65rem] font-bold text-violet-200">
                      {filterCount}
                    </span>
                  )}
                </button>
              </div>

              {/* The table starts below the podium, so ranks 1–3 aren't repeated. */}
              <LeaderboardTable
                key={`${period}-${filters.category}-${filters.difficulty}-${filters.playerScope}`}
                players={tableRows}
              />
            </>
          )}
        </div>

        {/* Aside — drops below the table under xl */}
        <aside className="flex flex-col gap-4 xl:sticky xl:top-24 xl:self-start">
          <RankSummary rows={rows} period={period} />
          <div className="hidden xl:block">
            <LeaderboardFilterPanel value={filters} onApply={setFilters} />
          </div>
          <LeaderboardAbout />
        </aside>
      </div>

      {drawerOpen && (
        <LeaderboardFilterDrawer
          value={filters}
          onApply={setFilters}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </>
  );
}
