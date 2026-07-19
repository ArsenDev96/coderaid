"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Lightbulb } from "lucide-react";
import { recordHint } from "@/lib/run";

/**
 * The way out of the fix stage. Stays reachable on stacked layouts, where the
 * actions would otherwise sit below a long explanation column.
 */
export function FixActions({
  missionId,
  hint,
  ready,
  onApply,
}: {
  missionId: string;
  hint: string;
  ready: boolean;
  onApply: () => void;
}) {
  const [hintOpen, setHintOpen] = useState(false);

  // Opening a hint costs score, so it has to be recorded the first time it is
  // opened — closing and re-opening the same hint is not a second cost.
  const toggleHint = () => {
    setHintOpen((open) => {
      if (!open) recordHint(missionId, "fix");
      return !open;
    });
  };

  return (
    <div className="max-lg:sticky max-lg:bottom-3 max-lg:z-20">
      <div className="rounded-2xl border border-white/[0.06] bg-base-900/90 p-4 backdrop-blur sm:p-5">
        {hintOpen && (
          <p
            id="fix-hint"
            className="mb-4 rounded-xl border border-violet-400/20 bg-violet-500/[0.06] p-3.5 text-sm leading-relaxed text-slate-300"
          >
            {hint}
          </p>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Hint */}
          <button
            type="button"
            onClick={toggleHint}
            aria-expanded={hintOpen}
            aria-controls="fix-hint"
            className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
              hintOpen
                ? "border-violet-400/50 bg-violet-500/15 text-violet-100"
                : "border-violet-400/30 bg-violet-500/[0.06] text-violet-200 hover:border-violet-400/50"
            }`}
          >
            <Lightbulb className="h-4 w-4" strokeWidth={2.2} />
            Need a hint?
          </button>

          {/* Navigation */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={`/missions/${missionId}/diagnosis`}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-6 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-white/25 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Diagnosis
            </Link>

            <div className="sm:text-right">
              {ready ? (
                <Link
                  href={`/missions/${missionId}/verification`}
                  onClick={onApply}
                  className="group inline-flex w-full items-center justify-center gap-2.5 rounded-xl border border-violet-400/40 bg-gradient-to-r from-violet-600 to-violet-500 px-8 py-3 text-sm font-semibold text-white shadow-neon transition-transform hover:scale-[1.02] sm:w-auto"
                >
                  Apply Fix &amp; Continue
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  aria-describedby="fix-gate-hint"
                  className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-8 py-3 text-sm font-semibold text-slate-500 sm:w-auto"
                >
                  Apply Fix &amp; Continue
                </button>
              )}
              <p
                id="fix-gate-hint"
                className="mt-2 text-center text-xs text-slate-500 sm:text-right"
              >
                {ready
                  ? "You'll verify the fix in the next step."
                  : "Select a fix to continue."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
