import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SKILL_COLORS, SKILLS } from "@/lib/data";

const MISSION_TARGET = 20;

export function YourSkills() {
  // Dashboard shows the first five skills as compact cards.
  const skills = SKILLS.slice(0, 5);

  return (
    <div className="surface p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-violet-300">
          Your Skills
        </div>
        <Link
          href="/#skills"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-300 transition-colors hover:text-white"
        >
          View all skills <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {skills.map((skill) => {
          const Icon = skill.icon;
          const c = SKILL_COLORS[skill.color];
          return (
            <div
              key={skill.name}
              className="rounded-xl border border-white/[0.08] bg-base-950/50 p-4"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
                <Icon className={`h-5 w-5 ${c.icon}`} strokeWidth={1.9} />
              </span>
              <h4 className="mt-3 text-sm font-semibold leading-tight text-white">
                {skill.name}
              </h4>
              <div className="mt-0.5 text-xs text-slate-500">
                Level {skill.level}
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${c.bar}`}
                  style={{ width: `${skill.progress}%` }}
                />
              </div>
              <div className="mt-2 font-mono text-[0.68rem] text-slate-500">
                {skill.missions} / {MISSION_TARGET} missions
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
