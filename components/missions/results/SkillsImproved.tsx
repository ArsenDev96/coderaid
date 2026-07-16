import { ArrowRight, Gauge, TrendingUp } from "lucide-react";
import type { MissionResultConfig } from "@/lib/results";

export function SkillsImproved({
  skill,
  skillBefore,
  skillAfter,
}: {
  skill: MissionResultConfig["skillImprovement"];
  skillBefore: number;
  skillAfter: number;
}) {
  return (
    <section className="flex h-full flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-white sm:text-base">
        <TrendingUp className="h-4 w-4 text-emerald-400" strokeWidth={2.2} />
        Skills improved
      </h3>

      <div className="mt-4 flex items-start gap-4 rounded-xl border border-white/[0.06] bg-base-950/40 p-4">
        <span
          aria-hidden
          className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-violet-400/25 bg-violet-500/10 text-violet-300"
        >
          <Gauge className="h-6 w-6" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h4 className="text-sm font-semibold text-white">{skill.skill}</h4>
            <span className="shrink-0 font-mono text-sm font-bold text-emerald-300">
              +{skill.increase}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            {skill.description}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl border border-white/[0.06] bg-base-950/40 px-4 py-3">
        <span className="text-sm text-slate-300">Total Skill Points</span>
        <span className="flex items-center gap-2 font-mono text-sm font-semibold">
          <span className="text-slate-400">{skillBefore}</span>
          <ArrowRight className="h-3.5 w-3.5 text-slate-600" />
          <span className="text-emerald-300">{skillAfter}</span>
        </span>
      </div>
    </section>
  );
}
