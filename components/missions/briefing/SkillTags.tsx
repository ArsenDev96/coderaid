import { Sparkles } from "lucide-react";
import { SKILL_META } from "@/lib/missions";

export function SkillTags({ skills }: { skills: string[] }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <h3 className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
        What You&apos;ll Practice
      </h3>
      <ul className="mt-3 flex flex-wrap gap-2">
        {skills.map((skill) => {
          const meta = SKILL_META[skill];
          const Icon = meta?.icon ?? Sparkles;
          return (
            <li key={skill}>
              <span className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-base-950/50 px-3 py-2">
                <Icon
                  className={`h-4 w-4 shrink-0 ${meta?.cls ?? "text-slate-400"}`}
                  strokeWidth={1.9}
                />
                <span className="text-xs font-medium text-slate-200">{skill}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
