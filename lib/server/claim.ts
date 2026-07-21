import "server-only";

import { skillRewardFor, type MissionGrade } from "@/lib/grading";
import { getMission, type Mission } from "@/lib/missions";
import { PLAYABLE_MISSION_IDS } from "@/lib/availability";

/**
 * Parsing a pre-account ledger someone is asking us to adopt.
 *
 * This is the one place a score enters the database without this server having
 * graded it, so it is worth being precise about what is and isn't trusted:
 *
 *   - **Trusted:** the score, whether the run resolved, and roughly when. They
 *     have to be — the runs happened in a browser before there was anywhere to
 *     record them, and there is no evidence left to re-derive them from. This
 *     is why the claim is one-time and marked `source = 'claimed'`.
 *   - **Not trusted:** everything derivable. XP is recomputed from the mission
 *     and the score, skill XP is recomputed by the same function that awards it
 *     on a real run, and the mission must be one that actually exists and is
 *     playable. A ledger claiming 9,999 XP for a mission worth 80 gets 80.
 *
 * The effect is that the worst a forged claim can do is assert a perfect score
 * on missions the player owns — the same thing they could get by playing well,
 * and no more.
 */

/** A validated run, ready to insert. */
export type ClaimedRun = {
  missionId: string;
  score: number;
  xpEarned: number;
  resolved: boolean;
  skillXp: Record<string, number>;
  durationMs: number;
  hintsUsed: number;
  completedOn: string;
};

/** 24h — a longer "run" is a stale tab, not a session worth crediting. */
const MAX_DURATION_MS = 24 * 60 * 60 * 1000;
const MAX_HINTS = 32;
/** The catalogue is 20 missions; a claim longer than this is not a ledger. */
const MAX_RUNS = 64;

function num(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** How far back a claimed run may be dated. Comfortably predates the app. */
const MAX_CLAIM_AGE_DAYS = 730;

function utcDay(offset: number, now: Date): string {
  return new Date(now.getTime() + offset * 86_400_000).toISOString().slice(0, 10);
}

/**
 * The date a claimed run happened.
 *
 * Unlike a live submission — which must be *today* in some timezone, and so is
 * bounded to ±1 day — a claimed run genuinely happened in the past, possibly
 * months ago. Flattening those to today would be worse than trusting them: it
 * would invent a streak nobody had and make every imported mission read as
 * finished this morning.
 *
 * So the bound is a window rather than a point: no further back than the app
 * plausibly existed, and no later than tomorrow. A claim still cannot date a
 * run into the future to game a streak, and cannot reach back far enough for
 * the age to mean anything.
 */
export function parseClaimDate(value: unknown, now: Date = new Date()): string {
  const raw = typeof value === "string" ? value : "";
  const fallback = utcDay(0, now);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return fallback;
  if (Number.isNaN(Date.parse(`${raw}T00:00:00Z`))) return fallback;
  if (raw > utcDay(1, now)) return fallback;
  if (raw < utcDay(-MAX_CLAIM_AGE_DAYS, now)) return fallback;
  return raw;
}

/**
 * The XP and skill award a claimed score is worth *now*.
 *
 * Deliberately runs the live reward functions rather than reading the numbers
 * out of the submitted ledger. A mission whose XP value changed since the
 * player earned it pays today's rate, which is the same thing that would happen
 * if they replayed it — and it means the claim cannot smuggle in a figure the
 * catalogue would never produce.
 */
function rewardsFor(mission: Mission, score: number) {
  const xpEarned = Math.round((mission.xp * score) / 100);
  // `skillRewardFor` only reads `score`, so a minimal grade is honest here
  // rather than a fabricated one; the fields it ignores stay at zero.
  const grade = { score, missionId: mission.id } as MissionGrade;
  return { xpEarned, skillXp: skillRewardFor(mission, grade) };
}

/**
 * Validates a submitted ledger into the runs we are willing to record.
 *
 * Returns only missions that exist, are playable and carry a usable record.
 * Anything else is dropped rather than rejected: a ledger with one stale
 * mission id should still let the player keep the rest of their progress.
 */
export function parseClaim(body: unknown, now: Date = new Date()): ClaimedRun[] {
  if (!isRecord(body)) return [];
  const ledger = isRecord(body.ledger) ? body.ledger : null;
  if (!ledger || !isRecord(ledger.missions)) return [];

  const playable = new Set(PLAYABLE_MISSION_IDS);
  const runs: ClaimedRun[] = [];

  for (const [missionId, value] of Object.entries(ledger.missions).slice(0, MAX_RUNS)) {
    if (!playable.has(missionId)) continue;
    const mission = getMission(missionId);
    if (!mission || !isRecord(value)) continue;

    const score = num(value.score, 0, 100, 0);
    // A zero-score run earns nothing and proves nothing; there is no reason to
    // import one, and skipping it keeps the claim to things worth keeping.
    if (score <= 0) continue;

    const { xpEarned, skillXp } = rewardsFor(mission, score);

    runs.push({
      missionId,
      score,
      xpEarned,
      resolved: value.resolved === true,
      skillXp,
      durationMs: num(value.durationMs, 0, MAX_DURATION_MS, 0),
      hintsUsed: num(value.hintsUsed, 0, MAX_HINTS, 0),
      // A real past date, kept — but bounded, so a claim cannot date a run
      // into the future or reach back further than the app has existed.
      completedOn: parseClaimDate(value.completedOn, now),
    });
  }

  return runs;
}
