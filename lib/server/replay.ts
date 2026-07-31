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

/**
 * Which strategy each fix option actually implements, for the three Chapter 1
 * replays in `lib/verification-replays.ts`.
 *
 * Answer-shaped for the same reason `OFFLOADING_FIXES` is — it enumerates the
 * fix ids — so it stays behind `server-only` and never reaches the bundle.
 * `tests/bundle-secrecy.test.ts` greps the build output for these shapes.
 *
 * Note what this map is *not*: it does not say which strategy is correct, and
 * it is not ordered. Several of these are genuinely good at something —
 * `catch-null` keeps every profile it can, `idempotency` prevents every
 * duplicate — and are wrong for a reason the numbers show rather than a label.
 * The browser receives one strategy name and cannot rank it.
 *
 * The point of writing it down at all is `tests/verification-replays.test.ts`,
 * which executes every option and asserts the measurement matches what
 * `lib/fix.ts` claims in prose. A fix whose explanation and behaviour disagree
 * is a failing test rather than a sentence nobody checked.
 */
const FIX_STRATEGIES: Record<string, Record<string, string>> = {
  "promise-all-cascade": {
    "settle-each-vendor-and-record-outcomes": "settle",
    "catch-each-promise-returning-null": "catch-null",
    "retry-failed-vendor-with-backoff": "retry",
    "wrap-promise-all-in-try-catch": "try-catch",
    "process-vendors-sequentially": "sequential",
  },
  "async-map-trap": {
    "await-the-mapped-promises": "await-all",
    "switch-map-to-foreach": "foreach",
    "wrap-each-call-in-try-catch": "try-catch",
    "increase-worker-job-timeout": "timeout",
    "delay-before-returning": "delay",
  },
  "overlapping-scheduler-runs": {
    "self-scheduling-loop-with-run-guard": "guarded-loop",
    "add-idempotency-key-to-charges": "idempotency",
    "increase-the-interval": "longer-interval",
    "deduplicate-charges-afterwards": "dedupe-after",
    "move-sync-to-a-worker-thread": "worker",
  },
};

/**
 * The strategy to replay for a chosen fix, or the mission's baseline when no fix
 * was chosen or the id is not one this mission offers.
 *
 * Falling back to the baseline rather than throwing matters: an unrecognised fix
 * id must replay the *unfixed* incident, not crash the verification stage. The
 * baselines are duplicated from `verification-replays.ts` rather than imported,
 * because importing a `server-only` module's constants into the client would
 * defeat the boundary this file exists to hold.
 */
const BASELINES: Record<string, string> = {
  "promise-all-cascade": "all",
  "async-map-trap": "unawaited",
  "overlapping-scheduler-runs": "interval",
};

export function replayStrategy(missionId: string, fixId: string | null): string | null {
  const forMission = FIX_STRATEGIES[missionId];
  if (!forMission) return null;
  if (!fixId) return BASELINES[missionId];
  return forMission[fixId] ?? BASELINES[missionId];
}
