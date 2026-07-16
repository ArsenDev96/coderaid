"use client";

import { useState } from "react";
import { Lightbulb } from "lucide-react";

/** Opt-in nudge. The copy points at the reasoning, never at the answer. */
export function DiagnosisHint({ hint }: { hint: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:text-right">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
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
