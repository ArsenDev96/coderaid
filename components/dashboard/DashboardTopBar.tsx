"use client";

import type { ReactNode } from "react";
import { ChevronDown, Flame, Menu, Zap } from "lucide-react";
import { DEMO_PLAYER } from "@/lib/dashboard";
import { usePlayer } from "./usePlayer";

export function DashboardTopBar({
  onMenu,
  left,
}: {
  onMenu?: () => void;
  left?: ReactNode;
}) {
  const { name, avatar } = usePlayer();
  const AvatarIcon = avatar.icon;

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-base-950/80 backdrop-blur-xl">
      <div className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenu}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 text-slate-200 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          {left && <div className="min-w-0">{left}</div>}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 sm:flex">
            <Flame className="h-4 w-4 text-amber-400" />
            <span className="leading-tight">
              <span className="block text-sm font-bold text-white">
                {DEMO_PLAYER.streakDays}
              </span>
              <span className="block text-[0.6rem] text-slate-500">
                Day Streak
              </span>
            </span>
          </span>
          <span className="hidden items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 sm:flex">
            <Zap className="h-4 w-4 text-violet-300" />
            <span className="leading-tight">
              <span className="block text-sm font-bold text-white">
                {DEMO_PLAYER.totalXp.toLocaleString()}
              </span>
              <span className="block text-[0.6rem] text-slate-500">Total XP</span>
            </span>
          </span>

          <button
            type="button"
            className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] py-1.5 pl-1.5 pr-2.5 transition-colors hover:border-white/20"
          >
            <span
              className={`grid h-9 w-9 place-items-center rounded-lg border border-violet-400/40 bg-gradient-to-br ${avatar.gradient}`}
            >
              <AvatarIcon className="h-5 w-5 text-white" strokeWidth={1.8} />
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-sm font-semibold text-white">
                {name}
              </span>
              <span className="block text-[0.68rem] text-slate-400">
                {DEMO_PLAYER.rank}
              </span>
            </span>
            <ChevronDown className="hidden h-4 w-4 text-slate-500 sm:block" />
          </button>
        </div>
      </div>
    </header>
  );
}
