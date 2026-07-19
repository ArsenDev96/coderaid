"use client";

import { ChevronDown, Search } from "lucide-react";
import { LEVEL_LABELS, levelLabel, type SkillLevelLabel } from "@/lib/skills";

export type SkillTab = "all" | "core" | "advanced" | "category";
export type LevelFilter = "All" | SkillLevelLabel;

const TABS: { id: SkillTab; label: string }[] = [
  { id: "all", label: "All Skills" },
  { id: "category", label: "By Category" },
  { id: "core", label: "Core Skills" },
  { id: "advanced", label: "Advanced Skills" },
];

// Derived from the canonical label list in lib/skills, so a new level label
// (such as "Not Started") shows up here without a second literal to maintain.
const LEVELS: LevelFilter[] = ["All", ...LEVEL_LABELS];

export function SkillFilters({
  tab,
  onTab,
  query,
  onQuery,
  level,
  onLevel,
}: {
  tab: SkillTab;
  onTab: (t: SkillTab) => void;
  query: string;
  onQuery: (q: string) => void;
  level: LevelFilter;
  onLevel: (l: LevelFilter) => void;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      {/* Tabs — horizontally scrollable on small screens */}
      <div
        role="tablist"
        aria-label="Skill filter"
        className="thin-scroll -mx-1 flex gap-1 overflow-x-auto px-1"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => onTab(t.id)}
            className={`shrink-0 rounded-lg border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? "border-violet-400 text-white"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search skills…"
            aria-label="Search skills"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors hover:border-white/20 focus:border-violet-400/60 sm:w-56"
          />
        </div>

        {/* Level filter */}
        <div className="relative">
          <select
            value={level}
            onChange={(e) => onLevel(e.target.value as LevelFilter)}
            aria-label="Filter by level"
            className="w-full appearance-none rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-4 pr-9 text-sm font-medium text-slate-200 outline-none transition-colors hover:border-white/20 focus:border-violet-400/60 sm:w-auto"
          >
            {LEVELS.map((l) => (
              <option key={l} value={l} className="bg-base-900">
                {l === "All" ? "All Levels" : l}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        </div>
      </div>
    </div>
  );
}

/** Shared matcher so the list and empty-state agree on what a filter shows. */
export function matchesLevel(skillLevel: number, filter: LevelFilter): boolean {
  return filter === "All" || levelLabel(skillLevel) === filter;
}
