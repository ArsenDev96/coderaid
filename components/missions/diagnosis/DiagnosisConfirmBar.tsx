"use client";

import Link from "next/link";
import { ArrowRight, CircleHelp } from "lucide-react";

/**
 * The way out. Stays reachable on stacked layouts, where the action would
 * otherwise sit below a long evidence column.
 */
export function DiagnosisConfirmBar({
  missionId,
  ready,
  rootCauseChosen,
  evidenceNeeded,
  onConfirm,
}: {
  missionId: string;
  ready: boolean;
  rootCauseChosen: boolean;
  evidenceNeeded: number;
  onConfirm: () => void;
}) {
  // Name the one thing still missing rather than a generic "complete the form".
  const blocker = !rootCauseChosen
    ? "Select a root cause to continue."
    : evidenceNeeded > 0
      ? `Select ${evidenceNeeded} more ${evidenceNeeded === 1 ? "piece" : "pieces"} of evidence to continue.`
      : null;

  return (
    <div className="max-lg:sticky max-lg:bottom-3 max-lg:z-20">
      <div className="rounded-2xl border border-white/[0.06] bg-base-900/90 p-4 backdrop-blur sm:p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          {/* Framing: what a good diagnosis is */}
          <div className="flex min-w-0 gap-3">
            <span
              aria-hidden
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-violet-400/30 bg-violet-500/10 text-violet-300"
            >
              <CircleHelp className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white">
                About Your Diagnosis
              </h3>
              <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-400">
                Choose the root cause that best fits all the evidence you
                collected. A good diagnosis explains the problem and matches the
                data. You can change your answer later if needed.
              </p>
            </div>
          </div>

          <div className="shrink-0 lg:text-right">
            {ready ? (
              <Link
                href={`/missions/${missionId}/fix`}
                onClick={onConfirm}
                className="group inline-flex w-full items-center justify-center gap-2.5 rounded-xl border border-violet-400/40 bg-gradient-to-r from-violet-600 to-violet-500 px-8 py-3.5 text-sm font-semibold text-white shadow-neon transition-transform hover:scale-[1.02] lg:w-auto"
              >
                Confirm Diagnosis
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ) : (
              <button
                type="button"
                disabled
                aria-describedby="diagnosis-gate-hint"
                className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-8 py-3.5 text-sm font-semibold text-slate-500 lg:w-auto"
              >
                Confirm Diagnosis
              </button>
            )}

            <p
              id="diagnosis-gate-hint"
              className="mt-2.5 text-center text-xs text-slate-500 lg:text-right"
            >
              {blocker ?? "You can review your answer on the next step."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
