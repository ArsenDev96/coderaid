/**
 * Code presentation — the tokenizer and the colour palettes behind the
 * player's "Code editor theme" preference.
 *
 * Pure by design, like `lib/stage-access.ts` and `lib/mission-validation.ts`:
 * the rules live here as data over plain strings, and the components
 * (`CodeLines`, the investigation and fix panels) supply the React and the
 * `localStorage` read. That is what makes the highlighter directly testable in
 * a Node environment, and it is why both code surfaces can share one
 * implementation instead of each keeping its own.
 */

/* ------------------------------ Tokenizing ------------------------------ */

export type CodeTokenKind = "plain" | "keyword" | "string" | "comment" | "number";

export type CodeToken = { kind: CodeTokenKind; text: string };

/**
 * Keyword / string / comment / number colouring — enough for mission code to
 * read as code, not a full lexer. Mission code is JavaScript and TypeScript,
 * so the keyword list is the JS one.
 */
const TOKEN_RE =
  /\/\/[^\n]*|#[^\n]*|"[^"]*"|'[^']*'|`[^`]*`|\b(?:async|await|const|let|var|return|function|new|for|of|in|if|else|try|catch|finally|throw|class|extends|import|export|from|while|typeof|instanceof|yield|delete|void|this|null|undefined|true|false)\b|\b\d+(?:\.\d+)?\b/g;

function kindOf(token: string): CodeTokenKind {
  if (token.startsWith("//") || token.startsWith("#")) return "comment";
  if (/^["'`]/.test(token)) return "string";
  if (/^\d/.test(token)) return "number";
  return "keyword";
}

/**
 * Splits one line into coloured tokens. Every character of the input appears in
 * exactly one token, in order, so rendering the tokens reproduces the line —
 * a property the tests pin, because silently dropping code would be worse than
 * not colouring it at all.
 */
export function tokenizeCode(line: string): CodeToken[] {
  const tokens: CodeToken[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  TOKEN_RE.lastIndex = 0;
  while ((match = TOKEN_RE.exec(line)) !== null) {
    if (match.index > last) {
      tokens.push({ kind: "plain", text: line.slice(last, match.index) });
    }
    tokens.push({ kind: kindOf(match[0]), text: match[0] });
    last = match.index + match[0].length;
  }
  if (last < line.length) {
    tokens.push({ kind: "plain", text: line.slice(last) });
  }
  return tokens;
}

/* ------------------------------- Palettes ------------------------------- */

/** A Tailwind text colour per token kind. */
export type CodePalette = Record<CodeTokenKind, string>;

/**
 * One palette per entry in `EDITOR_THEME_OPTIONS` (`lib/settings.ts`). The two
 * lists are kept in step by a test rather than by a type, because the options
 * carry display concerns (label, swatch) that the renderer has no use for.
 *
 * `one-dark-pro` is the default, and reproduces exactly the colours the code
 * panels used before the preference was wired up — so a player who never opens
 * Settings sees no change.
 */
export const CODE_PALETTES: Record<string, CodePalette> = {
  "one-dark-pro": {
    plain: "text-slate-300",
    keyword: "text-violet-300",
    string: "text-emerald-300",
    comment: "text-slate-500",
    number: "text-amber-300",
  },
  monokai: {
    plain: "text-slate-200",
    keyword: "text-rose-400",
    string: "text-amber-200",
    comment: "text-slate-500",
    number: "text-fuchsia-300",
  },
  dracula: {
    plain: "text-slate-200",
    keyword: "text-fuchsia-300",
    string: "text-yellow-200",
    comment: "text-slate-500",
    number: "text-violet-300",
  },
  "night-owl": {
    plain: "text-slate-300",
    keyword: "text-sky-300",
    string: "text-emerald-200",
    comment: "text-slate-500",
    number: "text-orange-300",
  },
  solarized: {
    plain: "text-amber-100/90",
    keyword: "text-emerald-400",
    string: "text-cyan-300",
    comment: "text-amber-700",
    number: "text-rose-300",
  },
};

export const DEFAULT_CODE_PALETTE_ID = "one-dark-pro";

/**
 * The palette for a stored preference. Falls back to the default rather than
 * throwing, so a theme id removed from the options list degrades to readable
 * code instead of an unstyled crash.
 */
export function codePalette(themeId: string): CodePalette {
  return CODE_PALETTES[themeId] ?? CODE_PALETTES[DEFAULT_CODE_PALETTE_ID];
}
