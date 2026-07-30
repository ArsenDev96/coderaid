/**
 * The reset tombstone — which recorded facts still count (§12 item 7).
 *
 * "Reset Progress" for a signed-in player could not erase earned XP, because
 * runs are append-only and best-run-wins is a query over them rather than a
 * mutation. The decision (2026-07-30) was a **tombstone, not a delete**:
 * `players.reset_at` marks the moment a player started over, and every
 * derivation ignores what came before it. Nothing leaves `mission_runs`.
 *
 * Append-only is load-bearing in three separate places, which is why a delete
 * was the wrong answer: it is what makes "best run wins" a query, what makes a
 * replay an upgrade rather than a second award, and what makes the replay limit
 * (`lib/replay-limit.ts`) self-enforcing — that limit counts rows, so deleting
 * them would turn Reset Progress into a rate-limit bypass.
 *
 * `best_runs` applies the filter in SQL (migration 0004), so scores and XP need
 * nothing here. These rules cover the two sources the view does not reach: the
 * active days a streak is counted from, and the achievement unlock stamps.
 *
 * Pure, so the semantics are testable in Node with no database.
 */

/** The tombstone as epoch ms, or null when the player has never reset. */
export function resetInstant(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Whether a recorded fact still counts after the tombstone.
 *
 * Accepts either an ISO instant or a `YYYY-MM-DD` calendar day, because the two
 * sources this guards are stored differently and must be compared differently:
 *
 *   - an **instant** (an achievement's `unlocked_at`) must be strictly after the
 *     reset;
 *   - a **calendar day** (`player_active_days.day`) counts if it is the reset
 *     day *or* later. A player who reset at 14:00 was genuinely here that day,
 *     and discarding it would break a streak they actually kept.
 *
 * Anything unparsable is **kept**, on the same principle as a failed `reset_at`
 * read: silently discarding real progress is the worse failure of the two.
 */
export function countsAfterReset(value: string, resetAt: number | null): boolean {
  if (resetAt === null) return true;
  const ms = new Date(value).getTime();
  if (!Number.isFinite(ms)) return true;
  return value.length === 10 ? ms >= startOfUtcDay(resetAt) : ms > resetAt;
}

function startOfUtcDay(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}
