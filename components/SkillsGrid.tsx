import { SKILL_COLORS, SKILLS } from "@/lib/data";
import { Reveal } from "./ui/Reveal";
import { SectionHeading } from "./ui/SectionHeading";

export function SkillsGrid() {
  return (
    <section id="skills" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <SectionHeading
        title={
          <>
            Sharpen the <span className="text-gradient">Skills</span> That Matter
          </>
        }
      />

      <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {SKILLS.map((skill, i) => {
          const Icon = skill.icon;
          const c = SKILL_COLORS[skill.color];
          return (
            <Reveal key={skill.name} delay={i * 0.05}>
              <div className="surface group h-full p-4 transition-colors hover:border-white/15">
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
                  <Icon className={`h-5 w-5 ${c.icon}`} strokeWidth={1.9} />
                </span>
                <h3 className="mt-3 text-sm font-semibold leading-tight text-white">
                  {skill.name}
                </h3>
                <div className="mt-1 text-xs text-slate-500">
                  Level {skill.level}
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${c.bar}`}
                    style={{ width: `${skill.progress}%` }}
                  />
                </div>
                <div className="mt-2 text-[0.7rem] text-slate-500">
                  {skill.missions} missions
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
