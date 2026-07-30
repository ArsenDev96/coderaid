/**
 * How often a player may have a run graded on one mission — the closure of the
 * open half of §12 item 19.
 *
 * **Why a rate limit is the closure.** `lib/server/grade-disclosure.ts` removed
 * the *separable* signal from the response: the per-component breakdown now goes
 * out only when a run beats the player's best, so the three answers can no
 * longer be searched one at a time. Two leaks survived it, and neither can be
 * fixed by withholding more:
 *
 *   - `resolved` has to be sent, because the verification stage renders its
 *     whole report from it. One bit per attempt, which finds the fix in one
 *     attempt per candidate.
 *   - The score is partly decomposable arithmetic — the weights are public
 *     (45/25/30, −5 per hint) and the player knows their own hint count.
 *
 * What made those cheap to exploit was that attempts were free and unbounded.
 * Bounding the *rate* is what makes enumeration expensive: an answer space that
 * fell in ~17 attempts now takes hours rather than seconds, and the attempts are
 * all recorded under the player's own id while they do it.
 *
 * **What it does not do, stated so nobody over-trusts it.** A player can always
 * read their own progress — `GET /api/ledger` returns their best run per
 * mission, including its score and whether it resolved, because that is their
 * own earned result and the dashboard is built from it. So this limits how fast
 * an enumerator can learn, not what a determined one can eventually learn. It is
 * a cost control, not an information barrier. §12 item 19 stays "narrowed".
 *
 * Pure, so the policy is testable in Node with no database: the route supplies
 * the timestamps, this decides what they mean (§4 principle 9).
 */

/**
 * Graded attempts allowed per mission per window.
 *
 * Set against real replay rather than against the attacker: a mission takes
 * 10–15 minutes to play honestly, and the heaviest legitimate pattern — get the
 * fix wrong, re-read the logs, try again — is three or four runs. Eight leaves
 * that room twice over while still bounding a search to eight guesses an hour.
 */
export const REPLAY_LIMIT = 8;

/** The rolling window the limit applies over. */
export const REPLAY_WINDOW_MS = 60 * 60 * 1000;

/**
 * Per mission, not per account. A player working through several incidents in an
 * evening is the behaviour the product wants; an account-wide cap would punish
 * exactly that while barely slowing an enumerator, who only ever needs to hammer
 * one mission at a time.
 */
export type ReplayVerdict = {
  /** Whether this attempt is over the limit. */
  limited: boolean;
  /** Graded attempts already inside the window. */
  attempts: number;
  limit: number;
  /**
   * Milliseconds until the window has room again — the oldest counted attempt
   * ageing out. Zero when not limited.
   */
  retryAfterMs: number;
};

/**
 * Decides whether the attempt being made *now* is over the limit.
 *
 * `recent` is every graded attempt's server timestamp for this player and
 * mission; anything outside the window is ignored here rather than trusted to
 * have been filtered, so a caller that over-fetches is still correct.
 */
export function replayVerdict(
  recent: readonly (string | number | Date)[],
  now: Date = new Date(),
): ReplayVerdict {
  const cutoff = now.getTime() - REPLAY_WINDOW_MS;
  const inWindow = recent
    .map((at) => new Date(at).getTime())
    .filter((ms) => Number.isFinite(ms) && ms > cutoff)
    .sort((a, b) => a - b);

  const attempts = inWindow.length;
  const limited = attempts >= REPLAY_LIMIT;

  // The oldest attempt in the window is the one whose expiry frees a slot.
  const oldest = inWindow[0];
  const retryAfterMs =
    limited && oldest !== undefined
      ? Math.max(0, oldest + REPLAY_WINDOW_MS - now.getTime())
      : 0;

  return { limited, attempts, limit: REPLAY_LIMIT, retryAfterMs };
}

/** "in 12 minutes" / "in under a minute" — for the message the player reads. */
export function retryLabel(retryAfterMs: number): string {
  const minutes = Math.ceil(retryAfterMs / 60_000);
  if (minutes <= 1) return "in under a minute";
  return `in ${minutes} minutes`;
}
