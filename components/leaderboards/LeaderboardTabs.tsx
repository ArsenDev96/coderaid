"use client";

import { CalendarRange, ChevronDown, Globe } from "lucide-react";
import { PERIODS, type LeaderboardPeriod } from "@/lib/leaderboards";

/**
 * The board's controls: what it covers on the left, which period on the right.
 *
 * There used to be four scope tabs — Global, Friends, Country, Company. Three
 * of them had nothing to filter on: there is no friends graph, and a player has
 * no country or company. They ranked a fixed roster of invented people whose
 * countries were authored to make the tabs look populated. With the roster gone
 * they would have been tabs that did nothing, so only Global remains, stated
 * once as a label rather than offered as a choice between one thing.
 */
export function LeaderboardTabs({
  period,
  onPeriod,
  total,
}: {
  period: LeaderboardPeriod;
  onPeriod: (p: LeaderboardPeriod) => void;
  /** Ranked players, shown plainly however small the number is. */
  total: number;
}) {
  return (
    <div className="surface flex flex-col gap-3 p-2 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex shrink-0 items-center gap-2 rounded-lg border-b-2 border-violet-400 bg-violet-500/[0.08] px-4 py-2.5 text-sm font-medium text-white lg:ml-1">
        <Globe className="h-4 w-4" strokeWidth={1.9} />
        Global
        <span className="text-xs font-normal text-slate-400">
          · {total} ranked {total === 1 ? "player" : "players"}
        </span>
      </div>

      <div className="relative shrink-0 lg:mr-1">
        <CalendarRange className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <select
          value={period}
          onChange={(e) => onPeriod(e.target.value as LeaderboardPeriod)}
          aria-label="Time period"
          className="w-full appearance-none rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-9 pr-9 text-sm font-medium text-slate-200 outline-none transition-colors hover:border-white/20 focus:border-violet-400/60 lg:w-44"
        >
          {PERIODS.map((p) => (
            <option key={p.id} value={p.id} className="bg-base-900">
              {p.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      </div>
    </div>
  );
}
