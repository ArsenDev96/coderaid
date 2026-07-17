"use client";

import { useEffect, useState } from "react";
import { loadDraft } from "@/lib/onboarding";
import type { LeaderboardPlayer } from "@/lib/leaderboards";

type Identity = { username: string; avatar: string } | null;

/**
 * The engineer identity from onboarding, if the player created one.
 *
 * Returns null until mounted (and when no profile exists) so the mock roster's
 * own name and avatar stand in — reading after mount avoids a hydration
 * mismatch, and only the identity is borrowed, never the progress.
 */
function useProfileIdentity(): Identity {
  const [identity, setIdentity] = useState<Identity>(null);

  useEffect(() => {
    const draft = loadDraft();
    const name = draft?.name.trim();
    if (!draft || !name) return;
    setIdentity({ username: name, avatar: draft.avatarId });
  }, []);

  return identity;
}

/**
 * Relabels the current user's row with their real profile identity, leaving
 * every ranked stat exactly as the mock standings computed it.
 */
export function useIdentifiedPlayers(
  players: LeaderboardPlayer[],
): LeaderboardPlayer[] {
  const identity = useProfileIdentity();
  if (!identity) return players;

  return players.map((p) =>
    p.isCurrentUser ? { ...p, ...identity } : p,
  );
}
