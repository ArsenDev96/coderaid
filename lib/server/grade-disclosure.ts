import "server-only";

import type { MissionGrade } from "@/lib/grading";
import type { Ledger } from "@/lib/progress";

/**
 * How much of a grade the server is willing to say out loud.
 *
 * **The problem this exists for (§12 item 19).** `POST /api/runs` grades a
 * submission and records it, and §16.3 argued that recording it is what stops
 * the endpoint being an answer oracle. That is only half right, because
 * recording turns out not to be a cost:
 *
 *   - there is no server-side stage gating — `StageGate` is client-side, so a
 *     submission is accepted whether or not the player opened the investigation;
 *   - there is no rate limit;
 *   - best-run-wins means a worse replay changes nothing, so a wrong guess costs
 *     a player nothing but a row.
 *
 * On its own that would still leave an attacker searching the *product* of the
 * three answers. What collapses it is the response: `rootCauseCorrect` and the
 * evidence hit counts say **which component** was right, so the three answers
 * can be found one at a time. For a mission with 4 causes, 5 fixes and 8
 * evidence items that is ~17 attempts instead of ~160.
 *
 * **What this does.** Discloses the per-component detail only when the run
 * improved on the player's best for that mission. A player who beat their
 * previous attempt has earned the feedback; an enumerator submitting guesses has
 * not, and learns only what the score arithmetic already tells them.
 *
 * **What this deliberately does NOT do, stated plainly so the next reader does
 * not over-trust it:**
 *
 *   - `resolved` is always disclosed, because the verification stage renders its
 *     whole report from it. So the *fix* answer still leaks one bit per attempt
 *     and can be found in one attempt per candidate fix. That is inherent —
 *     telling a player whether their fix worked is the game.
 *   - The score itself is partly decomposable arithmetic: the weights are public
 *     (45/25/30, −5 per hint) and the player knows their own hint count, so some
 *     scores identify their components uniquely. A score of 30 can only be a
 *     correct fix and nothing else.
 *
 * So this narrows the oracle; it does not close it. **The closure is a rate
 * limit**, which `mission_runs` already has the data for — it is recorded as the
 * remaining half of §12 item 19 rather than done here, because a rate limit is a
 * product decision about how often a player may legitimately replay.
 */

/** The fields that say which component of the answer was right. */
const DISCLOSED_ONLY_ON_IMPROVEMENT = [
  "rootCauseCorrect",
  "fixCorrect",
  "evidenceHits",
  "evidenceTotal",
  "evidenceMisses",
  "breakdown",
] as const;

/**
 * Whether this run beat what the player already had for this mission.
 *
 * Strictly greater. An equal score is not an improvement — it earns nothing
 * under best-run-wins either, and treating a tie as an improvement would hand
 * the detail back for free to anyone who resubmits their own best answer.
 *
 * A mission with no record is always an improvement: the first honest run must
 * show its working, and there is nothing to enumerate against yet.
 */
export function improvesOnBest(
  grade: MissionGrade,
  before: Ledger,
): boolean {
  const previous = before.missions[grade.missionId];
  return !previous || grade.score > previous.score;
}

/**
 * The grade as the player may see it.
 *
 * Returns the grade untouched when the run improved, and a copy with the
 * per-component fields **removed** when it did not. Removed, not zeroed: an
 * absent field is "the server did not say", and a `false` would be the server
 * asserting the player got it wrong, which it has no business claiming here.
 */
export function disclosedGrade(
  grade: MissionGrade,
  before: Ledger,
): MissionGrade {
  if (improvesOnBest(grade, before)) return grade;

  const withheld: MissionGrade = { ...grade, detailed: false };
  for (const field of DISCLOSED_ONLY_ON_IMPROVEMENT) {
    delete withheld[field];
  }
  return withheld;
}
