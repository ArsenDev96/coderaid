"use client";

import { useEffect, useState } from "react";
import { getInvestigation } from "@/lib/investigation";
import { getMission, missionStep, type MissionStage } from "@/lib/missions";
import { elapsedMs, loadRun } from "@/lib/run";

export type MissionResume = {
  stage: MissionStage;
  step: number;
  totalSteps: number;
  href: string;
  /** True once the player has actually opened this mission. */
  started: boolean;
  /** Key clues collected out of the number the workspace gate requires. */
  cluesFound: number;
  cluesTotal: number;
  /** Rough time left, from the mission estimate minus real time spent. */
  timeLeftLabel: string;
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

/** Key clues the player has actually collected, and how many the gate needs. */
function clues(missionId: string): { found: number; total: number } {
  const config = getInvestigation(missionId);
  if (!config) return { found: 0, total: 0 };

  const keyIds = new Set(
    config.evidence.filter((e) => e.isKeyEvidence).map((e) => e.id),
  );
  const state = read(missionId, "investigation");
  const collected = Array.isArray(state?.collectedEvidenceIds)
    ? (state!.collectedEvidenceIds as unknown[])
    : [];

  return {
    found: collected.filter(
      (id): id is string => typeof id === "string" && keyIds.has(id),
    ).length,
    total: config.requiredKeyClues,
  };
}

function resolveStage(missionId: string, found: number, total: number): MissionStage {
  const results = read(missionId, "results");
  if (results?.claimed) return "Complete";

  const verification = read(missionId, "verification");
  if (verification?.completed) return "Complete";

  const fix = read(missionId, "fix");
  if (fix?.applied) return "Verification";

  const diagnosis = read(missionId, "diagnosis");
  if (diagnosis?.confirmed) return "Fix";

  // Investigation counts as done once enough key clues are collected.
  if (total > 0 && found >= total) return "Diagnosis";

  // Nothing saved at all: the player hasn't started, so the honest next step
  // is the briefing — not the middle of an investigation they never opened.
  return loadRun(missionId) ? "Investigation" : "Briefing";
}

/** Mission estimate minus time already spent, rounded to whole minutes. */
function timeLeft(missionId: string): string {
  const mission = getMission(missionId);
  if (!mission) return "—";
  const run = loadRun(missionId);
  const spentMin = run ? elapsedMs(run) / 60000 : 0;
  const left = Math.max(0, Math.round(mission.minutes - spentMin));
  return left === 0 ? "under a min" : `${left} min`;
}

function resumeFor(missionId: string): MissionResume {
  const { found, total } = clues(missionId);
  const stage = resolveStage(missionId, found, total);
  const { step, totalSteps } = missionStep(stage);
  return {
    stage,
    step,
    totalSteps,
    href: `/missions/${missionId}/${STAGE_ROUTE[stage]}`,
    started: Boolean(loadRun(missionId)),
    cluesFound: found,
    cluesTotal: total,
    timeLeftLabel: timeLeft(missionId),
  };
}

/**
 * Where a mission should resume, and how far into it the player really is.
 *
 * Every figure — the stage, the clue count, the time remaining — is read from
 * that mission's saved state after mount. Before hydration it reports the
 * un-started position, which is the truth for anyone who hasn't played it.
 */
export function useMissionResume(missionId: string): MissionResume {
  const [resume, setResume] = useState<MissionResume>(() => {
    const { step, totalSteps } = missionStep("Briefing");
    const mission = getMission(missionId);
    return {
      stage: "Briefing",
      step,
      totalSteps,
      href: `/missions/${missionId}/briefing`,
      started: false,
      cluesFound: 0,
      cluesTotal: getInvestigation(missionId)?.requiredKeyClues ?? 0,
      timeLeftLabel: mission ? `${mission.minutes} min` : "—",
    };
  });

  useEffect(() => {
    setResume(resumeFor(missionId));
  }, [missionId]);

  return resume;
}
