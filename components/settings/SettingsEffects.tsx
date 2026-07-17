"use client";

import { useEffect } from "react";
import { useSettings } from "./useSettings";

/**
 * Applies the player's preferences to the document. Mounted once in the root
 * layout so a preference set on /settings takes effect everywhere, not just on
 * the page that changed it.
 *
 * Renders nothing.
 */
export function SettingsEffects() {
  const { settings, ready } = useSettings();

  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;

    root.dataset.theme = settings.theme;
    // Tells the browser which palette to render form controls and scrollbars in.
    root.style.colorScheme = settings.theme;
  }, [settings.theme, ready]);

  return null;
}
