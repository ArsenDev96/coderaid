"use client";

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
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${skill.accent}`}
        >
          <Icon className="h-5 w-5" strokeWidth={1.9} />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-white">
            {skill.name}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">{levelLabel(skill.level)}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
          <span
            className="block h-full rounded-full bg-gradient-to-r from-violet-500 to-electric-400"
            style={{ width: `${skill.progress}%` }}
          />
        </span>
        <span className="shrink-0 text-xs font-semibold text-slate-300">
          {skill.progress}%
        </span>
      </div>

      <span
        className={`mt-3 inline-flex w-fit rounded-md border px-2 py-0.5 text-[0.62rem] font-semibold ${STRENGTH_BADGE[strength]}`}
      >
        {strength}
      </span>
    </button>
  );
}
