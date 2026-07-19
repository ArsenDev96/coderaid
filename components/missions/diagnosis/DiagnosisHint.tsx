"use client";

import { useState } from "react";
import { Lightbulb } from "lucide-react";
import { recordHint } from "@/lib/run";

/**
 * Opt-in nudge. The copy points at the reasoning, never at the answer — but
 * opening it is recorded against the run, because it costs score.
 */
export function DiagnosisHint({
  hint,
  missionId,
}: {
  hint: string;
  missionId: string;
}) {
  const [open, setOpen] = useState(false);

  // Recorded the first time only: closing and re-opening isn't a second hint.
  const toggle = () =>
    setOpen((isOpen) => {
      if (!isOpen) recordHint(missionId, "diagnosis");
      return !isOpen;
    });

  return (
    <div className="sm:text-right">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="diagnosis-hint"
        className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
          open
            ? "border-violet-400/50 bg-violet-500/15 text-violet-100"
            : "border-violet-400/30 bg-violet-500/[0.06] text-violet-200 hover:border-violet-400/50"
        }`}
      >
        <Lightbulb className="h-4 w-4" strokeWidth={2.2} />
        Need a hint?
      </button>

      {open && (
        <p
          id="diagnosis-hint"
          className="mt-3 max-w-sm rounded-xl border border-violet-400/20 bg-violet-500/[0.06] p-3.5 text-left text-xs leading-relaxed text-slate-300 sm:ml-auto"
        >
          {hint}
        </p>
      )}
    </div>
  );
}
