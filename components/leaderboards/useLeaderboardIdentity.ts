"use client";

import { useMemo } from "react";
import { useProgress } from "@/components/progress/ProgressProvider";
import { currentPlayerEntry } from "@/lib/leaderboards";

/**
 * The player's own leaderboard entry, built from their progression ledger and
 * labelled with their onboarding identity.
 *
 * Their rank, percentile, period XP and mission counts are all real; the rest
 * of the field is a fixed demo roster, because there is no backend to rank
 * them against. Returns null until the ledger has hydrated, so the server and
 * the first client paint agree.
 */
export function useCurrentPlayerEntry() {
  const { ledger, player, avatar, hydrated } = useProgress();

  return useMemo(
    () =>
      hydrated ? currentPlayerEntry(ledger, player.name, avatar.id) : null,
    [hydrated, ledger, player.name, avatar.id],
  );
}
