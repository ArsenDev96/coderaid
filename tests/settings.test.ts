import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  EDITOR_THEME_OPTIONS,
  LANGUAGE_OPTIONS,
  SETTINGS_KEY,
  THEME_OPTIONS,
  resetMissionProgress,
} from "@/lib/settings";
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
    expect(THEME_OPTIONS.map((o) => o.id)).toContain(DEFAULT_SETTINGS.theme);
    expect(EDITOR_THEME_OPTIONS.map((o) => o.id)).toContain(
      DEFAULT_SETTINGS.codeEditorTheme,
    );
    expect(LANGUAGE_OPTIONS.map((o) => o.id)).toContain(
      DEFAULT_SETTINGS.defaultLanguage,
    );
  });

  it("only offer languages missions are actually written in", () => {
    expect(LANGUAGE_OPTIONS.map((o) => o.id)).toEqual([
      "typescript",
      "javascript",
    ]);
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
