import "server-only";

import type { MissionStage } from "@/lib/missions";
import type { RunTelemetry } from "@/lib/run";

/**
 * The shape a client may submit for grading, and the parser that refuses
 * anything else.
 *
 * Written as an explicit parser rather than a cast because this is the one
 * place untrusted input crosses into the grader. Every field is bounded: a
 * submission cannot claim a thousand hints, a negative duration or a
 * ten-thousand-item evidence list. Nothing here decides a score — it decides
 * whether the request is well-formed enough to grade at all.
 */

export type RunSubmission = {
  missionId: string;
  rootCauseId: string | null;
  evidenceIds: string[];
  fixId: string | null;
  fixApplied: boolean;
  telemetry: RunTelemetry;
  /** The player's own calendar date — the unit the streak counts in. */
  completedOn: string;
};

/** Generous ceilings — they exist to bound abuse, not to constrain play. */
const MAX_EVIDENCE = 64;
const MAX_HINTS = 32;
const MAX_STAGES = 12;
/** 24h. A longer "run" is a stale tab, not a session worth crediting. */
const MAX_DURATION_MS = 24 * 60 * 60 * 1000;

const STAGES: MissionStage[] = [
  "Briefing",
  "Investigation",
  "Diagnosis",
  "Fix",
  "Verification",
  "Complete",
];

function str(value: unknown, max = 128): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= max
    ? value
    : null;
}

function strList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const item of value.slice(0, max)) {
    const s = str(item);
    if (s) seen.add(s);
  }
  return [...seen];
}

function int(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.trunc(value)))
    : fallback;
}

/** UTC calendar date, shifted by whole days. */
function utcDay(offset: number, now: Date): string {
  const d = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

/**
 * The player's local calendar date, bounded to what a real timezone can
 * justify.
 *
 * Streaks are counted in *local* days, so the server cannot compute this: at
 * 01:00 in UTC+4 the player's "today" is the server's "yesterday", and using
 * UTC would break a streak the UI had already told them was intact. So the
 * client sends it — but only a timezone is trusted, never a date. Anything
 * outside ±1 day of the server's own UTC date is discarded rather than
 * rejected, which caps the abuse at a single day and makes a stale tab
 * harmless instead of a 400.
 */
export function parseLocalDate(value: unknown, now: Date = new Date()): string {
  const raw = typeof value === "string" ? value : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return utcDay(0, now);
  const allowed = [utcDay(-1, now), utcDay(0, now), utcDay(1, now)];
  return allowed.includes(raw) ? raw : utcDay(0, now);
}

/**
 * Parses a submission, or returns null if it is unusable.
 *
 * Note what is *not* trusted: `durationMs` is derived from the submitted
 * timestamps and clamped, and the stage list is filtered to real stages. A
 * client can still under-report its own hints — that is inherent to telemetry
 * the client owns, and is why the answer, not the telemetry, carries the score.
 */
export function parseSubmission(body: unknown): RunSubmission | null {
  if (typeof body !== "object" || body === null) return null;
  const raw = body as Record<string, unknown>;

  const missionId = str(raw.missionId, 96);
  if (!missionId) return null;

  const telemetryRaw =
    typeof raw.telemetry === "object" && raw.telemetry !== null
      ? (raw.telemetry as Record<string, unknown>)
      : {};

  const startedAt = int(telemetryRaw.startedAt, 0, Number.MAX_SAFE_INTEGER, 0);
  const lastActiveAt = int(
    telemetryRaw.lastActiveAt,
    startedAt,
    startedAt + MAX_DURATION_MS,
    startedAt,
  );

  const stagesCompleted = strList(telemetryRaw.stagesCompleted, MAX_STAGES).filter(
    (s): s is MissionStage => (STAGES as string[]).includes(s),
  );

  return {
    missionId,
    rootCauseId: str(raw.rootCauseId, 96),
    evidenceIds: strList(raw.evidenceIds, MAX_EVIDENCE),
    fixId: str(raw.fixId, 96),
    fixApplied: raw.fixApplied === true,
    telemetry: {
      startedAt,
      lastActiveAt,
      stagesCompleted,
      hintsUsed: strList(telemetryRaw.hintsUsed, MAX_HINTS),
    },
    completedOn: parseLocalDate(raw.completedOn),
  };
}
