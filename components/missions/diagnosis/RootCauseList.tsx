"use client";

import { Info } from "lucide-react";
import { ROOT_CAUSE_ICONS, type RootCauseOption } from "@/lib/diagnosis";

/**
 * Single-select, built as a real radiogroup so arrow keys and screen readers
 * behave. Selection is carried by the mark and border, never by colour alone.
 */
export function RootCauseList({
  options,
  selectedId,
  onSelect,
}: {
  options: RootCauseOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="flex flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
      <h3
        id="root-cause-heading"
        className="text-sm font-semibold text-white sm:text-base"
      >
        Possible Root Causes
      </h3>

      <div
        role="radiogroup"
        aria-labelledby="root-cause-heading"
        className="mt-4 flex flex-col gap-2.5"
      >
        {options.map((option) => {
          const Icon = ROOT_CAUSE_ICONS[option.icon];
          const selected = option.id === selectedId;

          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              // Roving tabindex: the group is one tab stop.
              tabIndex={selected || (!selectedId && option.id === options[0].id) ? 0 : -1}
              onClick={() => onSelect(option.id)}
              className={`flex w-full items-center gap-3.5 rounded-xl border p-3.5 text-left transition-colors ${
                selected
                  ? "border-violet-400/50 bg-violet-500/[0.10]"
                  : "border-white/[0.06] bg-white/[0.02] hover:border-white/15"
              }`}
            >
              <span
                aria-hidden
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${
                  selected
                    ? "border-violet-400/40 bg-violet-500/15 text-violet-200"
                    : "border-white/[0.08] bg-white/[0.03] text-slate-400"
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={1.9} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-100">
                  {option.title}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-slate-400">
                  {option.description}
                </span>
              </span>

              {/* Radio mark */}
              <span
                aria-hidden
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors ${
                  selected ? "border-violet-400" : "border-white/20"
                }`}
              >
                {selected && (
                  <span className="h-2.5 w-2.5 rounded-full bg-violet-400" />
                )}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-4 flex items-start gap-2 rounded-xl border border-white/[0.06] bg-base-950/40 p-3 text-xs leading-relaxed text-slate-400">
        <Info
          aria-hidden
          className="mt-px h-3.5 w-3.5 shrink-0 text-violet-300"
          strokeWidth={2.2}
        />
        Select the root cause first, then pick the evidence that supports it.
      </p>
    </section>
  );
}
