import { AlertTriangle, Target } from "lucide-react";
import { SEVERITY_BADGE, type Severity } from "@/lib/missions";

/**
 * Compact orientation panel: which mission, how far in, what to look for.
 * Player rank/XP is deliberately absent — the shared top bar already shows it.
 */
export function MissionStepProgress({
  title,
  severity,
  step,
  totalSteps,
  phase,
  objective,
  keyCollected,
  keyRequired,
}: {
  title: string;
  severity: Severity;
  step: number;
  totalSteps: number;
  phase: string;
  objective: string;
  keyCollected: number;
  keyRequired: number;
}) {
  const badge = SEVERITY_BADGE[severity];
  const pct = Math.min((keyCollected / keyRequired) * 100, 100);

  return (
    <div className="rounded-2xl border border-violet-400/40 bg-gradient-to-br from-violet-900/20 to-base-900/60 p-4 shadow-neon sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.12em] ${badge.cls}`}
          >
            <AlertTriangle className="h-3 w-3" />
            {badge.label}
          </span>
          <h2 className="mt-2.5 text-xl font-bold tracking-tight text-white sm:text-2xl">
            {title}
          </h2>
          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-300">
              Step {step} of {totalSteps}
            </span>
            <span aria-hidden className="text-slate-600">
              •
            </span>
            <span className="font-medium text-violet-300">{phase}</span>
          </p>
        </div>

        <div className="shrink-0 lg:w-64">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-medium text-slate-400">Key clues</span>
            <span className="font-mono text-slate-300">
              {keyCollected} / {keyRequired}
            </span>
          </div>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"
            role="progressbar"
            aria-valuenow={keyCollected}
            aria-valuemin={0}
            aria-valuemax={keyRequired}
            aria-label="Key clues collected"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-electric-400 transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      <p className="mt-4 flex items-start gap-2 border-t border-white/[0.06] pt-3.5 text-sm text-slate-400">
        <Target
          aria-hidden
          className="mt-0.5 h-4 w-4 shrink-0 text-violet-300"
          strokeWidth={2.2}
        />
        <span>
          <span className="font-medium text-slate-300">Objective: </span>
          {objective}
        </span>
      </p>
    </div>
  );
}
