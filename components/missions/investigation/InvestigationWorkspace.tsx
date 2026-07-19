"use client";

import { useEffect, useMemo, useState } from "react";
import {
  findEvidence,
  keyEvidence,
  loadInvestigationState,
  saveInvestigationState,
  toolsFor,
  type Investigation,
  type InvestigationToolId,
} from "@/lib/investigation";
import type { Severity } from "@/lib/missions";
import { touchRun } from "@/lib/run";
import { CodeInspectionPanel } from "./CodeInspectionPanel";
import { CollectedEvidencePanel } from "./CollectedEvidencePanel";
import { DatabasePanel } from "./DatabasePanel";
import { InvestigationActions } from "./InvestigationActions";
import { InvestigationToolTabs, panelId, tabId } from "./InvestigationToolTabs";
import { LogsPanel } from "./LogsPanel";
import { MetricsPanel } from "./MetricsPanel";
import { MissionStepProgress } from "./MissionStepProgress";
import { TracePanel } from "./TracePanel";

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
  const tools = useMemo(() => toolsFor(investigation), [investigation]);

  const [activeTool, setActiveTool] = useState<InvestigationToolId>(
    investigation.tools[0],
  );
  const [collectedIds, setCollectedIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Restore progress after mount — reading localStorage during render would
  // desync the server-rendered markup. Each mission has its own key, so
  // switching missions starts from that mission's own saved state.
  useEffect(() => {
    setHydrated(false);
    // Starts the run clock on first contact with the mission.
    touchRun(investigation.missionId);
    const saved = loadInvestigationState(
      investigation.missionId,
      investigation.tools,
    );
    setActiveTool(saved?.activeTool ?? investigation.tools[0]);
    setCollectedIds(
      (saved?.collectedEvidenceIds ?? []).filter((id) =>
        Boolean(findEvidence(investigation, id)),
      ),
    );
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

  const activeMeta = tools.find((t) => t.id === activeTool) ?? tools[0];

  const renderPanel = () => {
    const hint = activeMeta.hint;
    switch (activeMeta.id) {
      case "logs":
        return (
          <LogsPanel
            logs={investigation.logs}
            hint={hint}
            isCollected={isCollected}
            onCollect={collect}
          />
        );
      case "metrics":
        return (
          <MetricsPanel
            metrics={investigation.metrics}
            hint={hint}
            isCollected={isCollected}
            onCollect={collect}
          />
        );
      case "code":
        return (
          <CodeInspectionPanel
            code={investigation.code}
            hint={hint}
            isCollected={isCollected}
            onCollect={collect}
          />
        );
      case "database":
        return (
          <DatabasePanel
            database={investigation.database}
            hint={hint}
            isCollected={isCollected}
            onCollect={collect}
          />
        );
      case "trace":
        // `tools` only lists "trace" when the mission authored trace content.
        return investigation.trace ? (
          <TracePanel
            trace={investigation.trace}
            hint={hint}
            isCollected={isCollected}
            onCollect={collect}
          />
        ) : null;
    }
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
          <InvestigationToolTabs
            tools={tools}
            active={activeMeta.id}
            onSelect={setActiveTool}
          />

          <div
            id={panelId(activeMeta.id)}
            role="tabpanel"
            aria-labelledby={tabId(activeMeta.id)}
            tabIndex={0}
            className="pt-5"
          >
            <p className="mb-4 text-xs text-slate-500">
              {activeMeta.description}
            </p>
            {renderPanel()}
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
