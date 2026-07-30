"use client";

import { AvailabilityBadge } from "@/components/ui/AvailabilityBadge";
import { levelLabel, strengthFor, STRENGTH_BADGE, type Skill } from "@/lib/skills";

export function SkillCard({
  skill,
  selected,
  onSelect,
}: {
  skill: Skill;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = skill.icon;
  const strength = strengthFor(skill.progress);
  // A skill with no level and no XP has genuinely not been started yet — say so
  // rather than showing an empty bar next to a "Learning" badge.
  const notStarted = skill.level === 0 && skill.currentXp === 0;
  // A *planned* skill's zero is not the player's: no authored mission trains it,
  // so "Not Started" would read as their omission rather than the catalogue's.
  const planned = skill.planned;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex w-full flex-col rounded-2xl border p-4 text-left transition-colors ${
        selected
          ? "border-violet-400/60 bg-violet-500/[0.08] shadow-neon"
          : "border-white/[0.06] bg-white/[0.02] hover:border-white/15"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${skill.accent} ${
            notStarted || planned ? "opacity-50" : ""
          }`}
        >
          <Icon className="h-5 w-5" strokeWidth={1.9} />
        </span>
        <div className="min-w-0">
          <h3
            className={`truncate text-sm font-semibold ${
              notStarted ? "text-slate-300" : "text-white"
            }`}
          >
            {skill.name}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {planned
              ? "No incident written yet"
              : notStarted
                ? "Not Started"
                : levelLabel(skill.level)}
          </p>
        </div>
      </div>

      {/* No bar for a planned skill: there is no progress to be at 0% of. */}
      {!planned && (
        <div className="mt-4 flex items-center gap-3">
          <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
            <span
              className="block h-full rounded-full bg-gradient-to-r from-violet-500 to-electric-400"
              style={{ width: `${notStarted ? 0 : skill.progress}%` }}
            />
          </span>
          <span
            className={`shrink-0 text-xs font-semibold ${
              notStarted ? "text-slate-500" : "text-slate-300"
            }`}
          >
            {notStarted ? 0 : skill.progress}%
          </span>
        </div>
      )}

      {planned ? (
        <AvailabilityBadge status="coming-soon" className="mt-3 w-fit" />
      ) : (
        <span
          className={`mt-3 inline-flex w-fit rounded-md border px-2 py-0.5 text-[0.62rem] font-semibold ${
            notStarted
              ? "border-white/10 bg-white/[0.03] text-slate-400"
              : STRENGTH_BADGE[strength]
          }`}
        >
          {notStarted ? "Not Started" : strength}
        </span>
      )}
    </button>
  );
}
