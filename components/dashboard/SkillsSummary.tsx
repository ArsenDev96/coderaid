import Link from "next/link";
import { DASHBOARD_SKILLS } from "@/lib/dashboard";

export function SkillsSummary() {
  return (
    <div className="surface flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Skills Summary</h2>
        <Link
          href="/#skills"
          className="shrink-0 text-xs font-semibold text-violet-300 transition-colors hover:text-violet-200"
        >
          View all skills
        </Link>
      </div>

      <ul className="mt-4 flex flex-col gap-3.5">
        {DASHBOARD_SKILLS.map((skill) => {
          const Icon = skill.icon;
          return (
            <li key={skill.name} className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
                <Icon className={`h-4 w-4 ${skill.iconColor}`} strokeWidth={1.9} />
              </span>

              <span className="w-24 shrink-0 truncate text-sm font-medium text-white sm:w-28">
                {skill.name}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
                  <span
                    className={`block h-full rounded-full bg-gradient-to-r ${skill.bar}`}
                    style={{ width: `${skill.progress}%` }}
                  />
                </span>
              </span>

              <span className="w-14 shrink-0 text-right text-sm font-semibold text-white">
                Level {skill.level}
              </span>

              <span className="hidden w-32 shrink-0 text-right text-xs text-slate-500 lg:block">
                {skill.xpToNext} XP to next level
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
