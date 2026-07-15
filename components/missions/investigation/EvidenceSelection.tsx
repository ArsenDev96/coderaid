"use client";

import { useState } from "react";
import { Check, Plus, Tag } from "lucide-react";

/**
 * Shared selection mechanic for every investigation tool: rows that carry an
 * `evidenceId` can be selected, then marked in one action. Several rows may
 * point at the same evidence (e.g. a group of repeated log lines), so marking
 * de-duplicates before handing the ids back.
 */
export function useEvidenceSelection(onCollect: (ids: string[]) => void) {
  const [selected, setSelected] = useState<Record<string, string>>({});

  const isSelected = (rowId: string) => rowId in selected;

  const toggle = (rowId: string, evidenceId: string) =>
    setSelected((prev) => {
      const next = { ...prev };
      if (rowId in next) delete next[rowId];
      else next[rowId] = evidenceId;
      return next;
    });

  const count = Object.keys(selected).length;

  const submit = () => {
    if (count === 0) return;
    onCollect(Array.from(new Set(Object.values(selected))));
    setSelected({});
  };

  return { isSelected, toggle, count, submit };
}

/** Checkbox-style affordance — state is carried by the icon, not by colour alone. */
export function SelectionMark({
  selected,
  collected,
}: {
  selected: boolean;
  collected: boolean;
}) {
  if (collected) {
    return (
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md border border-emerald-400/40 bg-emerald-500/15 text-emerald-300">
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
      </span>
    );
  }
  return (
    <span
      className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors ${
        selected
          ? "border-violet-400/60 bg-violet-500/20 text-violet-200"
          : "border-white/15 bg-white/[0.03] text-slate-500"
      }`}
    >
      {selected ? (
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
      ) : (
        <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
      )}
    </span>
  );
}

/** Small "Collected" tag so collected state reads without relying on colour. */
export function CollectedTag() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-emerald-400/25 bg-emerald-500/10 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-emerald-300">
      <Check className="h-3 w-3" strokeWidth={2.5} />
      Collected
    </span>
  );
}

export function MarkEvidenceBar({
  count,
  onSubmit,
  hint,
}: {
  count: number;
  onSubmit: () => void;
  hint: string;
}) {
  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-white/[0.06] pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-slate-500">
        {count > 0
          ? `${count} ${count === 1 ? "line" : "lines"} selected`
          : hint}
      </p>
      <button
        type="button"
        onClick={onSubmit}
        disabled={count === 0}
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-violet-400/40 bg-violet-500/15 px-4 py-2.5 text-sm font-semibold text-violet-100 transition-colors hover:bg-violet-500/25 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.02] disabled:text-slate-600"
      >
        <Tag className="h-4 w-4" strokeWidth={2.2} />
        Mark as Evidence
      </button>
    </div>
  );
}
