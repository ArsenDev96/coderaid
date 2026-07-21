"use client";

import { Lightbulb } from "lucide-react";
import type { FixOption } from "@/lib/fix";
import { CodeText, useCodePreferences } from "@/components/ui/CodeText";

/* -------------------------------- Panel --------------------------------- */

/**
 * What a selected fix does.
 *
 * The verdict — "why this fix" versus "why this fix falls short" — used to
 * appear the moment an option was *selected*, so clicking all five read the
 * answer key before choosing. The browser no longer holds that verdict at all:
 * only the server knows which fix resolves, and it says so at verification.
 *
 * What remains here is what the player is meant to reason *from*: the option's
 * own description and its implementation. The full explanation is shown on the
 * results screen, next to the outcome it earned.
 */
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

  return (
    <div className="flex flex-col gap-4">
      <section
        aria-live="polite"
        className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5"
      >
        <h3 className="text-sm font-semibold text-white sm:text-base">
          {option.title}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          {option.description}
        </p>
        <p className="mt-4 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs leading-relaxed text-slate-400">
          Apply this fix and run verification to find out whether it resolves the
          incident. That&apos;s the call you&apos;re being scored on.
        </p>
      </section>

      {option.codeExample && <CodeExample source={option.codeExample} />}
    </div>
  );
}

/**
 * The implementation snippet, in the player's editor theme.
 *
 * Its own component so the preference hook runs unconditionally — the panel
 * above returns early when no fix is selected.
 */
function CodeExample({ source }: { source: string }) {
  const { palette, showLineNumbers } = useCodePreferences();

  return (
    <div className="thin-scroll mt-3 overflow-x-auto rounded-xl border border-white/[0.06] bg-base-950/70 p-3">
      <ol className="min-w-max font-mono text-xs leading-6">
        {source.split("\n").map((line, i) => (
          <li key={i} className="flex gap-4">
            {/* The list is an <ol>, so the ordering survives without the gutter. */}
            {showLineNumbers && (
              <span className="w-4 shrink-0 select-none text-right text-slate-600">
                {i + 1}
              </span>
            )}
            <code className={`whitespace-pre ${palette.plain}`}>
              {line ? <CodeText line={line} palette={palette} /> : " "}
            </code>
          </li>
        ))}
      </ol>
    </div>
  );
}
