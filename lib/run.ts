/**
 * Per-mission run telemetry — the raw record of *how* a mission was played.
 *
 * The stage modules each persist what the player chose; this records what they
 * spent getting there: when the run started, which stages they finished, and
 * how many hints they opened. The grading engine turns that into a score, and
 * the results screen reports a real time and step count instead of a literal.
 *
 * One run per mission, reset when the player restarts the mission.
 */

import { MISSION_FLOW, type MissionStage } from "./missions";

export type RunTelemetry = {
  /** Epoch ms when the player first opened a stage of this mission. */
  startedAt: number;
  /** Epoch ms of the most recent stage activity. */
  lastActiveAt: number;
  /** Stages the player has finished, in `MISSION_FLOW` order. */
  stagesCompleted: MissionStage[];
  /** Ids of hints the player opened, de-duplicated. */
  hintsUsed: string[];
};

export function emptyRun(now: number = Date.now()): RunTelemetry {
  return {
    startedAt: now,
    lastActiveAt: now,
    stagesCompleted: [],
    hintsUsed: [],
  };
}

export function runStorageKey(missionId: string): string {
  return `coderaid:${missionId}:run`;
}

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadRun(missionId: string): RunTelemetry | null {
  const store = safeStorage();
  if (!store) return null;
  try {
    const raw = store.getItem(runStorageKey(missionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RunTelemetry>;
    const startedAt =
      typeof parsed.startedAt === "number" ? parsed.startedAt : Date.now();
    return {
      startedAt,
      lastActiveAt:
        typeof parsed.lastActiveAt === "number" ? parsed.lastActiveAt : startedAt,
      // Validated against the canonical flow so a renamed stage can't resurrect.
      stagesCompleted: Array.isArray(parsed.stagesCompleted)
        ? MISSION_FLOW.filter((s) =>
            (parsed.stagesCompleted as unknown[]).includes(s),
          )
        : [],
      hintsUsed: Array.isArray(parsed.hintsUsed)
        ? Array.from(
            new Set(parsed.hintsUsed.filter((h): h is string => typeof h === "string")),
          )
        : [],
    };
  } catch {
    return null;
  }
}

function saveRun(missionId: string, run: RunTelemetry): void {
  const store = safeStorage();
  if (!store) return;
  try {
    store.setItem(runStorageKey(missionId), JSON.stringify(run));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

/**
 * Starts the clock on first contact and keeps it warm afterwards. Safe to call
 * on every stage mount — an existing run's `startedAt` is never overwritten,
 * so the elapsed time spans the whole mission rather than the last stage.
 */
export function touchRun(missionId: string, now: number = Date.now()): RunTelemetry {
  const existing = loadRun(missionId);
  const run = existing
    ? { ...existing, lastActiveAt: now }
    : emptyRun(now);
  saveRun(missionId, run);
  return run;
}

/** Marks a stage finished. Idempotent — re-completing a stage changes nothing. */
export function completeStage(
  missionId: string,
  stage: MissionStage,
  now: number = Date.now(),
): RunTelemetry {
  const run = loadRun(missionId) ?? emptyRun(now);
  if (run.stagesCompleted.includes(stage)) {
    const touched = { ...run, lastActiveAt: now };
    saveRun(missionId, touched);
    return touched;
  }
  const next: RunTelemetry = {
    ...run,
    lastActiveAt: now,
    stagesCompleted: MISSION_FLOW.filter(
      (s) => s === stage || run.stagesCompleted.includes(s),
    ),
  };
  saveRun(missionId, next);
  return next;
}

/** Records that a hint was opened. Re-opening the same hint costs nothing. */
export function recordHint(
  missionId: string,
  hintId: string,
  now: number = Date.now(),
): RunTelemetry {
  const run = loadRun(missionId) ?? emptyRun(now);
  if (run.hintsUsed.includes(hintId)) return run;
  const next: RunTelemetry = {
    ...run,
    lastActiveAt: now,
    hintsUsed: [...run.hintsUsed, hintId],
  };
  saveRun(missionId, next);
  return next;
}

/**
 * Missions the player has opened but not yet finished. Derived by scanning for
 * run telemetry rather than kept as a second list, so it can't drift from the
 * runs themselves. Empty during SSR — callers read it after mount.
 */
export function startedMissionIds(): string[] {
  const store = safeStorage();
  if (!store) return [];
  const ids: string[] = [];
  try {
    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i);
      const match = key && /^coderaid:(.+):run$/.exec(key);
      if (match) ids.push(match[1]);
    }
  } catch {
    return [];
  }
  return ids;
}

/** Clears a mission's telemetry, so a replay is timed from scratch. */
export function clearRun(missionId: string): void {
  const store = safeStorage();
  if (!store) return;
  try {
    store.removeItem(runStorageKey(missionId));
  } catch {
    /* ignore privacy-mode errors */
  }
}

/** Wall-clock time spent on the mission, in milliseconds. */
export function elapsedMs(run: RunTelemetry): number {
  return Math.max(0, run.lastActiveAt - run.startedAt);
}

/** `14m 32s` — the format the results screen reports. */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
