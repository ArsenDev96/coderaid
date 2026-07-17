"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  ROWS_PER_PAGE,
  formatXp,
  type LeaderboardPlayer,
} from "@/lib/leaderboards";
import { PlayerAvatar } from "./PlayerAvatar";

/** Success rate reads as a grade, so it earns a colour rather than a bare number. */
function successTone(rate: number): string {
  if (rate >= 75) return "text-emerald-300";
  if (rate >= 60) return "text-electric-300";
  return "text-amber-300";
}

/**
 * The ranked table below the podium. Scrolls horizontally on narrow screens so
 * every column stays readable instead of collapsing into unreadable columns.
 */
export function LeaderboardTable({ players }: { players: LeaderboardPlayer[] }) {
  const [page, setPage] = useState(1);

  const pageCount = Math.max(1, Math.ceil(players.length / ROWS_PER_PAGE));
  // Guards against a stale page if the list shrinks under the current page.
  const current = Math.min(page, pageCount);
  const start = (current - 1) * ROWS_PER_PAGE;
  const rows = players.slice(start, start + ROWS_PER_PAGE);

  if (players.length === 0) {
    return (
      <div className="surface p-10 text-center">
        <p className="text-sm text-slate-400">No players match your filters.</p>
        <p className="mt-1 text-xs text-slate-600">
          Try widening the category, difficulty, or player scope.
        </p>
      </div>
    );
  }

  return (
    <div className="surface overflow-hidden">
      <div className="thin-scroll overflow-x-auto">
        <table className="w-full min-w-[42rem] border-collapse text-sm">
          <caption className="sr-only">
            Player rankings, ordered by XP earned in the selected period
          </caption>
          <thead>
            <tr className="border-b border-white/[0.06] text-left text-xs text-slate-500">
              <th scope="col" className="w-16 py-3.5 pl-5 pr-2 font-medium">
                #
              </th>
              <th scope="col" className="px-2 py-3.5 font-medium">
                Player
              </th>
              <th scope="col" className="px-2 py-3.5 text-center font-medium">
                Level
              </th>
              <th scope="col" className="px-2 py-3.5 text-right font-medium">
                XP
              </th>
              <th scope="col" className="px-2 py-3.5 text-right font-medium">
                Missions
              </th>
              <th scope="col" className="py-3.5 pl-2 pr-5 text-right font-medium">
                Success Rate
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr
                key={p.id}
                aria-current={p.isCurrentUser ? "true" : undefined}
                className={`border-b border-white/[0.04] last:border-0 transition-colors ${
                  p.isCurrentUser
                    ? "bg-violet-500/[0.12] shadow-[inset_3px_0_0_0_#a78bfa]"
                    : "hover:bg-white/[0.03]"
                }`}
              >
                <td className="py-3.5 pl-5 pr-2">
                  <span
                    className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${
                      p.isCurrentUser
                        ? "border border-violet-400/60 bg-violet-500/25 text-violet-100"
                        : "text-slate-500"
                    }`}
                  >
                    {p.rank}
                  </span>
                </td>
                <td className="px-2 py-3.5">
                  <div className="flex items-center gap-3">
                    <PlayerAvatar avatar={p.avatar} className="border-white/10" />
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-white">
                        {p.username}
                        {p.isCurrentUser && (
                          <span className="ml-1.5 text-violet-300">(You)</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">Level {p.level}</div>
                    </div>
                  </div>
                </td>
                <td className="px-2 py-3.5 text-center">
                  <span className="inline-block min-w-[2rem] rounded-md border border-violet-400/25 bg-violet-500/10 px-2 py-0.5 text-xs font-semibold text-violet-200">
                    {p.level}
                  </span>
                </td>
                <td className="px-2 py-3.5 text-right font-mono font-semibold text-violet-300">
                  {formatXp(p.xp)}
                </td>
                <td className="px-2 py-3.5 text-right font-mono text-slate-300">
                  {p.missionsCompleted}
                </td>
                <td
                  className={`py-3.5 pl-2 pr-5 text-right font-mono font-semibold ${successTone(p.successRate)}`}
                >
                  {p.successRate}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <nav
          aria-label="Leaderboard pages"
          className="flex items-center justify-center gap-1.5 border-t border-white/[0.06] px-4 py-3.5"
        >
          <PageButton
            onClick={() => setPage(current - 1)}
            disabled={current === 1}
            label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </PageButton>

          {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPage(n)}
              aria-current={n === current ? "page" : undefined}
              className={`h-8 min-w-[2rem] rounded-lg border px-2 text-xs font-semibold transition-colors ${
                n === current
                  ? "border-violet-400/50 bg-violet-500/20 text-white"
                  : "border-white/[0.08] bg-white/[0.02] text-slate-400 hover:border-white/20 hover:text-white"
              }`}
            >
              {n}
            </button>
          ))}

          <PageButton
            onClick={() => setPage(current + 1)}
            disabled={current === pageCount}
            label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </PageButton>
        </nav>
      )}
    </div>
  );
}

function PageButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid h-8 w-8 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.02] text-slate-400 transition-colors hover:border-white/20 hover:text-white disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}
