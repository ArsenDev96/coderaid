import "server-only";

import {
  AVATARS,
  EXPERIENCE_LEVELS,
  NAME_MAX,
  PATHS,
} from "@/lib/onboarding";

/**
 * The profile columns a player may write, and the parser that bounds them.
 *
 * These are the six columns `0001_init.sql` grants `UPDATE` on to
 * `authenticated` — the only write a player is allowed anywhere in the schema.
 * Nothing here is scored: a name, an avatar, a slogan and the two onboarding
 * answers. The grant is what actually enforces that, so this parser is about
 * *shape*, not authority.
 *
 * `displayName` is the one field with a genuine blast radius. It is the only
 * player-authored string another player ever sees — `lib/server/standings.ts`
 * renders it straight onto the leaderboard — so it is bounded for what it can
 * do to someone else's screen, not just for length.
 *
 * What this deliberately does **not** do is moderate. There is no word list and
 * no review queue; a determined player can still pick a rude handle. That is a
 * product decision with a person attached to it, and half of one implemented
 * here would read as protection that isn't there.
 */

/** Everything a player may change about themselves. All fields optional. */
export type ProfileUpdate = {
  display_name?: string;
  avatar_id?: string;
  slogan?: string;
  path_id?: string;
  experience_id?: string;
  onboarding_completed?: boolean;
};

/** Slogans are chosen from a list, but bounded in case the control changes. */
const SLOGAN_MAX = 64;

const AVATAR_IDS = new Set(AVATARS.map((a) => a.id));
const PATH_IDS = new Set(PATHS.map((p) => p.id));
const EXPERIENCE_IDS = new Set(EXPERIENCE_LEVELS.map((e) => e.id));

/**
 * Code points a display name may not contain.
 *
 * Written as numeric ranges rather than a regex literal on purpose: every one
 * of these characters is invisible in a source file, so an escaped character
 * class is a line nobody can proofread and a literal one is a line that
 * silently loses its contents to the next tool that touches the file.
 *
 * The three groups, and why each is here:
 *   - **C0 / DEL / C1** — newline and tab break the leaderboard row.
 *   - **Zero-width and joiners** — let two different names render identically,
 *     so anyone can appear to be anyone.
 *   - **Bidi overrides and isolates** — reorder the text *around* them, so one
 *     player's name can visually rewrite the column beside it.
 */
function isStripped(cp: number): boolean {
  if (cp <= 0x1f) return true; // C0 controls, newline and tab included
  if (cp >= 0x7f && cp <= 0x9f) return true; // DEL and the C1 block
  if (cp >= 0x200b && cp <= 0x200d) return true; // ZWSP, ZWNJ, ZWJ
  if (cp === 0x2060 || cp === 0xfeff) return true; // word joiner, BOM
  if (cp >= 0x202a && cp <= 0x202e) return true; // LRE RLE PDF LRO RLO
  if (cp >= 0x2066 && cp <= 0x2069) return true; // LRI RLI FSI PDI
  return false;
}

/**
 * Strips what a display name has no business containing, then normalises
 * whitespace.
 *
 * Not a profanity filter — a rendering guard. Everything else survives,
 * including the whole of Unicode's letters: a name in Armenian, Japanese or
 * emoji is a real name and is left alone.
 */
export function sanitizeDisplayName(value: string): string {
  let out = "";
  // Iterating the string yields whole code points, so astral characters
  // (emoji) are tested and kept as one unit rather than split into surrogates.
  for (const ch of value) {
    if (!isStripped(ch.codePointAt(0) ?? 0)) out += ch;
  }
  return out.replace(/\s+/g, " ").trim();
}

function pick(value: unknown, allowed: Set<string>): string | undefined {
  return typeof value === "string" && allowed.has(value) ? value : undefined;
}

/**
 * Parses a profile update, or returns null if it asks for nothing valid.
 *
 * Unknown fields are ignored rather than rejected — the client sends its whole
 * onboarding draft, which carries a `step` this table has no column for. An id
 * outside the catalogue is dropped rather than stored, so a stale client cannot
 * pin a path that no longer exists.
 *
 * Returns null for an update with nothing left in it, so the route answers 400
 * rather than issuing an `UPDATE` with an empty `SET`.
 */
export function parseProfileUpdate(body: unknown): ProfileUpdate | null {
  if (typeof body !== "object" || body === null) return null;
  const raw = body as Record<string, unknown>;
  const update: ProfileUpdate = {};

  if (typeof raw.name === "string") {
    // Truncate after sanitising: trimming afterwards would let a name padded
    // with zero-width characters spend its whole budget on things that vanish.
    const name = sanitizeDisplayName(raw.name).slice(0, NAME_MAX);
    // An empty name is dropped, not stored. The column is `not null` defaulting
    // to 'Operative', and blanking yourself off the leaderboard by sending
    // spaces should not be a way to do it.
    if (name.length > 0) update.display_name = name;
  }

  const avatarId = pick(raw.avatarId, AVATAR_IDS);
  if (avatarId) update.avatar_id = avatarId;

  if (typeof raw.slogan === "string") {
    const slogan = sanitizeDisplayName(raw.slogan).slice(0, SLOGAN_MAX);
    if (slogan.length > 0) update.slogan = slogan;
  }

  const pathId = pick(raw.pathId, PATH_IDS);
  if (pathId) update.path_id = pathId;

  const experienceId = pick(raw.experienceId, EXPERIENCE_IDS);
  if (experienceId) update.experience_id = experienceId;

  // Only ever set true. Onboarding completing is a fact about the past and no
  // control un-completes it, so `false` is what an absent field looks like
  // rather than a request.
  if (raw.completed === true) update.onboarding_completed = true;

  return Object.keys(update).length > 0 ? update : null;
}
