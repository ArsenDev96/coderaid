import { describe, expect, it } from "vitest";
import {
  AVATARS,
  DEFAULT_DRAFT,
  EXPERIENCE_LEVELS,
  NAME_MAX,
  PATHS,
} from "@/lib/onboarding";
import {
  coerceProfile,
  draftFromProfile,
  type ServerProfile,
} from "@/lib/profile-client";
import { parseProfileUpdate, sanitizeDisplayName } from "@/lib/server/profile";

/**
 * The profile is the only thing a player may write to this database, and the
 * display name is the only player-authored string another player ever sees —
 * `lib/server/standings.ts` renders it straight onto the leaderboard.
 *
 * So these tests are about two questions. Does the parser drop everything it
 * should before it reaches a column, and does the name that arrives there stay
 * incapable of interfering with the row it is rendered next to.
 */

/**
 * The characters under test, built from their code points.
 *
 * Every one of them is invisible in a source file. Written as literals this
 * suite would be a set of assertions nobody can proofread, and one that
 * silently changes meaning if any tool in the chain normalises the file — the
 * same reasoning `isStripped` gives for using numeric ranges rather than a
 * character class.
 */
const NUL = String.fromCodePoint(0x00);
const ZWSP = String.fromCodePoint(0x200b);
const ZWJ = String.fromCodePoint(0x200d);
const WORD_JOINER = String.fromCodePoint(0x2060);
const BOM = String.fromCodePoint(0xfeff);
const RLO = String.fromCodePoint(0x202e);
const LRI = String.fromCodePoint(0x2066);
const PDI = String.fromCodePoint(0x2069);

/** A profile with every field set, for the reconciliation tests. */
const FULL: ServerProfile = {
  name: "Arsen",
  avatarId: "ada",
  slogan: "Logs tell the truth",
  pathId: "apis",
  experienceId: "mid",
  completed: true,
};

describe("sanitizeDisplayName", () => {
  it("leaves an ordinary name completely alone", () => {
    expect(sanitizeDisplayName("Ada Lovelace")).toBe("Ada Lovelace");
  });

  it("keeps non-Latin scripts and emoji, which are real names", () => {
    // Armenian, Japanese, and an astral-plane emoji. Iterating code points
    // rather than UTF-16 units is what keeps the last one from being halved.
    expect(sanitizeDisplayName("Արսեն")).toBe("Արսեն");
    expect(sanitizeDisplayName("ひかり")).toBe("ひかり");
    expect(sanitizeDisplayName("dev🚀")).toBe("dev🚀");
  });

  it("strips newlines and tabs, which would break the leaderboard row", () => {
    expect(sanitizeDisplayName("top\nplayer")).toBe("topplayer");
    expect(sanitizeDisplayName("a\tb")).toBe("ab");
    expect(sanitizeDisplayName(`null${NUL}byte`)).toBe("nullbyte");
  });

  it("strips zero-width characters, so two names cannot render alike", () => {
    // Without this, a name with a zero-width space inside it and the plain
    // spelling are two rows that render identically — impersonation with no
    // visible tell.
    const withZeroWidth = `Ar${ZWSP}sen`;
    expect(withZeroWidth).not.toBe("Arsen");
    expect(sanitizeDisplayName(withZeroWidth)).toBe("Arsen");
    expect(sanitizeDisplayName(`a${ZWJ}b${BOM}c${WORD_JOINER}d`)).toBe("abcd");
  });

  it("strips bidi overrides, which reorder the text around them", () => {
    // RLO makes everything after it render right-to-left, so a name can
    // visually rewrite the column beside it on the leaderboard.
    expect(sanitizeDisplayName(`${RLO}player`)).toBe("player");
    expect(sanitizeDisplayName(`a${LRI}b${PDI}c`)).toBe("abc");
  });

  it("collapses whitespace runs and trims", () => {
    expect(sanitizeDisplayName("  Ada   B  ")).toBe("Ada B");
  });

  it("reduces a name of nothing but stripped characters to empty", () => {
    expect(sanitizeDisplayName(`${ZWSP}${ZWSP}${RLO} \n`)).toBe("");
  });
});

describe("parseProfileUpdate", () => {
  it("maps the client's vocabulary onto the granted columns", () => {
    expect(
      parseProfileUpdate({
        name: "Arsen",
        avatarId: "ada",
        slogan: "Logs tell the truth",
        pathId: "apis",
        experienceId: "mid",
        completed: true,
      }),
    ).toEqual({
      display_name: "Arsen",
      avatar_id: "ada",
      slogan: "Logs tell the truth",
      path_id: "apis",
      experience_id: "mid",
      onboarding_completed: true,
    });
  });

  it("accepts every id the catalogue actually offers", () => {
    for (const avatar of AVATARS) {
      expect(parseProfileUpdate({ avatarId: avatar.id })).toEqual({
        avatar_id: avatar.id,
      });
    }
    for (const path of PATHS) {
      expect(parseProfileUpdate({ pathId: path.id })).toEqual({
        path_id: path.id,
      });
    }
    for (const level of EXPERIENCE_LEVELS) {
      expect(parseProfileUpdate({ experienceId: level.id })).toEqual({
        experience_id: level.id,
      });
    }
  });

  it("drops ids that are not in the catalogue rather than storing them", () => {
    expect(
      parseProfileUpdate({
        name: "Arsen",
        avatarId: "not-an-avatar",
        pathId: "not-a-path",
        experienceId: "not-a-level",
      }),
    ).toEqual({ display_name: "Arsen" });
  });

  it("ignores fields the table has no column for", () => {
    // The client sends its whole onboarding draft, `step` included.
    expect(parseProfileUpdate({ name: "Arsen", step: 2 })).toEqual({
      display_name: "Arsen",
    });
  });

  it("refuses to write a column it was never granted", () => {
    // The point of the parser: an allow-list, not a filter. Even a request
    // naming a scored column produces an update that does not mention it.
    const update = parseProfileUpdate({
      name: "Arsen",
      claimed_at: "2020-01-01T00:00:00Z",
      claimedAt: "2020-01-01T00:00:00Z",
      total_xp: 999_999,
      id: "00000000-0000-0000-0000-000000000000",
    });
    expect(update).toEqual({ display_name: "Arsen" });
    expect(Object.keys(update ?? {})).toEqual(["display_name"]);
  });

  it("truncates a long name to the length the input allows", () => {
    const update = parseProfileUpdate({ name: "x".repeat(500) });
    expect(update?.display_name).toHaveLength(NAME_MAX);
  });

  it("truncates after sanitising, not before", () => {
    // A name padded to the limit with zero-width characters would otherwise
    // spend its whole budget on things that then vanish, leaving one letter.
    const padded = `${ZWSP}`.repeat(NAME_MAX) + "Arsen";
    expect(parseProfileUpdate({ name: padded })?.display_name).toBe("Arsen");
  });

  it("drops a name that is empty or only whitespace", () => {
    // The column is `not null` defaulting to 'Operative'. Blanking yourself
    // off the leaderboard by sending spaces is not a supported move.
    expect(parseProfileUpdate({ name: "   " })).toBeNull();
    expect(parseProfileUpdate({ name: "" })).toBeNull();
    expect(parseProfileUpdate({ name: `${ZWSP}${RLO}` })).toBeNull();
  });

  it("sanitises the name it stores", () => {
    expect(parseProfileUpdate({ name: "top\nplayer" })?.display_name).toBe(
      "topplayer",
    );
  });

  it("only ever sets onboarding_completed true", () => {
    // There is no control that un-completes onboarding, so false is what an
    // absent field looks like rather than a request to reopen the wizard.
    expect(parseProfileUpdate({ completed: false })).toBeNull();
    expect(parseProfileUpdate({ completed: true })).toEqual({
      onboarding_completed: true,
    });
  });

  it("returns null for anything that is not a usable update", () => {
    expect(parseProfileUpdate(null)).toBeNull();
    expect(parseProfileUpdate("Arsen")).toBeNull();
    expect(parseProfileUpdate(42)).toBeNull();
    expect(parseProfileUpdate([])).toBeNull();
    expect(parseProfileUpdate({})).toBeNull();
    // Every field present but every one of them unusable.
    expect(
      parseProfileUpdate({ name: 5, avatarId: 7, pathId: {}, completed: 0 }),
    ).toBeNull();
  });
});

describe("coerceProfile", () => {
  it("reads a full payload", () => {
    expect(coerceProfile(FULL)).toEqual(FULL);
  });

  it("treats null columns as absent rather than as empty strings", () => {
    expect(
      coerceProfile({
        name: "Arsen",
        avatarId: null,
        slogan: null,
        pathId: null,
        experienceId: null,
        completed: false,
      }),
    ).toEqual({
      name: "Arsen",
      avatarId: null,
      slogan: null,
      pathId: null,
      experienceId: null,
      completed: false,
    });
  });

  it("returns null without a name, which every player row has", () => {
    expect(coerceProfile({ avatarId: "ada" })).toBeNull();
    expect(coerceProfile(null)).toBeNull();
    expect(coerceProfile(undefined)).toBeNull();
    expect(coerceProfile("Arsen")).toBeNull();
  });
});

describe("draftFromProfile", () => {
  it("takes the server's identity over the local one", () => {
    const local = { ...DEFAULT_DRAFT, name: "Old", avatarId: "nova" };
    expect(draftFromProfile(FULL, local)).toMatchObject({
      name: "Arsen",
      avatarId: "ada",
      pathId: "apis",
      experienceId: "mid",
    });
  });

  it("keeps the local value for a column never written", () => {
    // A player who signed up but never saved a profile has nulls in five of
    // the six columns. Those must not blank a draft they filled in locally.
    const local = { ...DEFAULT_DRAFT, slogan: "Local slogan", avatarId: "lin" };
    const sparse: ServerProfile = {
      name: "Arsen",
      avatarId: null,
      slogan: null,
      pathId: null,
      experienceId: null,
      completed: false,
    };
    expect(draftFromProfile(sparse, local)).toMatchObject({
      name: "Arsen",
      slogan: "Local slogan",
      avatarId: "lin",
    });
  });

  it("keeps the wizard step, which the server has no column for", () => {
    const local = { ...DEFAULT_DRAFT, step: 2 };
    expect(draftFromProfile(FULL, local).step).toBe(2);
  });

  it("never un-completes onboarding a local draft says is done", () => {
    const local = { ...DEFAULT_DRAFT, completed: true };
    expect(draftFromProfile({ ...FULL, completed: false }, local).completed).toBe(
      true,
    );
  });
});
