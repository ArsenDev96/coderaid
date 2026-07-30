"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck, Star } from "lucide-react";
import { AvailabilityBadge } from "@/components/ui/AvailabilityBadge";
import { useProgress } from "@/components/progress/ProgressProvider";
import { careerFor } from "@/lib/dashboard";

export function CareerProgress() {
  const { ledger } = useProgress();
  // One XP number for the whole dashboard — the ledger's — with the ceiling
  // taken from the next rank's published threshold.
  const c = careerFor(ledger);
  const xp = c.xp;
  const pct = c.rankPct;

  return (
    <div className="surface flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-300" strokeWidth={2} />
        <h2 className="text-lg font-semibold text-white">Node.js Progress</h2>
      </div>
      <p className="mt-2 text-sm text-slate-400">{c.blurb}</p>

      {/* Rank → next rank */}
      <div className="mt-5 flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-emerald-400/40 bg-emerald-500/10 text-emerald-300">
          <Star className="h-4 w-4" fill="currentColor" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="text-sm font-semibold text-white">
              {c.currentRank}
            </span>
          </div>
          <div className="font-mono text-xs text-slate-400">
            {xp.toLocaleString("en-US")}
            {c.atTopRank ? " XP" : ` / ${c.xpMax.toLocaleString("en-US")} XP`}
          </div>
        </div>
        <div className="hidden min-w-0 flex-1 sm:block">
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        {!c.atTopRank && (
          <div className="hidden shrink-0 items-center gap-2 lg:flex">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-500">
              <Star className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div
                className={`text-sm ${
                  c.nextIsRoadmap ? "text-slate-500" : "text-slate-400"
                }`}
              >
                {c.nextRank}
              </div>
              {/* The next rank exists but no amount of play reaches it yet, so
                  it is named as roadmap rather than as this player's goal. */}
              {c.nextIsRoadmap && <AvailabilityBadge status="coming-soon" />}
            </div>
          </div>
        )}
      </div>

      {/* Mobile bar */}
      <div className="mt-4 sm:hidden">
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
            style={{ width: `${pct}%` }}
          />
        </div>
        {!c.atTopRank && (
          <div className="mt-2 text-xs text-slate-500">
            {c.nextIsRoadmap ? `Coming soon: ${c.nextRank}` : `Next: ${c.nextRank}`}
          </div>
        )}
      </div>

      <div className="mt-auto pt-5">
        <Link
          href="/missions"
          className="group inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-white/25 hover:text-white"
        >
          View Node.js Path
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
