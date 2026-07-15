"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, FileText, Lock, Search } from "lucide-react";
import type { MissionBriefing } from "@/lib/missions";

export function MissionActions({
  missionId,
  context,
  locked = false,
}: {
  missionId: string;
  context: MissionBriefing["context"];
  locked?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Primary — strongest action on the page */}
        {locked ? (
          <span className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-8 py-4 text-base font-semibold text-slate-500 sm:w-auto">
            <Lock className="h-5 w-5" />
            Mission Locked
          </span>
        ) : (
          <Link
            href={`/missions/${missionId}/investigation`}
            className="group inline-flex w-full items-center justify-center gap-2.5 rounded-xl border border-violet-400/40 bg-gradient-to-r from-violet-600 to-violet-500 px-8 py-4 text-base font-semibold text-white shadow-neon transition-transform hover:scale-[1.02] sm:w-auto"
          >
            <Search className="h-5 w-5" strokeWidth={2.2} />
            Start Investigation
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}

        {/* Secondary — deliberately quieter */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mission-details"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-6 py-4 text-sm font-semibold text-slate-200 transition-colors hover:border-white/25 hover:text-white sm:w-auto"
        >
          <FileText className="h-4 w-4" />
          View Mission Details
          <ChevronDown
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {open && (
        <div
          id="mission-details"
          className="mt-4 rounded-2xl border border-white/[0.06] bg-base-950/50 p-4 sm:p-5"
        >
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {context.map((item) => (
              <div key={item.label}>
                <dt className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {item.label}
                </dt>
                <dd className="mt-1 font-mono text-sm text-slate-200">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
