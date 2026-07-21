"use client";

import { useMemo } from "react";
import {
  achievementSources,
  getAchievements,
  type Achievement,
} from "@/lib/achievements";
import { useProgress } from "@/components/progress/ProgressProvider";

/**
 * Achievements derived from the player's real progress.
 *
 * Derivation is pure — the same ledger always produces the same result, so
 * nothing can unlock twice. It is also the *only* thing that happens here now:
 * the unlock time is stamped by the server, in the same request that recorded
 * the run or the active day which crossed the threshold.
 *
 * That is what this hook used to do itself, and it was the last place the
 * browser still asserted something it had earned. `player_achievements` has no
 * insert policy, so the claim could only ever have been advisory.
 */
export function useAchievements(): Achievement[] {
  const { ledger } = useProgress();

  return useMemo(
    () => getAchievements(achievementSources(ledger), ledger.achievements),
    [ledger],
  );
}
