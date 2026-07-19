"use client";

import Link from "next/link";
import { ArrowUpRight, CircleCheckBig } from "lucide-react";
import { useProgress } from "@/components/progress/ProgressProvider";
import {
  levelLabel,
  recentSkillActivity,
  recommendedMission,
  skillsToImprove,
} from "@/lib/skills";
import { SkillRadar } from "./SkillRadar";

export function SkillsAside() {
  const { ledger, view } = useProgress();
  const improve = skillsToImprove(ledger, view, 4);
  const activity = recentSkillActivity(ledger, 3);

  return (
    <div className="flex flex-col gap-4">
      <SkillRadar />

      {/* Skills to Improve — lowest progress first */}
      <section id="skills-to-improve" className="surface p-5">
        <h3 className="text-sm font-semibold text-white">Skills to Improve</h3>
        <ul className="mt-4 flex flex-col gap-4">
          {improve.map((skill, i) => {
            // Undefined when nothing playable trains this skill yet — the row
            // then simply carries no practice action.
            const mission = recommendedMission(skill, view);
            return (
              <li key={skill.id} className="flex items-center gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-violet-400/25 bg-violet-500/10 text-xs font-bold text-violet-300">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-white">
                      {skill.name}
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">
                      {skill.progress}%
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">{levelLabel(skill.level)}</div>
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-electric-400"
                      style={{ width: `${skill.progress}%` }}
                    />
                  </div>
                </div>
                {mission ? (
                  <Link
                    href={`/missions/${mission.id}/briefing`}
                    aria-label={`Practice ${skill.name}`}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-violet-400/30 bg-violet-500/10 text-violet-300 transition-colors hover:bg-violet-500/20"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <span
                    aria-disabled="true"
                    title="Practice missions for this skill are being prepared."
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-500"
                  >
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Recent activity — real completions, newest first */}
      <section className="surface p-5">
        <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
        {activity.length === 0 && (
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Nothing yet. Resolve an incident and your skill gains show up here.
          </p>
        )}
        <ul className="mt-4 flex flex-col gap-3.5">
          {activity.map((a) => {
            const Icon = a.icon;
            return (
              <li key={a.id} className="flex items-center gap-3">
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${a.accent}`}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.9} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white">{a.title}</div>
                  <div className="truncate text-xs text-slate-400">{a.detail}</div>
                  <div className="text-[0.65rem] text-slate-600">{a.when}</div>
                </div>
                <CircleCheckBig className="h-4 w-4 shrink-0 text-emerald-400" strokeWidth={2.2} />
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
