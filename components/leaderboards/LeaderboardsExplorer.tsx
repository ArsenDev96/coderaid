"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import {
  DEFAULT_FILTERS,
  DEFAULT_PERIOD,
  SCOPES,
  getLeaderboard,
  type LeaderboardFilters,
  type LeaderboardPeriod,
  type LeaderboardScope,
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
import { useIdentifiedPlayers } from "./useLeaderboardIdentity";

function activeFilterCount(f: LeaderboardFilters): number {
  return [f.category, f.difficulty, f.playerScope].filter((v) => v !== "all")
    .length;
}

export function LeaderboardsExplorer() {
  const [scope, setScope] = useState<LeaderboardScope>("global");
  const [period, setPeriod] = useState<LeaderboardPeriod>(DEFAULT_PERIOD);
  const [filters, setFilters] = useState<LeaderboardFilters>(DEFAULT_FILTERS);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { podium, rows, total } = useMemo(
    () => getLeaderboard(scope, period, filters),
    [scope, period, filters],
  );

  const identifiedPodium = useIdentifiedPlayers(podium);
  const identifiedRows = useIdentifiedPlayers(rows);
  const filterCount = activeFilterCount(filters);
  const scopeLabel = SCOPES.find((s) => s.id === scope)!.label;

  return (
    <>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Main column: scope → podium → table */}
        <div className="flex min-w-0 flex-col gap-6">
          <LeaderboardTabs
            scope={scope}
            onScope={setScope}
            period={period}
            onPeriod={setPeriod}
          />

          {total === 0 ? (
            <div className="surface p-12 text-center">
              <p className="text-sm text-slate-400">
                No {scopeLabel.toLowerCase()} rankings yet.
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Add teammates or switch to the Global board to see how you
                compare.
              </p>
            </div>
          ) : (
            <>
              <LeaderboardPodium players={identifiedPodium} />

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
                key={`${scope}-${period}-${filters.category}-${filters.difficulty}-${filters.playerScope}`}
                players={identifiedRows}
              />
            </>
          )}
        </div>

        {/* Aside — drops below the table under xl */}
        <aside className="flex flex-col gap-4 xl:sticky xl:top-24 xl:self-start">
          <RankSummary scope={scope} period={period} />
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
