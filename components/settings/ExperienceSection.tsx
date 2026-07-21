"use client";

import { Code2, Hash, SlidersHorizontal } from "lucide-react";
import { EDITOR_THEME_OPTIONS } from "@/lib/settings";
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
      description="Customize how mission code is presented."
    >
      <SettingRow
        icon={Code2}
        title="Code editor theme"
        description="Colours mission code in the investigation and fix stages."
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
        icon={Hash}
        title="Show line numbers"
        description="Display line numbers in mission code."
        htmlFor="line-numbers"
      >
        <Toggle
          id="line-numbers"
          label="Show line numbers"
          checked={settings.showLineNumbers}
          onChange={(v) => update("showLineNumbers", v)}
        />
      </SettingRow>
    </SectionCard>
  );
}
