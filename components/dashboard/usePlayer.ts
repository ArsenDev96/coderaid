"use client";

import { useProgress } from "@/components/progress/ProgressProvider";
import type { Avatar } from "@/lib/onboarding";

type PlayerIdentity = {
  name: string;
  slogan: string;
  avatar: Avatar;
};

/**
 * The engineer identity created during onboarding.
 *
 * A thin read over the progress provider, which owns hydration for both the
 * identity and the progression ledger — so a component can't end up showing a
 * name from one source and XP from another.
 */
export function usePlayer(): PlayerIdentity {
  const { player, slogan, avatar } = useProgress();
  return { name: player.name, slogan, avatar };
}
