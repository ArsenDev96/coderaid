"use client";

import { FIX_ICONS, type FixOption } from "@/lib/fix";

/**
 * Single-select, built as a real radiogroup so arrow keys and screen readers
 * behave. Selection is carried by the mark and border, never by colour alone.
 */
export function FixOptionList({
  options,
  selectedId,
  onSelect,
}: {
  options: FixOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Fix options"
      className="flex flex-col gap-2.5"
    >
      {options.map((option) => {
        const Icon = FIX_ICONS[option.icon];
        const selected = option.id === selectedId;

        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected || (!selectedId && option.id === options[0].id) ? 0 : -1}
            onClick={() => onSelect(option.id)}
            className={`flex w-full items-center gap-3.5 rounded-xl border p-4 text-left transition-colors ${
              selected
                ? "border-violet-400/50 bg-violet-500/[0.10] shadow-neon"
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
  );
}
