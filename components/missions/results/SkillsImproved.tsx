import { ArrowRight, TrendingUp } from "lucide-react";
import type { Skill } from "@/lib/skills";

export type SkillGain = {
  skill: Skill;
  /** Skill XP this run awarded. */
  xp: number;
  /** Level before and after the award. */
  levelBefore: number;
  levelAfter: number;
};

/**
 * The skill XP this run actually credited, per skill. Both the amounts and the
 * before/after levels come from the ledger, so what is shown here is exactly
 * what the Skills page will show afterwards.
 */
export function SkillsImproved({
  gains,
  description,
}: {
  gains: SkillGain[];
  description: string;
}) {
  return (
    <section className="flex h-full flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-white sm:text-base">
        <TrendingUp className="h-4 w-4 text-emerald-400" strokeWidth={2.2} />
        Skills improved
      </h3>

      {gains.length === 0 ? (
        <p className="mt-4 rounded-xl border border-white/[0.06] bg-base-950/40 p-4 text-xs leading-relaxed text-slate-400">
          This run scored 0, so no skill XP was credited. Re-run the incident to
          earn it.
        </p>
      ) : (
        <>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            {description}
          </p>

          <ul className="mt-4 flex flex-col gap-3">
            {gains.map(({ skill, xp, levelBefore, levelAfter }) => {
              const Icon = skill.icon;
              const levelledUp = levelAfter > levelBefore;
              return (
                <li
                  key={skill.id}
                  className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-base-950/40 p-4"
                >
                  <span
                    aria-hidden
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${skill.accent}`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <h4 className="truncate text-sm font-semibold text-white">
                        {skill.name}
                      </h4>
                      <span className="shrink-0 font-mono text-sm font-bold text-emerald-300">
                        +{xp} XP
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 font-mono text-xs">
                      <span className="text-slate-500">Level {levelBefore}</span>
                      <ArrowRight className="h-3 w-3 text-slate-600" />
                      <span
                        className={
                          levelledUp ? "text-emerald-300" : "text-slate-400"
                        }
                      >
                        Level {levelAfter}
                      </span>
                      {levelledUp && (
                        <span className="rounded-md border border-emerald-400/30 bg-emerald-500/10 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-emerald-300">
                          Level up
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
