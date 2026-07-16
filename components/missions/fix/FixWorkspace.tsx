"use client";

import { useEffect, useMemo, useState } from "react";
import { loadFixState, saveFixState, type MissionFixConfig } from "@/lib/fix";
import { ConfirmedRootCause } from "./ConfirmedRootCause";
import { FixActions } from "./FixActions";
import { FixExplanationPanel } from "./FixExplanationPanel";
import { FixMissionHeader } from "./FixMissionHeader";
import { FixOptionList } from "./FixOptionList";

export function FixWorkspace({
  config,
  title,
  description,
  step,
  totalSteps,
}: {
  config: MissionFixConfig;
  title: string;
  description: string;
  step: number;
  totalSteps: number;
}) {
  const [fixId, setFixId] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Restore after mount — reading localStorage during render would desync the
  // server-rendered markup. Each mission has its own key.
  useEffect(() => {
    setHydrated(false);
    const saved = loadFixState(config);
    setFixId(saved?.fixId ?? null);
    setApplied(saved?.applied ?? false);
    setHydrated(true);
  }, [config]);

  useEffect(() => {
    if (!hydrated) return;
    saveFixState(config.missionId, { fixId, applied });
  }, [hydrated, config.missionId, fixId, applied]);

  const selectedOption = useMemo(
    () => config.options.find((o) => o.id === fixId) ?? null,
    [config.options, fixId],
  );

  return (
    <div className="flex flex-col gap-6">
      <FixMissionHeader
        title={title}
        description={description}
        step={step}
        totalSteps={totalSteps}
      />

      <ConfirmedRootCause rootCause={config.confirmedRootCause} />

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
        <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
          {config.prompt}
        </h2>
        <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-slate-400">
          Select the solution that resolves the root cause and improves
          performance.
        </p>

        {/* Decision layout: options on the left, the reasoning for one on the right */}
        <div className="mt-6 grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
          <FixOptionList
            options={config.options}
            selectedId={fixId}
            onSelect={setFixId}
          />
          <FixExplanationPanel option={selectedOption} />
        </div>
      </div>

      <FixActions
        missionId={config.missionId}
        hint={config.hint}
        ready={Boolean(fixId)}
        onApply={() => setApplied(true)}
      />
    </div>
  );
}
