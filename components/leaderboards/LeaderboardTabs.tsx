"use client";

import { CalendarRange, ChevronDown } from "lucide-react";
import {
  PERIODS,
  SCOPES,
  type LeaderboardPeriod,
  type LeaderboardScope,
} from "@/lib/leaderboards";

/** Scope tabs on the left, period selector on the right — the view's controls. */
export function LeaderboardTabs({
  scope,
  onScope,
  period,
  onPeriod,
}: {
  scope: LeaderboardScope;
  onScope: (s: LeaderboardScope) => void;
  period: LeaderboardPeriod;
  onPeriod: (p: LeaderboardPeriod) => void;
}) {
  return (
    <div className="surface flex flex-col gap-3 p-2 lg:flex-row lg:items-center lg:justify-between">
      <div
        role="tablist"
        aria-label="Leaderboard scope"
        className="thin-scroll flex gap-1 overflow-x-auto"
      >
        {SCOPES.map((s) => {
          const Icon = s.icon;
          const active = s.id === scope;
          return (
            <button
              key={s.id}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => onScope(s.id)}
              className={`flex shrink-0 items-center gap-2 rounded-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "border-violet-400 bg-violet-500/[0.08] text-white"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={1.9} />
              {s.label}
            </button>
          );
        })}
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
