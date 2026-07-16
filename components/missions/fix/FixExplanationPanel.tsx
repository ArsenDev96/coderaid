"use client";

import { AlertTriangle, Check, Lightbulb } from "lucide-react";
import type { FixOption } from "@/lib/fix";

/* --------------------------- Minimal highlighter ------------------------ */

const TOKENS =
  /(\/\/[^\n]*|#[^\n]*|"[^"]*"|'[^']*'|`[^`]*`|\b(?:async|await|const|let|var|return|function|new|for|of|in|if|else)\b)/g;
const KEYWORD = /^(?:async|await|const|let|var|return|function|new|for|of|in|if|else)$/;

/** Keyword/string/comment colouring — enough to read as code, not a full lexer. */
function highlight(line: string) {
  return line
    .split(TOKENS)
    .filter((p) => p !== "")
    .map((part, i) => {
      if (part.startsWith("//") || part.startsWith("#")) {
        return (
          <span key={i} className="text-slate-500">
            {part}
          </span>
        );
      }
      if (/^["'`]/.test(part)) {
        return (
          <span key={i} className="text-emerald-300">
            {part}
          </span>
        );
      }
      if (KEYWORD.test(part)) {
        return (
          <span key={i} className="text-violet-300">
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
}

/* -------------------------------- Panel --------------------------------- */

export function FixExplanationPanel({
  option,
}: {
  option: FixOption | null;
}) {
  if (!option) {
    return (
      <section className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.01] p-8 text-center">
        <span
          aria-hidden
          className="grid h-11 w-11 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-500"
        >
          <Lightbulb className="h-5 w-5" strokeWidth={1.8} />
        </span>
        <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-500">
          Select a fix to see why it works and a short implementation example.
        </p>
      </section>
    );
  }

  const resolves = option.resolvesRootCause;

  return (
    <div className="flex flex-col gap-4">
      {/* Why this fix */}
      <section
        aria-live="polite"
        className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5"
      >
        <h3 className="text-sm font-semibold text-white sm:text-base">
          {resolves ? "Why this fix?" : "Why this fix falls short"}
        </h3>

        <ul className="mt-4 flex flex-col gap-3">
          {option.explanation.map((point) => (
            <li key={point} className="flex items-start gap-2.5">
              <span
                aria-hidden
                className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full ${
                  resolves
                    ? "text-emerald-400"
                    : "text-amber-400"
                }`}
              >
                {resolves ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.4} />
                )}
              </span>
              <span className="text-sm leading-relaxed text-slate-300">
                {point}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Implementation example */}
      {option.codeExample && (
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-white sm:text-base">
            Typical implementation
          </h3>
          <div className="thin-scroll mt-3 overflow-x-auto rounded-xl border border-white/[0.06] bg-base-950/70 p-3">
            <ol className="min-w-max font-mono text-xs leading-6">
              {option.codeExample.split("\n").map((line, i) => (
                <li key={i} className="flex gap-4">
                  <span className="w-4 shrink-0 select-none text-right text-slate-600">
                    {i + 1}
                  </span>
                  <code className="whitespace-pre text-slate-300">
                    {line ? highlight(line) : " "}
                  </code>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}
    </div>
  );
}
