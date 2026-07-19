"use client";

import { useMemo, useState } from "react";
import {
  ACHIEVEMENT_CATEGORIES,
  sortAchievements,
  type AchievementCategory,
} from "@/lib/achievements";
import { useProgress } from "@/components/progress/ProgressProvider";
import { AchievementAside } from "./AchievementAside";
import { AchievementCard } from "./AchievementCard";
import { AchievementSummary } from "./AchievementSummary";
import { useAchievements } from "./useAchievements";

type Filter = AchievementCategory | "all";

const TABS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  ...ACHIEVEMENT_CATEGORIES,
];

export function AchievementsExplorer() {
  const achievements = useAchievements();
  const { player } = useProgress();
  const [filter, setFilter] = useState<Filter>("all");

  // Sorted once over the full set, then filtered — so a category's cards keep
  // the same relative order they have under "All".
  const visible = useMemo(() => {
    const sorted = sortAchievements(achievements);
    return filter === "all"
      ? sorted
      : sorted.filter((a) => a.category === filter);
  }, [achievements, filter]);

  return (
    <div className="flex flex-col gap-6">
      {/* 1 — total progress, streak, latest */}
      <AchievementSummary
        achievements={achievements}
        streakDays={player.streakDays}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* Category filters — scroll horizontally on narrow screens */}
          <div
            role="tablist"
            aria-label="Achievement category"
            className="thin-scroll surface -mx-0 flex gap-1 overflow-x-auto p-2"
          >
            {TABS.map((t) => {
              const active = t.id === filter;
              const count =
                t.id === "all"
                  ? achievements.length
                  : achievements.filter((a) => a.category === t.id).length;
              return (
                <button
                  key={t.id}
                  role="tab"
                  type="button"
                  aria-selected={active}
                  onClick={() => setFilter(t.id)}
                  className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "border border-violet-400/40 bg-violet-500/[0.12] text-white"
                      : "border border-transparent text-slate-400 hover:text-white"
                  }`}
                >
                  {t.label}
                  <span
                    className={`ml-2 text-xs ${active ? "text-violet-300" : "text-slate-600"}`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 2 & 3 — unlocked first, then locked with progress */}
          {visible.length === 0 ? (
            <div className="surface p-10 text-center text-sm text-slate-400">
              No achievements in this category yet.
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {visible.map((a) => (
                <AchievementCard key={a.id} achievement={a} />
              ))}
            </ul>
          )}
        </div>

        {/* 4 & 5 — latest earned and closest to earning */}
        <aside className="xl:sticky xl:top-24 xl:self-start">
          <AchievementAside achievements={achievements} />
        </aside>
      </div>
    </div>
  );
}
