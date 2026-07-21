"use client";

import { useEffect, useRef } from "react";
import { RotateCcw, TriangleAlert, X } from "lucide-react";

/**
 * Confirmation for the one destructive action on this page. Spells out what is
 * cleared *and* what is kept, so the choice is made with full information
 * rather than a generic "are you sure".
 *
 * What that is depends on where progress lives. Signed in, the ledger derives
 * from an append-only run history in Postgres, so a local sweep clears the
 * saved stage state and nothing else — the earned numbers stay. Saying
 * otherwise would be the one thing this dialog exists to prevent.
 */
export function ResetProgressDialog({
  onConfirm,
  onClose,
  authenticated,
}: {
  onConfirm: () => void;
  onClose: () => void;
  /** True when progress is server-backed, which changes what a reset can do. */
  authenticated: boolean;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // Focus the safe choice, not the destructive one.
    cancelRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center">
      <button
        type="button"
        aria-label="Cancel"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Bottom sheet on mobile, centred dialog from sm up */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="reset-title"
        aria-describedby="reset-body"
        className="relative w-full max-h-[90vh] overflow-y-auto rounded-t-2xl border border-white/10 bg-base-950/95 p-5 backdrop-blur-xl sm:m-4 sm:max-w-md sm:rounded-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-rose-400/30 bg-rose-500/10 text-rose-300">
              <TriangleAlert className="h-5 w-5" strokeWidth={2} />
            </span>
            <h2 id="reset-title" className="text-base font-bold text-white">
              {authenticated
                ? "Clear saved mission state?"
                : "Reset mission progress?"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cancel"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.02] text-slate-400 transition-colors hover:border-white/20 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div id="reset-body" className="mt-4 text-sm leading-relaxed text-slate-400">
          {authenticated
            ? "This clears what you saved while working through each incident, so every mission starts again from its briefing. It cannot be undone."
            : "This clears your progress through every Node.js incident — investigations, diagnoses, fixes and the rewards they earned. It cannot be undone."}
        </div>

        <ul className="mt-4 space-y-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 text-xs">
          {authenticated ? (
            <>
              <li className="text-slate-300">
                <span className="font-semibold text-white">Cleared:</span> your
                saved investigation, diagnosis and fix for every mission, so
                each one replays from the start.
              </li>
              <li className="text-slate-300">
                <span className="font-semibold text-white">Kept:</span> every
                run you completed, and the XP, level, rank, streak, skills and
                achievements earned from them. Your run history is a record, not
                a scoreboard that can be wiped.
              </li>
              <li className="text-slate-300">
                <span className="font-semibold text-white">Replaying</span> a
                mission can only improve a score — a worse attempt is recorded
                but changes nothing.
              </li>
            </>
          ) : (
            <>
              <li className="text-slate-300">
                <span className="font-semibold text-white">Cleared:</span> your
                XP, level, rank, streak, every skill&apos;s XP, and every
                completed incident. You start again from zero.
              </li>
              <li className="text-slate-300">
                <span className="font-semibold text-white">Kept:</span> your
                profile name, avatar, and these settings.
              </li>
              <li className="text-slate-300">
                <span className="font-semibold text-white">Recalculated:</span>{" "}
                achievements and leaderboard position, which follow your
                progress.
              </li>
            </>
          )}
        </ul>

        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-white/20 sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-400/40 bg-rose-500/15 px-5 py-2.5 text-sm font-semibold text-rose-200 transition-colors hover:bg-rose-500/25 sm:w-auto"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={2.2} />
            {authenticated ? "Clear Saved State" : "Reset Progress"}
          </button>
        </div>
      </div>
    </div>
  );
}
