"use client";

import { useEffect, useState } from "react";
import {
  achievementSources,
  getAchievements,
  type Achievement,
} from "@/lib/achievements";
import { claimedMissionIds } from "@/lib/results";

/**
 * Achievements derived from the player's progress.
 *
 * Renders first from the static canonical progress (mission statuses, skills,
 * streak, XP) so the page is server-renderable, then re-derives after mount
 * with the reward ledger's claimed missions folded in — the same ledger the
 * results screen writes, never a copy of it.
 *
 * Derivation is pure, so re-running it on every render or refresh recomputes
 * the identical result: nothing can unlock twice.
 */
export function useAchievements(): Achievement[] {
  const [achievements, setAchievements] = useState<Achievement[]>(() =>
    getAchievements(),
  );

  useEffect(() => {
    const claimed = claimedMissionIds();
    if (claimed.length === 0) return;
    setAchievements(getAchievements(achievementSources(claimed)));
  }, []);

  return achievements;
}
