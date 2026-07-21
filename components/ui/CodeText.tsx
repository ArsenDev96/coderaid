"use client";

import { codePalette, tokenizeCode, type CodePalette } from "@/lib/code-theme";
import { useSettings } from "@/components/settings/useSettings";

/**
 * The player's code-presentation preferences, resolved for a renderer.
 *
 * Both code surfaces — the investigation code inspector and the fix
 * implementation example — read this, so "Code editor theme" and "Show line
 * numbers" on /settings mean the same thing in both places. Starts from the
 * defaults and re-renders after `useSettings` hydrates, which is the same
 * pattern the rest of the app uses to stay server-renderable.
 */
export function useCodePreferences(): {
  palette: CodePalette;
  showLineNumbers: boolean;
} {
  const { settings } = useSettings();
  return {
    palette: codePalette(settings.codeEditorTheme),
    showLineNumbers: settings.showLineNumbers,
  };
}

/**
 * One line of mission code, coloured by the player's editor theme.
 *
 * Renders a single text node when the line has no tokens worth colouring, so
 * the common case doesn't pay for a wrapper per character.
 */
export function CodeText({
  line,
  palette,
}: {
  line: string;
  palette: CodePalette;
}) {
  const tokens = tokenizeCode(line);

  return (
    <>
      {tokens.map((token, i) =>
        token.kind === "plain" ? (
          token.text
        ) : (
          <span key={i} className={palette[token.kind]}>
            {token.text}
          </span>
        ),
      )}
    </>
  );
}
