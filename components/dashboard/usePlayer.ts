"use client";

import { useEffect, useState } from "react";
import { AVATARS, loadDraft, type Avatar } from "@/lib/onboarding";
import { DEMO_PLAYER } from "@/lib/dashboard";

type PlayerIdentity = {
  name: string;
  slogan: string;
  avatar: Avatar;
};

const DEFAULT_AVATAR = AVATARS[0];

/**
 * Reads the engineer identity created during onboarding from localStorage.
 * Falls back to the demo player so the dashboard is populated on first visit.
 * Runs after mount to avoid hydration mismatches.
 */
export function usePlayer(): PlayerIdentity {
  const [identity, setIdentity] = useState<PlayerIdentity>({
    name: DEMO_PLAYER.name,
    slogan: "Code. Debug. Deploy. Repeat.",
    avatar: DEFAULT_AVATAR,
  });

  useEffect(() => {
    const draft = loadDraft();
    if (!draft) return;
    const avatar =
      AVATARS.find((a) => a.id === draft.avatarId) ?? DEFAULT_AVATAR;
    setIdentity({
      name: draft.name.trim() || DEMO_PLAYER.name,
      slogan: draft.slogan,
      avatar,
    });
  }, []);

  return identity;
}
