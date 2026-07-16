"use client";

import { useEffect, useState } from "react";
import { getInvestigation } from "@/lib/investigation";
import { missionStep, type MissionStage } from "@/lib/missions";

export type MissionResume = {
  stage: MissionStage;
  step: number;
  totalSteps: number;
  href: string;
};

const STAGE_ROUTE: Record<MissionStage, string> = {
  Briefing: "briefing",
  Investigation: "investigation",
  Diagnosis: "diagnosis",
  Fix: "fix",
  Verification: "verification",
  Complete: "results",
};

function read(missionId: string, stage: string): Record<string, unknown> | null {
  try {
    const raw = window.localStorage.getItem(`coderaid:${missionId}:${stage}`);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function resolveStage(missionId: string): MissionStage {
  const results = read(missionId, "results");
  if (results?.claimed) return "Complete";

  const verification = read(missionId, "verification");
  if (verification?.completed) return "Complete";

  const fix = read(missionId, "fix");
  if (fix?.applied) return "Verification";

  const diagnosis = read(missionId, "diagnosis");
  if (diagnosis?.confirmed) return "Fix";

  // Investigation counts as done once enough key clues are collected.
  const config = getInvestigation(missionId);
  const investigation = read(missionId, "investigation");
  if (config && investigation) {
    const keyIds = new Set(
      config.evidence.filter((e) => e.isKeyEvidence).map((e) => e.id),
    );
    const collected = Array.isArray(investigation.collectedEvidenceIds)
      ? (investigation.collectedEvidenceIds as unknown[])
      : [];
    const keyCount = collected.filter(
      (id): id is string => typeof id === "string" && keyIds.has(id),
    ).length;
    if (keyCount >= config.requiredKeyClues) return "Diagnosis";
  }

  return "Investigation";
}

function resumeFor(missionId: string): MissionResume {
  const stage = resolveStage(missionId);
  const { step, totalSteps } = missionStep(stage);
  return { stage, step, totalSteps, href: `/missions/${missionId}/${STAGE_ROUTE[stage]}` };
}

/**
 * Where an in-progress mission should resume, derived from its saved stage
 * state. Computed after mount to avoid a hydration mismatch; before that it
 * assumes the start of the investigation.
 */
export function useMissionResume(missionId: string): MissionResume {
  const [resume, setResume] = useState<MissionResume>(() => {
    const { step, totalSteps } = missionStep("Investigation");
    return {
      stage: "Investigation",
      step,
      totalSteps,
      href: `/missions/${missionId}/investigation`,
    };
  });

  useEffect(() => {
    setResume(resumeFor(missionId));
  }, [missionId]);

  return resume;
}
