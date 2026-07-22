import "server-only";

/**
 * Which fix actually moves the work off the thread, per mission.
 *
 * This is answer-shaped — it names the fix that resolves the root cause — so it
 * lives behind `server-only` alongside `answers.ts` rather than in
 * `lib/verification-runtime.ts`, where it would have been compiled into the
 * client bundle in machine-readable form. That is the same leak the
 * `correct*` / `resolvesRootCause` fields were deleted for, and
 * `tests/bundle-secrecy.test.ts` now greps for this shape too.
 *
 * At runtime the browser never reads this: the verification replay is told
 * whether the work moved off the thread by the server's grading verdict. What
 * this exists for is the assertion in `tests/verification-runtime.test.ts` —
 * that executing the authored correct fix *measurably* keeps the thread
 * responsive, and that every distractor *measurably* does not. That turns
 * "this fix works" from a claim in the mission content into something a test
 * can run.
 */
const OFFLOADING_FIXES: Record<string, readonly string[]> = {
  "event-loop-overload": ["move-report-generation-to-worker-thread"],
};

/** True when this mission's chosen fix takes the work off the thread. */
export function offloads(missionId: string, fixId: string | null): boolean {
  if (!fixId) return false;
  return (OFFLOADING_FIXES[missionId] ?? []).includes(fixId);
}
