"use client";

import { useEffect, useMemo } from "react";
import {
  achievementSources,
  getAchievements,
  unlockedIds,
  type Achievement,
} from "@/lib/achievements";
import { stampAchievements } from "@/lib/progress";
import { useProgress } from "@/components/progress/ProgressProvider";

/**
 * Achievements derived from the player's real progress.
 *
 * Derivation is pure — the same ledger always produces the same result, so
 * nothing can unlock twice. The only thing written back is *when* an
 * achievement first crossed its threshold, stamped onto the ledger the moment
 * it does, which is what lets the page say "unlocked 2 days ago" honestly.
 */
export function useAchievements(): Achievement[] {
  const { ledger, hydrated, update } = useProgress();

  const achievements = useMemo(
    () => getAchievements(achievementSources(ledger), ledger.achievements),
    [ledger],
  );

  const newlyUnlocked = useMemo(
    () => unlockedIds(achievements).filter((id) => !(id in ledger.achievements)),
    [achievements, ledger.achievements],
  );

  useEffect(() => {
    if (!hydrated || newlyUnlocked.length === 0) return;
    update((current) => stampAchievements(current, newlyUnlocked));
  }, [hydrated, newlyUnlocked, update]);

  return achievements;
}
