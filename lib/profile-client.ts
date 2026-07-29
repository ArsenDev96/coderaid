import { AVATARS, DEFAULT_DRAFT, type ProfileDraft } from "./onboarding";

/**
 * The client half of the profile: hand the player's identity to the server,
 * and read back what it stored.
 *
 * The wire shape is deliberately the *client's* vocabulary — `name`, not
 * `display_name` — and it is declared here, in a module both halves can import,
 * so `lib/server/profile.ts` depends on the public contract rather than the
 * other way round. That is the same arrangement `MissionAnswers` has with
 * `lib/grading.ts`, and for the same reason: no client module should ever need
 * to reach into a `server-only` one, even for a type.
 *
 * Only signed-in players have anywhere to send this. Signed out, the profile
 * stays in `coderaid:profile` exactly as before — which is what lets the
 * onboarding wizard work before there is an account to attach it to.
 */

/** The profile as the database holds it. */
export type ServerProfile = {
  name: string;
  avatarId: string | null;
  slogan: string | null;
  pathId: string | null;
  experienceId: string | null;
  completed: boolean;
};

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** Reads an unknown payload into a profile, or null if it isn't one. */
export function coerceProfile(value: unknown): ServerProfile | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  const name = str(raw.name);
  if (!name) return null;
  return {
    name,
    avatarId: str(raw.avatarId),
    slogan: str(raw.slogan),
    pathId: str(raw.pathId),
    experienceId: str(raw.experienceId),
    completed: raw.completed === true,
  };
}

/**
 * Folds a stored profile into a local draft.
 *
 * The server owns identity for a signed-in player, but it has no column for
 * `step` — which wizard page you were on is working state, not a fact about
 * you — so that is kept from the local draft. A column the server has never
 * had written to it is null, and falls back rather than blanking a local value.
 */
export function draftFromProfile(
  profile: ServerProfile,
  local: ProfileDraft = DEFAULT_DRAFT,
): ProfileDraft {
  return {
    ...local,
    name: profile.name,
    avatarId: profile.avatarId ?? local.avatarId,
    slogan: profile.slogan ?? local.slogan,
    pathId: profile.pathId ?? local.pathId,
    experienceId: profile.experienceId ?? local.experienceId,
    completed: profile.completed || local.completed,
  };
}

/** The avatar a stored profile names, falling back to the default. */
export function avatarFor(avatarId: string | null | undefined) {
  return AVATARS.find((a) => a.id === avatarId) ?? AVATARS[0];
}

/**
 * Persists the profile for a signed-in player.
 *
 * Returns null when there is no session or the write failed — the caller keeps
 * its local copy either way, so a signed-out player and a server hiccup produce
 * the same behaviour they had before this route existed.
 */
export async function saveProfile(
  draft: ProfileDraft,
): Promise<ServerProfile | null> {
  try {
    const response = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: draft.name,
        avatarId: draft.avatarId,
        slogan: draft.slogan,
        pathId: draft.pathId,
        experienceId: draft.experienceId,
        completed: draft.completed,
      }),
    });
    if (!response.ok) return null;
    const { profile } = (await response.json()) as { profile?: unknown };
    return coerceProfile(profile);
  } catch {
    return null;
  }
}
