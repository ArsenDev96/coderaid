"use client";

import { useEffect, useRef } from "react";
import { RotateCcw, TriangleAlert, X } from "lucide-react";

/**
 * Confirmation for restarting an investigation.
 *
 * Restarting is destructive in one direction only, and the copy says which:
 * the local working state goes, the recorded attempts do not. That distinction
 * is the whole reason this dialog exists — a player who has already completed
 * this mission once has server-side runs behind it, and "restart" must not read
 * as "give the score back".
 *
 * Modelled on `components/settings/ResetProgressDialog.tsx` so the two
 * destructive confirmations in the app behave identically: Escape closes,
 * focus lands on the safe choice, and the backdrop is a labelled cancel.
 */
export function RestartInvestigationDialog({
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
        aria-labelledby="restart-investigation-title"
        aria-describedby="restart-investigation-body"
        className="relative max-h-[90vh] w-full overflow-y-auto rounded-t-2xl border border-white/10 bg-base-950/95 p-5 backdrop-blur-xl sm:m-4 sm:max-w-md sm:rounded-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-amber-400/30 bg-amber-500/10 text-amber-300">
              <TriangleAlert className="h-5 w-5" strokeWidth={2} />
            </span>
            <h2
              id="restart-investigation-title"
              className="text-base font-bold text-white"
            >
              Restart this investigation?
            </h2>
          </div>
          {/* Labelled "Close" rather than "Cancel" so the dialog does not
              contain two controls with the same accessible name. */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.02] text-slate-400 transition-colors hover:border-white/20 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p
          id="restart-investigation-body"
          className="mt-4 text-sm leading-relaxed text-slate-400"
        >
          This clears collected evidence and all later choices for this mission.
          Your earned server progress and previous attempts will not be deleted.
        </p>

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
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/15 px-5 py-2.5 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/25 sm:w-auto"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={2.2} />
            Restart Investigation
          </button>
        </div>
      </div>
    </div>
  );
}
