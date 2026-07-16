"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Info, Loader2, PlayCircle } from "lucide-react";
import {
  allChecksPassed,
  loadVerificationState,
  saveVerificationState,
  type MissionVerificationConfig,
} from "@/lib/verification";
import { MetricCards } from "./MetricCards";
import { PerformanceChart } from "./PerformanceChart";
import { RequestBreakdown } from "./RequestBreakdown";
import { VerificationLogs } from "./VerificationLogs";
import { VerificationMissionHeader } from "./VerificationMissionHeader";
import { VerificationSummary } from "./VerificationSummary";

type Phase = "idle" | "running" | "done";

export function VerificationWorkspace({
  config,
  title,
  step,
  totalSteps,
}: {
  config: MissionVerificationConfig;
  title: string;
  step: number;
  totalSteps: number;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [hydrated, setHydrated] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore after mount — a completed run comes straight back as "done".
  useEffect(() => {
    const saved = loadVerificationState(config.missionId);
    setPhase(saved?.completed ? "done" : "idle");
    setHydrated(true);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [config.missionId]);

  useEffect(() => {
    if (!hydrated) return;
    saveVerificationState(config.missionId, {
      run: phase !== "idle",
      completed: phase === "done",
    });
  }, [hydrated, config.missionId, phase]);

  // Local simulation only — no backend. A short delay reveals the results.
  const runVerification = () => {
    setPhase("running");
    timer.current = setTimeout(() => setPhase("done"), 1400);
  };

  const healthy = allChecksPassed(config);

  return (
    <div className="flex flex-col gap-6">
      <VerificationMissionHeader
        title={title}
        step={step}
        totalSteps={totalSteps}
      />

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              Is the issue resolved?
            </h2>
            <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-slate-400">
              Compare the performance before and after your fix was applied.
            </p>
          </div>
          {phase === "done" && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2 text-xs font-medium text-slate-400">
              <Info className="h-3.5 w-3.5 text-violet-300" strokeWidth={2.2} />
              How verification works
            </span>
          )}
        </div>

        {/* Gate: results appear only after a (simulated) verification run */}
        {phase !== "done" ? (
          <div className="mt-6 flex flex-col items-center gap-4 rounded-2xl border border-dashed border-white/[0.08] bg-base-950/40 px-6 py-12 text-center">
            <span
              aria-hidden
              className="grid h-14 w-14 place-items-center rounded-2xl border border-violet-400/30 bg-violet-500/10 text-violet-200"
            >
              {phase === "running" ? (
                <Loader2 className="h-7 w-7 animate-spin" strokeWidth={1.8} />
              ) : (
                <PlayCircle className="h-7 w-7" strokeWidth={1.8} />
              )}
            </span>
            <p className="max-w-sm text-sm leading-relaxed text-slate-400">
              {phase === "running"
                ? "Running verification — replaying signup traffic and measuring the response…"
                : "Run verification to compare signup performance before and after your fix."}
            </p>
            <button
              type="button"
              onClick={runVerification}
              disabled={phase === "running"}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-400/40 bg-gradient-to-r from-violet-600 to-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-neon transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100"
            >
              {phase === "running" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.2} />
                  Verifying…
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4" strokeWidth={2.2} />
                  Run Verification
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-6">
            <MetricCards metrics={config.metrics} />

            <div className="grid grid-cols-1 items-stretch gap-5 xl:grid-cols-[1.4fr_1fr]">
              <PerformanceChart chart={config.chart} />
              <RequestBreakdown
                spans={config.requestBreakdown}
                totalMs={config.breakdownTotalMs}
              />
            </div>

            <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
              <VerificationLogs logs={config.logs} healthy={healthy} />
              <VerificationSummary checks={config.checks} />
            </div>
          </div>
        )}
      </div>

      {/* Continue is only reachable once verification has completed */}
      <div className="max-lg:sticky max-lg:bottom-3 max-lg:z-20">
        <div className="rounded-2xl border border-white/[0.06] bg-base-900/90 p-4 backdrop-blur sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 gap-3">
              <span
                aria-hidden
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-violet-400/30 bg-violet-500/10 text-violet-300"
              >
                <Info className="h-4 w-4" strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-white">
                  {phase === "done"
                    ? config.summary.headline
                    : "Run verification to continue"}
                </h3>
                <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-400">
                  {phase === "done"
                    ? config.summary.detail
                    : "Verify the fix to unlock your mission results and XP."}
                </p>
              </div>
            </div>

            <div className="shrink-0 sm:text-right">
              {phase === "done" ? (
                <Link
                  href={`/missions/${config.missionId}/results`}
                  className="group inline-flex w-full items-center justify-center gap-2.5 rounded-xl border border-violet-400/40 bg-gradient-to-r from-violet-600 to-violet-500 px-8 py-3 text-sm font-semibold text-white shadow-neon transition-transform hover:scale-[1.02] sm:w-auto"
                >
                  Continue to Results
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  aria-describedby="verification-gate-hint"
                  className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-8 py-3 text-sm font-semibold text-slate-500 sm:w-auto"
                >
                  Continue to Results
                </button>
              )}
              <p
                id="verification-gate-hint"
                className="mt-2 text-center text-xs text-slate-500 sm:text-right"
              >
                {phase === "done"
                  ? "See your mission outcome and rewards."
                  : "Complete verification first."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
