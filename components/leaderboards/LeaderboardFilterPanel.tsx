"use client";

import { useEffect, useState } from "react";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { DIFFICULTIES, type Difficulty } from "@/lib/missions";
import type { SkillCategoryId } from "@/lib/skills";
import {
  CATEGORY_OPTIONS,
  PLAYER_SCOPES,
  type LeaderboardFilters,
  type PlayerScope,
} from "@/lib/leaderboards";

/**
 * Three coarse filters, applied on submit rather than on every keystroke — so
 * the table doesn't reshuffle underneath you while you're still choosing.
 */
export function LeaderboardFilterPanel({
  value,
  onApply,
  onClose,
}: {
  value: LeaderboardFilters;
  onApply: (f: LeaderboardFilters) => void;
  /** Supplied by the mobile drawer; the desktop panel has nothing to close. */
  onClose?: () => void;
}) {
  const [draft, setDraft] = useState(value);

  // Keep the draft honest if the applied filters change from elsewhere.
  useEffect(() => setDraft(value), [value]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onApply(draft);
        onClose?.();
      }}
      className="surface p-5"
    >
      <h2 className="text-sm font-semibold text-white">Leaderboard Filters</h2>

      <Field
        label="Category"
        value={draft.category}
        onChange={(v) =>
          setDraft({ ...draft, category: v as SkillCategoryId | "all" })
        }
        options={[
          { id: "all", label: "All Categories" },
          ...CATEGORY_OPTIONS,
        ]}
      />

      <Field
        label="Difficulty"
        value={draft.difficulty}
        onChange={(v) => setDraft({ ...draft, difficulty: v as Difficulty | "all" })}
        options={[
          { id: "all", label: "All Difficulties" },
          ...DIFFICULTIES.map((d) => ({ id: d, label: d })),
        ]}
      />

      <Field
        label="Show"
        value={draft.playerScope}
        onChange={(v) => setDraft({ ...draft, playerScope: v as PlayerScope })}
        options={PLAYER_SCOPES}
      />

      <button
        type="submit"
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-violet-400/40 bg-gradient-to-r from-violet-600 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-neon transition-transform hover:scale-[1.02]"
      >
        <SlidersHorizontal className="h-4 w-4" strokeWidth={2.2} />
        Apply Filters
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <label className="mt-4 block">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="relative mt-1.5 block">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-3.5 pr-9 text-sm font-medium text-slate-200 outline-none transition-colors hover:border-white/20 focus:border-violet-400/60"
        >
          {options.map((o) => (
            <option key={o.id} value={o.id} className="bg-base-900">
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      </span>
    </label>
  );
}

/** Mobile/tablet presentation: the same panel, in a bottom sheet. */
export function LeaderboardFilterDrawer({
  value,
  onApply,
  onClose,
}: {
  value: LeaderboardFilters;
  onApply: (f: LeaderboardFilters) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 xl:hidden">
      <button
        type="button"
        aria-label="Close filters"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Leaderboard filters"
        className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-2xl border border-white/10 bg-base-950/95 p-4 backdrop-blur-xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Filters</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.02] text-slate-400 transition-colors hover:border-white/20 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <LeaderboardFilterPanel value={value} onApply={onApply} onClose={onClose} />
      </div>
    </div>
  );
}
