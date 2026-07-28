"use client";

import { useEffect, useState } from "react";
import {
  canConfirm,
  loadDiagnosisState,
  saveDiagnosisState,
  type MissionDiagnosisConfig,
} from "@/lib/diagnosis";
import { clearVerdict } from "@/lib/mission-storage";
import type { Severity } from "@/lib/missions";
import { completeStage, touchRun } from "@/lib/run";
import { DiagnosisConfirmBar } from "./DiagnosisConfirmBar";
import { DiagnosisEvidenceList } from "./DiagnosisEvidenceList";
import { DiagnosisHint } from "./DiagnosisHint";
import { DiagnosisMissionHeader } from "./DiagnosisMissionHeader";
import { RootCauseList } from "./RootCauseList";

export function DiagnosisWorkspace({
  config,
  title,
  description,
  severity,
  step,
  totalSteps,
}: {
  config: MissionDiagnosisConfig;
  title: string;
  description: string;
  severity: Severity;
  step: number;
  totalSteps: number;
}) {
  const [rootCauseId, setRootCauseId] = useState<string | null>(null);
  const [evidenceIds, setEvidenceIds] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Restore after mount — reading localStorage during render would desync the
  // server-rendered markup. Each mission has its own key.
  useEffect(() => {
    setHydrated(false);
    // Keeps the run clock warm — the elapsed time reported on the results
    // screen spans the whole mission, not just its last stage.
    touchRun(config.missionId);
    const saved = loadDiagnosisState(config);
    setRootCauseId(saved?.rootCauseId ?? null);
    setEvidenceIds(saved?.evidenceIds ?? []);
    setConfirmed(saved?.confirmed ?? false);
    setHydrated(true);
  }, [config]);

  useEffect(() => {
    if (!hydrated) return;
    saveDiagnosisState(config.missionId, { rootCauseId, evidenceIds, confirmed });
  }, [hydrated, config.missionId, rootCauseId, evidenceIds, confirmed]);

  /**
   * The diagnosis is part of what gets graded, so changing it invalidates any
   * verdict already on disk for the same reason a changed fix does — the grade
   * describes the answers it graded, and these are no longer those answers.
   *
   * Only ever called from a real interaction, never from the restore effect, so
   * merely revisiting the stage cannot discard a legitimate verdict.
   */
  const selectRootCause = (id: string) => {
    if (id === rootCauseId) return;
    setRootCauseId(id);
    clearVerdict(config.missionId);
  };

  const toggleEvidence = (id: string) => {
    setEvidenceIds((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id],
    );
    clearVerdict(config.missionId);
  };

  const ready = canConfirm(config, { rootCauseId, evidenceIds });
  const evidenceNeeded = Math.max(
    config.minimumEvidenceRequired - evidenceIds.length,
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      <DiagnosisMissionHeader
        title={title}
        description={description}
        severity={severity}
        step={step}
        totalSteps={totalSteps}
      />

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              {config.prompt}
            </h2>
            <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-slate-400">
              Select the issue that best explains the latency. Then choose the
              evidence that supports your diagnosis.
            </p>
          </div>
            <DiagnosisHint hint={config.hint} missionId={config.missionId} />
        </div>

        {/* Reasoning columns: cause on the left, the evidence for it on the right */}
        <div className="mt-6 grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
          <RootCauseList
            options={config.rootCauses}
            selectedId={rootCauseId}
            onSelect={selectRootCause}
          />
          <DiagnosisEvidenceList
            options={config.evidence}
            selectedIds={evidenceIds}
            minimumRequired={config.minimumEvidenceRequired}
            onToggle={toggleEvidence}
          />
        </div>
      </div>

      <DiagnosisConfirmBar
        missionId={config.missionId}
        ready={ready}
        rootCauseChosen={Boolean(rootCauseId)}
        evidenceNeeded={evidenceNeeded}
        onConfirm={() => {
          setConfirmed(true);
          completeStage(config.missionId, "Diagnosis");
        }}
      />
    </div>
  );
}
