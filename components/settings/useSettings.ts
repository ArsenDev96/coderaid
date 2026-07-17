"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type UserSettings,
} from "@/lib/settings";

/** Broadcasts a change to other `useSettings` consumers in this tab. */
export const SETTINGS_EVENT = "coderaid:settings-changed";

/**
 * The player's experience preferences, persisted to localStorage.
 *
 * Starts from the defaults so the server and first client render agree, then
 * loads the stored values after mount. Preferences save as they're changed —
 * there's no Save button on the Experience section — and a change notifies
 * every other consumer (the root effects, other rows) so the app reacts at once.
 */
export function useSettings(): {
  settings: UserSettings;
  update: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  /** False until the stored values have been read, to avoid flashing defaults. */
  ready: boolean;
} {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setSettings(loadSettings());
    sync();
    setReady(true);
    window.addEventListener(SETTINGS_EVENT, sync);
    // `storage` only fires for *other* tabs, which is exactly what we want here.
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SETTINGS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // Derives `next` from the current settings rather than inside a state updater:
  // React may invoke an updater more than once, and persisting must happen once.
  const update = useCallback(
    <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
      const next = { ...settings, [key]: value };
      setSettings(next);
      saveSettings(next);
      window.dispatchEvent(new Event(SETTINGS_EVENT));
    },
    [settings],
  );

  return { settings, update, ready };
}
