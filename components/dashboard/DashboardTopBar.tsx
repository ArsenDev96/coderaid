"use client";

import type { ReactNode } from "react";
import { BarChart3, ChevronDown, Flame, Menu, Zap } from "lucide-react";
import { DEMO_PLAYER } from "@/lib/dashboard";
import { usePlayer } from "./usePlayer";

function StatPill({
  icon,
  value,
  label,
  tone,
}: {
  icon: ReactNode;
  value: string;
  label: string;
  tone: string;
}) {
  return (
    <span className="hidden items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2 md:flex">
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tone}`}>
        {icon}
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-bold text-white">{value}</span>
        <span className="block text-[0.65rem] text-slate-500">{label}</span>
      </span>
    </span>
  );
}

export function DashboardTopBar({
  onMenu,
  left,
}: {
  onMenu?: () => void;
  left?: ReactNode;
}) {
  const { avatar } = usePlayer();
  const AvatarIcon = avatar.icon;

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-base-950/80 backdrop-blur-xl">
      <div className="flex min-h-[4.5rem] items-center justify-between gap-3 px-4 py-3 sm:px-6">
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

        <div className="flex shrink-0 items-center gap-2.5">
          <StatPill
            icon={<Flame className="h-4 w-4 text-amber-400" />}
            value={String(DEMO_PLAYER.streakDays)}
            label="Day Streak"
            tone="border border-amber-400/25 bg-amber-500/10"
          />
          <StatPill
            icon={<Zap className="h-4 w-4 text-amber-300" fill="currentColor" />}
            value={DEMO_PLAYER.totalXp.toLocaleString("en-US")}
            label="Total XP"
            tone="border border-amber-400/25 bg-amber-500/10"
          />
          <StatPill
            icon={<BarChart3 className="h-4 w-4 text-violet-300" />}
            value={DEMO_PLAYER.rank}
            label={`Level ${DEMO_PLAYER.level}`}
            tone="border border-violet-400/25 bg-violet-500/10"
          />

          <button
            type="button"
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1.5 transition-colors hover:border-white/20"
            aria-label="Account menu"
          >
            <span
              className={`grid h-9 w-9 place-items-center rounded-lg border border-violet-400/40 bg-gradient-to-br ${avatar.gradient}`}
            >
              <AvatarIcon className="h-5 w-5 text-white" strokeWidth={1.8} />
            </span>
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </button>
        </div>
      </div>
    </header>
  );
}
