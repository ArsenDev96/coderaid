"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useProgress } from "@/components/progress/ProgressProvider";
import { SKILL_CATEGORIES, skillsFor } from "@/lib/skills";
import { FutureTracks } from "./FutureTracks";
import { SkillCard } from "./SkillCard";
import { SkillDetailDrawer } from "./SkillDetailDrawer";
import {
  SkillFilters,
  matchesLevel,
  type LevelFilter,
  type SkillTab,
} from "./SkillFilters";
import { SkillSummaryBar } from "./SkillSummaryBar";
import { SkillsAside } from "./SkillsAside";

export function SkillsExplorer() {
  const [tab, setTab] = useState<SkillTab>("all");
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<LevelFilter>("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { ledger } = useProgress();

  // Levels and XP come from the player's ledger, so the list re-sorts and
  // re-filters as they actually earn skill XP.
  const skills = useMemo(() => skillsFor(ledger), [ledger]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return skills.filter((s) => {
      if (tab === "core" && s.tier !== "core") return false;
      if (tab === "advanced" && s.tier !== "advanced") return false;
      if (!matchesLevel(s.level, level)) return false;
      if (q && !s.name.toLowerCase().includes(q) && !s.description.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [skills, tab, query, level]);

  const selected = selectedId ? skills.find((s) => s.id === selectedId) ?? null : null;

  // Group into category sections; "By Category" is the same data, just always
  // sectioned — the other tabs also section so the grouping stays readable.
  const sections = SKILL_CATEGORIES.map((category) => ({
    category,
    skills: filtered.filter((s) => s.category === category.id),
  })).filter((sec) => sec.skills.length > 0);

  return (
    <>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Main */}
        <div className="flex min-w-0 flex-col gap-6">
          <SkillSummaryBar />

          <SkillFilters
            tab={tab}
            onTab={setTab}
            query={query}
            onQuery={setQuery}
            level={level}
            onLevel={setLevel}
          />

          {sections.length === 0 ? (
            <div className="surface p-10 text-center text-sm text-slate-400">
              No skills match your filters.
            </div>
          ) : (
            sections.map(({ category, skills }) => (
              <section key={category.id}>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold text-white">
                    {category.name}
                  </h2>
                  <span className="text-xs text-slate-500">
                    {skills.length} {skills.length === 1 ? "skill" : "skills"}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {skills.map((skill) => (
                    <SkillCard
                      key={skill.id}
                      skill={skill}
                      selected={skill.id === selectedId}
                      onSelect={() => setSelectedId(skill.id)}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>

        {/* Aside — recommendations move below the list on tablet/mobile */}
        <aside className="xl:sticky xl:top-24 xl:self-start">
          <SkillsAside />
        </aside>
      </div>

      {/* Roadmap only — never filtered, counted or charted with the skills above. */}
      <div className="mt-8">
        <FutureTracks />
      </div>

      {selected && (
        <SkillDetailDrawer skill={selected} onClose={() => setSelectedId(null)} />
      )}
    </>
  );
}

/** Header action — jumps to the recommendations rather than faking AI logic. */
export function SkillRecommendationsButton() {
  return (
    <Link
      href="#skills-to-improve"
      className="inline-flex items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/[0.06] px-4 py-2.5 text-sm font-semibold text-violet-200 transition-colors hover:border-violet-400/50"
    >
      <Sparkles className="h-4 w-4" strokeWidth={2.2} />
      Skill Recommendations
    </Link>
  );
}
