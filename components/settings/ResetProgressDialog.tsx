"use client";

import { useEffect, useRef } from "react";
import { RotateCcw, TriangleAlert, X } from "lucide-react";

/**
 * Confirmation for the one destructive action on this page. Spells out what is
 * cleared *and* what is kept, so the choice is made with full information
 * rather than a generic "are you sure".
 */
export function ResetProgressDialog({
  onConfirm,
  onClose,
}: {
  onConfirm: () => void;
  onClose: () => void;
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
              Reset mission progress?
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
          This clears your progress through every mission — investigations,
          diagnoses, fixes and claimed rewards. It cannot be undone.
        </div>

        <ul className="mt-4 space-y-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 text-xs">
          <li className="text-slate-300">
            <span className="font-semibold text-white">Kept:</span> your profile
            name, avatar, and these settings.
          </li>
          <li className="text-slate-300">
            <span className="font-semibold text-white">Recalculated:</span>{" "}
            achievements, which follow your mission progress.
          </li>
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
            Reset Progress
          </button>
        </div>
      </div>
    </div>
  );
}
