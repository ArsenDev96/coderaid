"use client";

import { Check } from "lucide-react";
import type { DiagnosisEvidenceOption } from "@/lib/diagnosis";
import { EVIDENCE_SOURCE_META } from "@/lib/investigation";

/** Multi-select over the findings carried across from the investigation. */
export function DiagnosisEvidenceList({
  options,
  selectedIds,
  minimumRequired,
  onToggle,
}: {
  options: DiagnosisEvidenceOption[];
  selectedIds: string[];
  minimumRequired: number;
  onToggle: (id: string) => void;
}) {
  const enough = selectedIds.length >= minimumRequired;

  return (
    <section className="flex flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3
          id="evidence-heading"
          className="text-sm font-semibold text-white sm:text-base"
        >
          Select Supporting Evidence
        </h3>
        <span
          aria-live="polite"
          className={`shrink-0 text-xs font-medium ${
            enough ? "text-emerald-300" : "text-slate-500"
          }`}
        >
          {selectedIds.length} selected
        </span>
      </div>

      <ul
        aria-labelledby="evidence-heading"
        className="mt-4 flex flex-col gap-2.5"
      >
        {options.map((option) => {
          const source = EVIDENCE_SOURCE_META[option.source];
          const Icon = source.icon;
          const selected = selectedIds.includes(option.id);

          return (
            <li key={option.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={selected}
                onClick={() => onToggle(option.id)}
                className={`flex w-full items-start gap-3.5 rounded-xl border p-3.5 text-left transition-colors ${
                  selected
                    ? "border-violet-400/50 bg-violet-500/[0.10]"
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/15"
                }`}
              >
                <span
                  aria-hidden
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${source.cls}`}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.9} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-[0.62rem] font-medium uppercase tracking-[0.1em] text-slate-500">
                    {source.label}
                  </span>
                  <span className="mt-0.5 block text-sm font-semibold text-slate-100">
                    {option.title}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-400">
                    {option.description}
                  </span>
                </span>

                {/* Checkbox mark */}
                <span
                  aria-hidden
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors ${
                    selected
                      ? "border-violet-400 bg-violet-500 text-white"
                      : "border-white/20 bg-white/[0.03]"
                  }`}
                >
                  {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 rounded-xl border border-white/[0.06] bg-base-950/40 p-3 text-center text-xs leading-relaxed text-slate-400">
        Select at least {minimumRequired} pieces of evidence that support your
        diagnosis.
      </p>
    </section>
  );
}
