"use client";

import {
  Code2,
  Globe,
  Hash,
  Palette,
  SlidersHorizontal,
  Volume2,
} from "lucide-react";
import {
  EDITOR_THEME_OPTIONS,
  LANGUAGE_OPTIONS,
  THEME_OPTIONS,
  type Theme,
} from "@/lib/settings";
import { SectionCard } from "./SectionCard";
import { SelectField, SettingRow, Toggle } from "./SettingsFields";
import { useSettings } from "./useSettings";

/**
 * Experience preferences. These save the moment they change — there's no Save
 * button here, unlike Profile, because each row is a single self-contained
 * choice with nothing to validate.
 */
export function ExperienceSection() {
  const { settings, update } = useSettings();

  return (
    <SectionCard
      icon={SlidersHorizontal}
      title="Experience"
      description="Customize how CodeRaid looks and feels for you."
    >
      <SettingRow
        icon={Palette}
        title="Theme"
        description="Choose your preferred theme."
        htmlFor="theme"
      >
        <SelectField
          id="theme"
          label="Theme"
          value={settings.theme}
          onChange={(v) => update("theme", v as Theme)}
          options={THEME_OPTIONS}
        />
      </SettingRow>

      {settings.theme === "light" && (
        // Honest about the gap rather than letting the choice look broken:
        // CodeRaid's palette is dark-only today.
        <p className="-mt-2 mb-4 rounded-lg border border-amber-400/25 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-200/90">
          A light palette is still in progress — CodeRaid currently renders dark.
          Your choice is saved and will apply once it ships.
        </p>
      )}

      <SettingRow
        icon={Code2}
        title="Code editor theme"
        description="Select the theme for the code editor."
        htmlFor="editor-theme"
      >
        <SelectField
          id="editor-theme"
          label="Code editor theme"
          value={settings.codeEditorTheme}
          onChange={(v) => update("codeEditorTheme", v)}
          options={EDITOR_THEME_OPTIONS}
        />
      </SettingRow>

      <SettingRow
        icon={Globe}
        title="Default language"
        description="Preferred language for Node.js mission code."
        htmlFor="language"
      >
        <SelectField
          id="language"
          label="Default language"
          value={settings.defaultLanguage}
          onChange={(v) => update("defaultLanguage", v)}
          options={LANGUAGE_OPTIONS}
        />
      </SettingRow>

      <SettingRow
        icon={Hash}
        title="Show line numbers"
        description="Display line numbers in the code editor."
        htmlFor="line-numbers"
      >
        <Toggle
          id="line-numbers"
          label="Show line numbers"
          checked={settings.showLineNumbers}
          onChange={(v) => update("showLineNumbers", v)}
        />
      </SettingRow>

      <SettingRow
        icon={Volume2}
        title="Sound effects"
        description="Play sounds for actions and events."
        htmlFor="sound"
      >
        <Toggle
          id="sound"
          label="Sound effects"
          checked={settings.soundEffects}
          onChange={(v) => update("soundEffects", v)}
        />
      </SettingRow>
    </SectionCard>
  );
}
