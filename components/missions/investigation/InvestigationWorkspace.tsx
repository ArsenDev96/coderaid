"use client";

import { useEffect, useMemo, useState } from "react";
import {
  findEvidence,
  keyEvidence,
  loadInvestigationState,
  rowKey,
  selectableRowsOnTool,
  saveInvestigationState,
  toolsFor,
  type Investigation,
  type InvestigationToolId,
} from "@/lib/investigation";
import { clearInvestigationOnward } from "@/lib/mission-storage";
import type { Severity } from "@/lib/missions";
import { touchRun } from "@/lib/run";
import { AlreadyCollectedNotice } from "./AlreadyCollectedNotice";
import { CodeInspectionPanel } from "./CodeInspectionPanel";
import { CollectedEvidencePanel } from "./CollectedEvidencePanel";
import { DatabasePanel } from "./DatabasePanel";
import { InvestigationActions } from "./InvestigationActions";
import { InvestigationToolTabs, panelId, tabId } from "./InvestigationToolTabs";
import { LogsPanel } from "./LogsPanel";
import { MetricsPanel } from "./MetricsPanel";
import { MissionStepProgress } from "./MissionStepProgress";
import { RestartInvestigationDialog } from "./RestartInvestigationDialog";
import { RestoredProgressNotice } from "./RestoredProgressNotice";
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
  /**
   * Rows the player marked, as `tool:rowId`. `null` is a save from before rows
   * were tracked — see `InvestigationState.markedRowKeys`. It stays null for
   * the rest of that mission rather than flipping mid-investigation, which
   * would silently re-label rows the player *had* marked as somebody else's.
   */
  const [markedRowKeys, setMarkedRowKeys] = useState<string[] | null>([]);
  const [hydrated, setHydrated] = useState(false);
  /**
   * How many findings were already collected when this visit began — 0 for a
   * fresh start, and reset to 0 the moment the player collects something now.
   * It is the count the notice reports, so the number on screen is always the
   * real size of what was restored rather than the current total.
   */
  const [restoredCount, setRestoredCount] = useState(0);
  const [confirmingRestart, setConfirmingRestart] = useState(false);

  // Restore progress after mount — reading localStorage during render would
  // desync the server-rendered markup. Each mission has its own key, so
  // switching missions starts from that mission's own saved state.
  useEffect(() => {
    setHydrated(false);
    setConfirmingRestart(false);
    // Starts the run clock on first contact with the mission.
    touchRun(investigation.missionId);
    const saved = loadInvestigationState(
      investigation.missionId,
      investigation.tools,
    );
    const restored = (saved?.collectedEvidenceIds ?? []).filter((id) =>
      Boolean(findEvidence(investigation, id)),
    );
    setActiveTool(saved?.activeTool ?? investigation.tools[0]);
    setCollectedIds(restored);
    setMarkedRowKeys(saved ? saved.markedRowKeys : []);
    // Only what came back from a previous visit counts as restored. Anything
    // collected from here on is the player's own doing and needs no notice.
    setRestoredCount(restored.length);
    setHydrated(true);
  }, [investigation]);

  useEffect(() => {
    if (!hydrated) return;
    saveInvestigationState(investigation.missionId, {
      activeTool,
      collectedEvidenceIds: collectedIds,
      markedRowKeys,
    });
  }, [hydrated, investigation.missionId, activeTool, collectedIds, markedRowKeys]);

  // Marking the same finding twice must not duplicate it.
  const collect = (ids: string[], rowIds: string[]) => {
    // The notice explains rows the player did not mark in this session. Once
    // they mark one, there is nothing left to explain.
    setRestoredCount(0);
    setCollectedIds((prev) => [
      ...prev,
      ...ids.filter((id) => !prev.includes(id) && findEvidence(investigation, id)),
    ]);
    // Every row they clicked is theirs, including ones whose finding was
    // already held — clicking it is what the tick reports.
    setMarkedRowKeys((prev) => {
      if (prev === null) return null; // Legacy save: see the state declaration.
      const next = new Set(prev);
      for (const id of rowIds) next.add(rowKey(activeTool, id));
      return [...next];
    });
  };

  /**
   * Restart: drop the saved evidence and everything built on it, then reset
   * this screen to its opening state. The storage sweep and the local reset
   * have to agree, or the save effect below would immediately write the old
   * selections back over the cleared key.
   */
  const restart = () => {
    clearInvestigationOnward(investigation.missionId);
    setCollectedIds([]);
    setMarkedRowKeys([]);
    setActiveTool(investigation.tools[0]);
    setRestoredCount(0);
    setConfirmingRestart(false);
  };

  /**
   * The finding a row was collected *as*, or null if it has not been collected.
   *
   * Returning the name rather than a boolean is what lets a row say which
   * finding it belongs to, so two rows ticking together read as one discovery
   * seen twice instead of one tick the player cannot account for. Truthiness is
   * the collected test, exactly as the old boolean was.
   *
   * `collectedIds` only ever holds ids that resolve — both the restore path and
   * `collect` filter through `findEvidence` — so a collected row cannot fall
   * back to looking uncollected here.
   */
  const collectedAs = (id: string) =>
    collectedIds.includes(id)
      ? (findEvidence(investigation, id)?.title ?? null)
      : null;

  /**
   * Did the player mark *this row*, as opposed to holding its finding from
   * somewhere else? Bound to the active tool, so panels never handle tool ids.
   */
  const markedHere = (rowId: string) =>
    markedRowKeys === null || markedRowKeys.includes(rowKey(activeTool, rowId));

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

  /**
   * Rows on this tool showing as "already held" — their finding is collected
   * but the player marked it elsewhere. These are exactly the rows that need
   * explaining; rows they marked here explain themselves.
   */
  const heldElsewhere = useMemo(() => {
    if (markedRowKeys === null) return { rowCount: 0, findingCount: 0 };
    const rows = selectableRowsOnTool(investigation, activeMeta.id).filter(
      (r) =>
        collectedIds.includes(r.evidenceId) &&
        !markedRowKeys.includes(rowKey(activeMeta.id, r.rowId)),
    );
    return {
      rowCount: rows.length,
      findingCount: new Set(rows.map((r) => r.evidenceId)).size,
    };
  }, [investigation, activeMeta.id, collectedIds, markedRowKeys]);

  const renderPanel = () => {
    const hint = activeMeta.hint;
    switch (activeMeta.id) {
      case "logs":
        return (
          <LogsPanel
            logs={investigation.logs}
            hint={hint}
            collectedAs={collectedAs}
            markedHere={markedHere}
            onCollect={collect}
          />
        );
      case "metrics":
        return (
          <MetricsPanel
            metrics={investigation.metrics}
            hint={hint}
            collectedAs={collectedAs}
            markedHere={markedHere}
            onCollect={collect}
          />
        );
      case "code":
        return (
          <CodeInspectionPanel
            code={investigation.code}
            hint={hint}
            collectedAs={collectedAs}
            markedHere={markedHere}
            onCollect={collect}
          />
        );
      case "database":
        return (
          <DatabasePanel
            database={investigation.database}
            hint={hint}
            collectedAs={collectedAs}
            markedHere={markedHere}
            onCollect={collect}
          />
        );
      case "trace":
        // `tools` only lists "trace" when the mission authored trace content.
        return investigation.trace ? (
          <TracePanel
            trace={investigation.trace}
            hint={hint}
            collectedAs={collectedAs}
            markedHere={markedHere}
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

      {restoredCount > 0 && (
        <RestoredProgressNotice
          count={restoredCount}
          onRestart={() => setConfirmingRestart(true)}
        />
      )}

      {confirmingRestart && (
        <RestartInvestigationDialog
          onConfirm={restart}
          onClose={() => setConfirmingRestart(false)}
        />
      )}

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
            <AlreadyCollectedNotice
              rowCount={heldElsewhere.rowCount}
              findingCount={heldElsewhere.findingCount}
            />
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
