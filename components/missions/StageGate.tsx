"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { useProgress } from "@/components/progress/ProgressProvider";
import { getDiagnosis, loadDiagnosisState } from "@/lib/diagnosis";
import { getFix, loadFixState } from "@/lib/fix";
import {
  getInvestigation,
  keyEvidence,
  loadInvestigationState,
} from "@/lib/investigation";
import {
  stageAccess,
  type GuardedStage,
  type StageProgress,
} from "@/lib/stage-access";
import { loadVerificationState } from "@/lib/verification";

/**
 * Reads the mission's saved stage state. Only ever called after mount — every
 * loader here returns null on the server.
 */
function readStageProgress(
  missionId: string,
  missionCompleted: boolean,
): StageProgress {
  const investigation = getInvestigation(missionId);
  const collected = investigation
    ? (loadInvestigationState(missionId, investigation.tools)
        ?.collectedEvidenceIds ?? [])
    : [];
  const keys = investigation ? keyEvidence(investigation) : [];

  const diagnosisConfig = getDiagnosis(missionId);
  const diagnosis = diagnosisConfig ? loadDiagnosisState(diagnosisConfig) : null;

  const fixConfig = getFix(missionId);
  const fix = fixConfig ? loadFixState(fixConfig) : null;

  return {
    keyCluesCollected: keys.filter((e) => collected.includes(e.id)).length,
    // Mirrors the investigation workspace: a mission can't require more key
    // clues than it authors.
    keyCluesRequired: Math.min(
      investigation?.requiredKeyClues ?? 0,
      keys.length,
    ),
    diagnosisConfirmed: diagnosis?.confirmed === true,
    fixApplied: fix?.applied === true,
    verificationCompleted:
      loadVerificationState(missionId)?.completed === true,
    missionCompleted,
  };
}

/**
 * Client-side prerequisite guard for a mission stage.
 *
 * Stage routes are statically generated, so they can be opened directly. This
 * keeps a player from landing on a later stage — and, at the results screen,
 * earning a graded run — without the state that stage is supposed to build on.
 * Completed missions pass straight through, so review and replay are untouched.
 *
 * The check needs `localStorage`, so nothing renders until after mount. The
 * blank first frame is deliberate: flashing the stage and then replacing it
 * with a lock would be worse than a moment of nothing.
 */
export function StageGate({
  missionId,
  stage,
  children,
}: {
  missionId: string;
  stage: GuardedStage;
  children: ReactNode;
}) {
  const { view, hydrated } = useProgress();
  const [progress, setProgress] = useState<StageProgress | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    setProgress(
      readStageProgress(missionId, missionId in view.ledger.missions),
    );
  }, [hydrated, missionId, view.ledger.missions]);

  if (!progress) {
    return (
      <div className="py-20 text-center text-sm text-slate-500">
        Loading your mission progress…
      </div>
    );
  }

  const access = stageAccess(stage, progress);
  if (access.allowed) return <>{children}</>;

  return (
    <div className="mx-auto max-w-xl py-14 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-amber-400/40 bg-amber-500/10 text-amber-200">
        <Lock className="h-7 w-7" strokeWidth={1.8} />
      </span>

      <h1 className="mt-5 text-2xl font-bold tracking-tight text-white">
        Not there yet
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400">
        {access.reason}
      </p>

      <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          href={`/missions/${missionId}/${access.backPath}`}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-400/40 bg-gradient-to-r from-violet-600 to-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-neon transition-transform hover:scale-[1.02]"
        >
          <ArrowLeft className="h-4 w-4" />
          {access.backLabel}
        </Link>
        <Link
          href={`/missions/${missionId}/briefing`}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-6 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-white/25 hover:text-white"
        >
          Mission Briefing
        </Link>
      </div>
    </div>
  );
}
