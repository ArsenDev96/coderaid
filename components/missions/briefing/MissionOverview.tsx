import { AlertTriangle, Code2, Target } from "lucide-react";
import {
  SEVERITY_BADGE,
  TECH_META,
  type Mission,
  type ResolvedBriefing,
} from "@/lib/missions";
import type { Availability } from "@/lib/availability";
import { AvailabilityBadge } from "@/components/ui/AvailabilityBadge";

// Tags outside the known stack (Backend, Async, Auth…) still get a chip.
const FALLBACK_TECH = {
  icon: Code2,
  cls: "border-white/10 bg-white/[0.03] text-slate-300",
};

export function MissionOverview({
  mission,
  briefing,
  availability,
}: {
  mission: Mission;
  briefing: ResolvedBriefing;
  /** Shown beside severity so the briefing reads the same as the list rows. */
  availability?: Availability;
}) {
  const severity = SEVERITY_BADGE[briefing.severity];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.12em] ${severity.cls}`}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          {severity.label}
        </span>
        {availability && <AvailabilityBadge status={availability} size="md" />}
      </div>

      <h2 className="mt-4 text-3xl font-bold leading-[1.1] tracking-tight text-white sm:text-4xl">
        {mission.title}
      </h2>

      <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-400 sm:text-base">
        {mission.description}
      </p>

      {/* First phase */}
      <div className="mt-4 flex items-center gap-2 text-sm">
        <Target className="h-4 w-4 shrink-0 text-violet-300" strokeWidth={2.2} />
        <span className="text-slate-300">Step 1 of {briefing.steps.length}</span>
        <span className="text-slate-600">•</span>
        <span className="text-slate-400">{briefing.firstPhase}</span>
      </div>

      {/* Technologies */}
      <ul className="mt-5 flex flex-wrap gap-2.5">
        {briefing.technologies.map((tech) => {
          const meta = TECH_META[tech] ?? FALLBACK_TECH;
          const Icon = meta.icon;
          return (
            <li key={tech}>
              <span className="inline-flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5">
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-md border ${meta.cls}`}
                >
                  <Icon className="h-4 w-4" strokeWidth={2} />
                </span>
                <span className="text-sm font-medium text-slate-200">{tech}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
