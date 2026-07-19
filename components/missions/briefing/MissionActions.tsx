"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, FileText, Search } from "lucide-react";
import type { MissionBriefing } from "@/lib/missions";
import { AvailabilityNote } from "@/components/ui/AvailabilityBadge";
import type { Availability } from "@/lib/availability";
import { completeStage, touchRun } from "@/lib/run";

const DISABLED_LABEL: Partial<Record<Availability, string>> = {
  locked: "Mission Locked",
  "in-development": "In Development",
  "coming-soon": "Coming Soon",
  completed: "Review Unavailable",
};

/**
 * The briefing's action row. This is the last gate before a stage route, so the
 * primary CTA is a real `<button disabled>` — never a styled link — whenever
 * the mission has no authored investigation to enter.
 */
export function MissionActions({
  missionId,
  context,
  availability,
  blockedReason = null,
}: {
  missionId: string;
  context: MissionBriefing["context"];
  availability: Availability;
  /** Non-null means the primary action must stay disabled, and why. */
  blockedReason?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const startable = blockedReason === null;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Primary — strongest action on the page */}
        {startable ? (
          <Link
            href={`/missions/${missionId}/investigation`}
            onClick={() => {
              // Reading the briefing is the first stage, and starting the
              // investigation is what puts a clock on the run.
              touchRun(missionId);
              completeStage(missionId, "Briefing");
            }}
            className="group inline-flex w-full items-center justify-center gap-2.5 rounded-xl border border-violet-400/40 bg-gradient-to-r from-violet-600 to-violet-500 px-8 py-4 text-base font-semibold text-white shadow-neon transition-transform hover:scale-[1.02] sm:w-auto"
          >
            <Search className="h-5 w-5" strokeWidth={2.2} />
            Start Investigation
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ) : (
          <button
            type="button"
            disabled
            aria-describedby="mission-blocked-note"
            className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-8 py-4 text-base font-semibold text-slate-500 sm:w-auto"
          >
            {DISABLED_LABEL[availability] ?? "Unavailable"}
          </button>
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

      {!startable && (
        <div id="mission-blocked-note">
          <AvailabilityNote
            status={availability}
            note={blockedReason}
            className="mt-3"
          />
        </div>
      )}

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
