"use client";

import Link from "next/link";
import { ExternalLink, MessageCircle, X } from "lucide-react";
import { DEMO_PLAYER, SIDEBAR_ITEMS } from "@/lib/dashboard";
import { Logo } from "@/components/ui/Logo";

export function DashboardSidebar({
  active = "Dashboard",
  open = false,
  onClose,
}: {
  active?: string;
  open?: boolean;
  onClose?: () => void;
}) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col gap-4 overflow-y-auto border-r border-white/[0.06] bg-base-950/95 p-4 transition-transform duration-300 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-64 lg:translate-x-0 lg:bg-base-950/40 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <Logo withTagline />
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-slate-300 lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="mt-2 flex flex-col gap-1">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.label === active;
            const className = `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-gradient-to-r from-violet-600/30 to-electric-500/10 text-white shadow-neon"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`;
            const inner = (
              <>
                <Icon className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.9} />
                {item.label}
              </>
            );
            return item.href ? (
              <Link
                key={item.label}
                href={item.href}
                onClick={onClose}
                aria-current={isActive ? "page" : undefined}
                className={className}
              >
                {inner}
              </Link>
            ) : (
              <button key={item.label} type="button" className={className}>
                {inner}
              </button>
            );
          })}
        </nav>

        {/* Rank card */}
        <div className="mt-2 surface p-4 text-center">
          <div className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Current Rank
          </div>
          <div className="mt-1 text-base font-semibold text-violet-300">
            {DEMO_PLAYER.rank}
          </div>

          <div className="relative mx-auto mt-3 grid h-24 w-24 place-items-center">
            <svg viewBox="0 0 100 100" className="h-24 w-24 drop-shadow-[0_0_16px_rgba(139,92,246,0.45)]">
              <polygon
                points="50,4 92,27 92,73 50,96 8,73 8,27"
                fill="rgba(139,92,246,0.08)"
                stroke="rgba(167,139,250,0.7)"
                strokeWidth="3"
              />
            </svg>
            <span className="absolute text-3xl font-bold text-white">
              {DEMO_PLAYER.level}
            </span>
          </div>

          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-electric-400 to-violet-500"
              style={{ width: `${DEMO_PLAYER.levelPct}%` }}
            />
          </div>
          <div className="mt-2 font-mono text-xs text-slate-300">
            {DEMO_PLAYER.xpIntoLevel.toLocaleString()} /{" "}
            {DEMO_PLAYER.xpForLevel.toLocaleString()} XP
          </div>
          <div className="text-[0.7rem] text-slate-500">
            {DEMO_PLAYER.xpToNext} XP to next level
          </div>
        </div>

        {/* Discord */}
        <a
          href="/demo"
          className="mt-auto flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3.5 transition-colors hover:border-violet-500/30"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-violet-500/25 bg-violet-500/10 text-violet-300">
            <MessageCircle className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block text-sm font-semibold text-white">
              Need help?
            </span>
            <span className="block text-xs text-slate-400">Join our Discord</span>
          </span>
          <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
        </a>
      </aside>
    </>
  );
}
