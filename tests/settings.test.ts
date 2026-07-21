import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  EDITOR_THEME_OPTIONS,
  SETTINGS_KEY,
  resetMissionProgress,
} from "@/lib/settings";
import {
  CODE_PALETTES,
  DEFAULT_CODE_PALETTE_ID,
  codePalette,
  tokenizeCode,
} from "@/lib/code-theme";
import { STORAGE_KEY as PROFILE_KEY } from "@/lib/onboarding";
import { PROGRESS_KEY } from "@/lib/progress";
import {
  EMPTY_STAGE_PROGRESS,
  stageAccess,
  type StageProgress,
} from "@/lib/stage-access";

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => map.get(k) ?? null,
    removeItem: (k: string) => void map.delete(k),
  };
}

describe("settings options", () => {
  it("default to a valid option in every field", () => {
    expect(EDITOR_THEME_OPTIONS.map((o) => o.id)).toContain(
      DEFAULT_SETTINGS.codeEditorTheme,
    );
  });

  it("stores only preferences something actually reads", () => {
    // A preference nothing consumes is a control that lies about working.
    // Both of these are read by the code panels via useCodePreferences().
    expect(Object.keys(DEFAULT_SETTINGS).sort()).toEqual([
      "codeEditorTheme",
      "showLineNumbers",
    ]);
  });
});

describe("code themes", () => {
  it("gives every offered editor theme a palette", () => {
    for (const option of EDITOR_THEME_OPTIONS) {
      expect(CODE_PALETTES[option.id]).toBeDefined();
    }
  });

  it("falls back to the default palette for an unknown theme id", () => {
    expect(codePalette("a-theme-that-was-removed")).toBe(
      CODE_PALETTES[DEFAULT_CODE_PALETTE_ID],
    );
    expect(codePalette(DEFAULT_SETTINGS.codeEditorTheme)).toBe(
      CODE_PALETTES[DEFAULT_CODE_PALETTE_ID],
    );
  });

  it("colours a distinct token kind per palette entry", () => {
    for (const [id, palette] of Object.entries(CODE_PALETTES)) {
      const classes = Object.values(palette);
      expect(new Set(classes).size, `${id} reuses a colour`).toBe(
        classes.length,
      );
    }
  });
});

describe("tokenizeCode", () => {
  const rebuilt = (line: string) =>
    tokenizeCode(line)
      .map((t) => t.text)
      .join("");

  it("never drops or reorders a character", () => {
    for (const line of [
      "const rows = await db.query(sql);",
      '  return res.status(202).json({ jobId }); // accepted',
      "",
      "   ",
      "await Promise.all(files.map(async (f) => process(f)))",
      "const RATE = 1.5, LIMIT = 100;",
    ]) {
      expect(rebuilt(line)).toBe(line);
    }
  });

  it("classifies keywords, strings, comments and numbers", () => {
    const tokens = tokenizeCode('const x = "hi"; // 42 note');
    const kind = (text: string) =>
      tokens.find((t) => t.text === text)?.kind;

    expect(kind("const")).toBe("keyword");
    expect(kind('"hi"')).toBe("string");
    expect(kind("// 42 note")).toBe("comment");
    // The number is inside the comment, so the comment wins — first match.
    expect(tokens.some((t) => t.kind === "number")).toBe(false);
    expect(tokenizeCode("retries = 5").some((t) => t.kind === "number")).toBe(
      true,
    );
  });

  it("does not treat a keyword inside an identifier as a keyword", () => {
    const tokens = tokenizeCode("const constant = newValue;");
    expect(tokens.filter((t) => t.kind === "keyword").map((t) => t.text)).toEqual(
      ["const"],
    );
  });

  it("returns nothing for an empty line", () => {
    expect(tokenizeCode("")).toEqual([]);
  });
});

describe("resetMissionProgress", () => {
  it("protects identity and preferences", () => {
    const storage = memoryStorage({
      [PROFILE_KEY]: "{}",
      [SETTINGS_KEY]: "{}",
      [PROGRESS_KEY]: "{}",
    });
    expect(resetMissionProgress(storage)).toBe(1);
    expect(storage.getItem(PROFILE_KEY)).toBe("{}");
    expect(storage.getItem(SETTINGS_KEY)).toBe("{}");
    expect(storage.getItem(PROGRESS_KEY)).toBeNull();
  });

  it("sweeps stage keys it was never told about", () => {
    const storage = memoryStorage({
      "coderaid:a-future-mission:some-new-stage": "{}",
      [PROFILE_KEY]: "{}",
    });
    expect(resetMissionProgress(storage)).toBe(1);
    expect(storage.getItem("coderaid:a-future-mission:some-new-stage")).toBeNull();
  });

  it("does nothing without a storage backend", () => {
    expect(resetMissionProgress(null)).toBe(0);
  });
});

describe("stage prerequisites", () => {
  const progress = (over: Partial<StageProgress> = {}): StageProgress => ({
    ...EMPTY_STAGE_PROGRESS,
    keyCluesRequired: 3,
    ...over,
  });

  it("blocks diagnosis until enough key clues are collected", () => {
    const blocked = stageAccess("Diagnosis", progress({ keyCluesCollected: 1 }));
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.backPath).toBe("investigation");
      expect(blocked.reason).toContain("2 more key clues");
    }
    expect(stageAccess("Diagnosis", progress({ keyCluesCollected: 3 })).allowed).toBe(
      true,
    );
  });

  it("blocks the fix until a diagnosis is confirmed", () => {
    expect(stageAccess("Fix", progress()).allowed).toBe(false);
    expect(
      stageAccess("Fix", progress({ diagnosisConfirmed: true })).allowed,
    ).toBe(true);
  });

  it("blocks verification until a fix is applied", () => {
    expect(stageAccess("Verification", progress()).allowed).toBe(false);
    expect(stageAccess("Verification", progress({ fixApplied: true })).allowed).toBe(
      true,
    );
  });

  it("blocks results until verification completes", () => {
    const blocked = stageAccess("Complete", progress({ fixApplied: true }));
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) expect(blocked.backPath).toBe("verification");
    expect(
      stageAccess("Complete", progress({ verificationCompleted: true })).allowed,
    ).toBe(true);
  });

  it("opens every stage of a mission the player has already completed", () => {
    const finished = progress({ missionCompleted: true });
    for (const stage of ["Diagnosis", "Fix", "Verification", "Complete"] as const) {
      expect(stageAccess(stage, finished).allowed).toBe(true);
    }
  });

  it("does not gate diagnosis on a mission that requires no key clues", () => {
    expect(
      stageAccess("Diagnosis", { ...EMPTY_STAGE_PROGRESS, keyCluesRequired: 0 })
        .allowed,
    ).toBe(true);
  });
});
