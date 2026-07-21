"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Info, Loader2, PlayCircle } from "lucide-react";
import { getDiagnosis, loadDiagnosisState } from "@/lib/diagnosis";
import { getFix, loadFixState } from "@/lib/fix";
import { loadGrade, saveGrade, submitRun } from "@/lib/grade-submission";
import { completeStage, emptyRun, loadRun, touchRun } from "@/lib/run";
import {
  allChecksPassed,
  loadVerificationState,
  resolveVerification,
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
  /**
   * Whether the applied fix resolves the root cause — **the server's verdict**,
   * never the browser's. The client no longer holds the answers, so this stays
   * false until a run comes back graded, which is what makes the verification a
   * measurement rather than a formality.
   */
  const [fixResolves, setFixResolves] = useState(false);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore after mount — a run that was already graded comes back as "done".
  useEffect(() => {
    touchRun(config.missionId);
    const cached = loadGrade(config.missionId);
    const saved = loadVerificationState(config.missionId);

    // "Done" requires a grade, not just a local flag: without one there is
    // nothing truthful to render, so the player runs verification again.
    if (cached && saved?.completed) {
      setFixResolves(cached.resolved);
      setPhase("done");
    }

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
    if (phase === "done") completeStage(config.missionId, "Verification");
  }, [hydrated, config.missionId, phase]);

  // The replay itself is simulated — there is no backend to run traffic
  // against — but what it reports is not: the metrics, logs, request breakdown
  // and checks are all resolved against whether the fix actually worked.
  /**
   * Running verification is the commit point: diagnosis and fix are both
   * locked, so this is where the run is submitted and graded. Grading here
   * rather than on the results screen is deliberate — a "does this fix work?"
   * endpoint that recorded nothing would be an answer oracle anyone could
   * enumerate.
   */
  const runVerification = async () => {
    setPhase("running");
    setNeedsSignIn(false);
    setFailed(false);

    const diagnosisConfig = getDiagnosis(config.missionId);
    const diagnosisState = diagnosisConfig
      ? loadDiagnosisState(diagnosisConfig)
      : null;
    const fixConfig = getFix(config.missionId);
    const fixState = fixConfig ? loadFixState(fixConfig) : null;

    // The replay is simulated, but the pause is not cosmetic here — it keeps
    // the fastest possible response from flashing past unread.
    const [result] = await Promise.all([
      submitRun({
        missionId: config.missionId,
        rootCauseId: diagnosisState?.rootCauseId ?? null,
        evidenceIds: diagnosisState?.evidenceIds ?? [],
        fixId: fixState?.fixId ?? null,
        fixApplied: fixState?.applied === true,
        telemetry: loadRun(config.missionId) ?? emptyRun(),
      }),
      new Promise((resolve) => {
        timer.current = setTimeout(resolve, 1400);
      }),
    ]);

    if (result.status === "unauthenticated") {
      setNeedsSignIn(true);
      setPhase("idle");
      return;
    }
    if (result.status === "failed") {
      setFailed(true);
      setPhase("idle");
      return;
    }

    saveGrade(config.missionId, result.grade);
    setFixResolves(result.grade.resolved);
    setPhase("done");
  };

  const report = useMemo(
    () => resolveVerification(config, fixResolves),
    [config, fixResolves],
  );
  const healthy = allChecksPassed(report);

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

            {needsSignIn && (
              // Everything up to here is free to play. Grading is where an
              // account starts to matter, because the score is recorded — and
              // the work isn't lost: the run is saved locally until they return.
              <div
                role="status"
                className="max-w-sm rounded-xl border border-violet-400/25 bg-violet-500/[0.08] px-4 py-3"
              >
                <p className="text-sm leading-relaxed text-violet-100">
                  Sign in to have this run graded. Your investigation, diagnosis
                  and fix are saved — you&apos;ll come straight back here.
                </p>
                <Link
                  href={`/sign-in?next=${encodeURIComponent(
                    `/missions/${config.missionId}/verification`,
                  )}`}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-violet-400/40 bg-violet-500/20 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-500/30"
                >
                  Sign in with GitHub
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}

            {failed && (
              <p
                role="alert"
                className="max-w-sm rounded-xl border border-rose-400/25 bg-rose-500/[0.08] px-4 py-3 text-sm leading-relaxed text-rose-200"
              >
                Verification couldn&apos;t reach the server. Your run is saved —
                try again in a moment.
              </p>
            )}
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
            <MetricCards metrics={report.metrics} />

            <div className="grid grid-cols-1 items-stretch gap-5 xl:grid-cols-[1.4fr_1fr]">
              <PerformanceChart chart={report.chart} />
              <RequestBreakdown
                spans={report.requestBreakdown}
                totalMs={report.breakdownTotalMs}
              />
            </div>

            <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
              <VerificationLogs logs={report.logs} healthy={healthy} />
              <VerificationSummary checks={report.checks} />
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
                    ? report.summary.headline
                    : "Run verification to continue"}
                </h3>
                <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-400">
                  {phase === "done"
                    ? report.summary.detail
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
