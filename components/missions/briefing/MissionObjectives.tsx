import { LineChart, ScanSearch, TerminalSquare } from "lucide-react";

// One trailing glyph per objective, echoing the investigate → diagnose → verify loop.
const STEP_ICONS = [TerminalSquare, ScanSearch, LineChart];

export function MissionObjectives({ steps }: { steps: string[] }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
      <h3 className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-violet-300">
        Mission Objectives
      </h3>

      <ol className="mt-4 flex flex-col gap-3">
        {steps.map((step, i) => {
          const Icon = STEP_ICONS[i % STEP_ICONS.length];
          return (
            <li
              key={step}
              className="flex items-center gap-3.5 rounded-xl border border-white/[0.06] bg-base-950/50 p-3.5"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-violet-400/30 bg-violet-500/10 text-sm font-semibold text-violet-200">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 text-sm leading-relaxed text-slate-200">
                {step}
              </span>
              <Icon
                aria-hidden
                className="hidden h-5 w-5 shrink-0 text-slate-600 sm:block"
                strokeWidth={1.7}
              />
            </li>
          );
        })}
      </ol>
    </div>
  );
}
