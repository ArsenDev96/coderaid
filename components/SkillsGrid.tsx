import { LANDING_SKILLS, SKILL_COLORS } from "@/lib/data";
import { Reveal } from "./ui/Reveal";

export function SkillsGrid() {
  return (
    <section id="skills" className="min-w-0">
      <Reveal className="surface flex h-full flex-col p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-white sm:text-2xl">
          Skills You&apos;ll Master
        </h2>
        <p className="mt-1.5 text-sm text-slate-400">
          Core backend skills that matter in the real world.
        </p>

        <div className="mt-6 grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3">
          {LANDING_SKILLS.map((skill) => {
            const Icon = skill.icon;
            const c = SKILL_COLORS[skill.color];
            return (
              <div
                key={skill.name}
                className="flex flex-col items-center justify-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center transition-colors hover:border-white/15"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
                  <Icon className={`h-5 w-5 ${c.icon}`} strokeWidth={1.9} />
                </span>
                <h3 className="text-xs font-semibold leading-tight text-white">
                  {skill.name}
                </h3>
              </div>
            );
          })}
        </div>

        <p className="mt-5 text-center text-xs text-slate-500">and more…</p>
      </Reveal>
    </section>
  );
}
