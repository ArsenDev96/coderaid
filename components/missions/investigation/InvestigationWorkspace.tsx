"use client";

import { useEffect, useMemo, useState } from "react";
import {
  INVESTIGATION_TOOLS,
  findEvidence,
  keyEvidence,
  loadInvestigationState,
  saveInvestigationState,
  type Investigation,
  type InvestigationToolId,
} from "@/lib/investigation";
import type { Severity } from "@/lib/missions";
import { CodeInspectionPanel } from "./CodeInspectionPanel";
import { CollectedEvidencePanel } from "./CollectedEvidencePanel";
import { DatabasePanel } from "./DatabasePanel";
import { InvestigationActions } from "./InvestigationActions";
import { InvestigationToolTabs, panelId, tabId } from "./InvestigationToolTabs";
import { LogsPanel } from "./LogsPanel";
import { MetricsPanel } from "./MetricsPanel";
import { MissionStepProgress } from "./MissionStepProgress";

export function InvestigationWorkspace({
  investigation,
  title,
  severity,
  step,
  totalSteps,
  phase,
}: {
  investigation: Investigation;
  title: string;
  severity: Severity;
  step: number;
  totalSteps: number;
  phase: string;
}) {
  const [activeTool, setActiveTool] = useState<InvestigationToolId>("logs");
  const [collectedIds, setCollectedIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Restore progress after mount — reading localStorage during render would
  // desync the server-rendered markup.
  useEffect(() => {
    const saved = loadInvestigationState(investigation.missionId);
    if (saved) {
      setActiveTool(saved.activeTool);
      setCollectedIds(
        saved.collectedEvidenceIds.filter((id) =>
          Boolean(findEvidence(investigation, id)),
        ),
      );
    }
    setHydrated(true);
  }, [investigation]);

  useEffect(() => {
    if (!hydrated) return;
    saveInvestigationState(investigation.missionId, {
      activeTool,
      collectedEvidenceIds: collectedIds,
    });
  }, [hydrated, investigation.missionId, activeTool, collectedIds]);

  // Marking the same finding twice must not duplicate it.
  const collect = (ids: string[]) =>
    setCollectedIds((prev) => [
      ...prev,
      ...ids.filter((id) => !prev.includes(id) && findEvidence(investigation, id)),
    ]);

  const isCollected = (id: string) => collectedIds.includes(id);

  const collectedItems = useMemo(
    () =>
      collectedIds
        .map((id) => findEvidence(investigation, id))
        .filter((e): e is NonNullable<typeof e> => Boolean(e)),
    [collectedIds, investigation],
  );

  const keyRequired = Math.min(
    investigation.requiredKeyClues,
    keyEvidence(investigation).length,
  );
  // More key clues exist than are required, so cap the count: "4 / 3" reads as a bug.
  const keyCollected = Math.min(
    collectedItems.filter((e) => e.isKeyEvidence).length,
    keyRequired,
  );

  const activeMeta = INVESTIGATION_TOOLS.find((t) => t.id === activeTool)!;

  const panels: Record<InvestigationToolId, React.ReactNode> = {
    logs: (
      <LogsPanel
        logs={investigation.logs}
        isCollected={isCollected}
        onCollect={collect}
      />
    ),
    metrics: (
      <MetricsPanel
        metrics={investigation.metrics}
        isCollected={isCollected}
        onCollect={collect}
      />
    ),
    code: (
      <CodeInspectionPanel
        code={investigation.code}
        isCollected={isCollected}
        onCollect={collect}
      />
    ),
    database: (
      <DatabasePanel
        database={investigation.database}
        isCollected={isCollected}
        onCollect={collect}
      />
    ),
  };

  return (
    <div className="flex flex-col gap-6">
      <MissionStepProgress
        title={title}
        severity={severity}
        step={step}
        totalSteps={totalSteps}
        phase={phase}
        objective={investigation.objective}
        keyCollected={keyCollected}
        keyRequired={keyRequired}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        {/* Dominant area: one tool at a time */}
        <section className="min-w-0 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
          <InvestigationToolTabs active={activeTool} onSelect={setActiveTool} />

          <div
            id={panelId(activeTool)}
            role="tabpanel"
            aria-labelledby={tabId(activeTool)}
            tabIndex={0}
            className="pt-5"
          >
            <p className="mb-4 text-xs text-slate-500">
              {activeMeta.description}
            </p>
            {panels[activeTool]}
          </div>
        </section>

        {/* Support rail: what you found, and the way out */}
        <aside className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-6 xl:self-start">
          <CollectedEvidencePanel
            items={collectedItems}
            keyCollected={keyCollected}
            keyRequired={keyRequired}
          />
          <InvestigationActions
            missionId={investigation.missionId}
            keyCollected={keyCollected}
            keyRequired={keyRequired}
          />
        </aside>
      </div>
    </div>
  );
}
