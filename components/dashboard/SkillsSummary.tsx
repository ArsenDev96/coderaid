"use client";

import Link from "next/link";
import { useProgress } from "@/components/progress/ProgressProvider";
import { getSkill } from "@/lib/skills";

/**
 * The five Node.js skills surfaced on the dashboard, referenced by stable id.
 * Levels and XP are resolved against the player's ledger the same way the
 * Skills page resolves them, so this card can never disagree with it.
 */
const SUMMARY_SKILL_IDS = [
  "async-javascript",
  "nodejs-runtime",
  "root-cause-analysis",
  "error-handling",
  "request-performance",
] as const;

/** Presentation only: keeps the existing bar gradient per row. */
const PRESENTATION: Record<string, { bar: string; iconColor: string }> = {
  "async-javascript": {
    bar: "from-violet-500 to-violet-400",
    iconColor: "text-violet-300",
  },
  "nodejs-runtime": {
    bar: "from-emerald-500 to-emerald-400",
    iconColor: "text-emerald-300",
  },
  "root-cause-analysis": {
    bar: "from-amber-500 to-amber-400",
    iconColor: "text-amber-300",
  },
  "error-handling": {
    bar: "from-electric-500 to-electric-400",
    iconColor: "text-electric-300",
  },
  "request-performance": {
    bar: "from-rose-500 to-rose-400",
    iconColor: "text-rose-300",
  },
};

const FALLBACK = {
  bar: "from-violet-500 to-violet-400",
  iconColor: "text-violet-300",
};

export function SkillsSummary() {
  const { ledger } = useProgress();
  const skills = SUMMARY_SKILL_IDS.map((id) => getSkill(id, ledger)).filter(
    (s): s is NonNullable<typeof s> => Boolean(s),
  );

  return (
    <div className="surface flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Node.js Skills</h2>
        <Link
          href="/skills"
          className="shrink-0 text-xs font-semibold text-violet-300 transition-colors hover:text-violet-200"
        >
          View all skills
        </Link>
      </div>

      <ul className="mt-4 flex flex-col gap-3.5">
        {skills.map((skill) => {
          const Icon = skill.icon;
          const look = PRESENTATION[skill.id] ?? FALLBACK;
          const xpToNext = Math.max(0, skill.nextLevelXp - skill.currentXp);
          return (
            <li key={skill.id} className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
                <Icon className={`h-4 w-4 ${look.iconColor}`} strokeWidth={1.9} />
              </span>

              <span className="w-24 shrink-0 truncate text-sm font-medium text-white sm:w-28">
                {skill.name}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
                  <span
                    className={`block h-full rounded-full bg-gradient-to-r ${look.bar}`}
                    style={{ width: `${skill.progress}%` }}
                  />
                </span>
              </span>

              <span className="w-14 shrink-0 text-right text-sm font-semibold text-white">
                Level {skill.level}
              </span>

              <span className="hidden w-32 shrink-0 text-right text-xs text-slate-500 lg:block">
                {xpToNext} XP to next level
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
