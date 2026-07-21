import { STORAGE_KEY as PROFILE_KEY } from "./onboarding";

/* -------------------------------- Types --------------------------------- */

/**
 * Experience preferences.
 *
 * Display name and avatar are deliberately *not* here: the onboarding profile
 * (`coderaid:profile`) already owns the player's identity, and the Profile
 * section on this page reads and writes that record. Duplicating them into a
 * second store would let the two drift apart.
 */
export type UserSettings = {
  codeEditorTheme: string;
  showLineNumbers: boolean;
};

export const SETTINGS_KEY = "coderaid:user-settings";

export const DEFAULT_SETTINGS: UserSettings = {
  codeEditorTheme: "one-dark-pro",
  showLineNumbers: true,
};

/* ------------------------------- Options -------------------------------- */

/*
 * There is deliberately no app-theme preference. CodeRaid's palette is dark —
 * `:root { color-scheme: dark }` in `app/globals.css` — and every surface is
 * hand-tuned for it, so a light option could only ever be a control that saved
 * a value nothing rendered.
 */

/** Editor themes carry a swatch so the select reads at a glance. */
export const EDITOR_THEME_OPTIONS: {
  id: string;
  label: string;
  swatch: string;
}[] = [
  { id: "one-dark-pro", label: "One Dark Pro", swatch: "bg-violet-400" },
  { id: "monokai", label: "Monokai", swatch: "bg-emerald-400" },
  { id: "dracula", label: "Dracula", swatch: "bg-fuchsia-400" },
  { id: "night-owl", label: "Night Owl", swatch: "bg-electric-400" },
  { id: "solarized", label: "Solarized", swatch: "bg-amber-400" },
];

/*
 * There is deliberately no language preference. Each mission authors its code
 * in one language (`Investigation["code"].language`), so a stored preference
 * could never change what the code panel shows — the control was removed
 * rather than left looking functional.
 */

/* ----------------------------- Persistence ------------------------------ */

/** Validates a stored id against its option list so edited content can't stick. */
function oneOf(value: unknown, options: { id: string }[], fallback: string): string {
  return options.some((o) => o.id === value) ? (value as string) : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function loadSettings(): UserSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const p = JSON.parse(raw) as Partial<UserSettings>;
    return {
      codeEditorTheme: oneOf(
        p.codeEditorTheme,
        EDITOR_THEME_OPTIONS,
        DEFAULT_SETTINGS.codeEditorTheme,
      ),
      showLineNumbers: bool(p.showLineNumbers, DEFAULT_SETTINGS.showLineNumbers),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: UserSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

/* --------------------------- Reset progress ----------------------------- */

/**
 * Keys that survive a progress reset: who the player is, and how they like the
 * app set up. Neither is mission progress.
 */
const PROTECTED_KEYS: readonly string[] = [PROFILE_KEY, SETTINGS_KEY];

const NAMESPACE = "coderaid:";

/**
 * Clears mission progress — the reward ledger plus every per-mission stage
 * record (briefing, investigation, diagnosis, fix, verification, results).
 *
 * Written as a sweep of the `coderaid:` namespace minus an explicit protect
 * list, rather than a list of the stage keys to delete: a new mission stage
 * would silently survive a delete-list, but is cleared correctly here. Returns
 * the number of keys removed.
 *
 * Achievements need no special handling — they hold no state of their own and
 * are derived from this progress, so they re-derive from the cleared ledger.
 */
export function resetMissionProgress(
  /** Defaults to `window.localStorage`; injectable so the sweep is verifiable. */
  storage: Pick<Storage, "length" | "key" | "removeItem"> | null =
    typeof window === "undefined" ? null : window.localStorage,
): number {
  if (!storage) return 0;
  try {
    const doomed: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key) continue;
      if (!key.startsWith(NAMESPACE)) continue;
      if (PROTECTED_KEYS.includes(key)) continue;
      doomed.push(key);
    }
    // Collected before removing: deleting mid-loop reindexes the store and
    // would make `key(i)` skip entries.
    doomed.forEach((key) => storage.removeItem(key));
    return doomed.length;
  } catch {
    return 0;
  }
}
