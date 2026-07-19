import { CircleCheckBig } from "lucide-react";
import type { MissionResultConfig } from "@/lib/results";

/* --------------------------- Minimal highlighter ------------------------ */

const TOKENS =
  /(\/\/[^\n]*|"[^"]*"|'[^']*'|`[^`]*`|\b(?:async|await|const|let|var|return|function|new|for|of|in|if|else)\b)/g;
const KEYWORD = /^(?:async|await|const|let|var|return|function|new|for|of|in|if|else)$/;

function highlight(line: string) {
  return line
    .split(TOKENS)
    .filter((p) => p !== "")
    .map((part, i) => {
      if (part.startsWith("//")) {
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

/**
 * The correct fix for this incident. When the player found it, this is what
 * they did; when they didn't, it is presented as the answer rather than as
 * their work — the panel must never credit them with a fix they didn't apply.
 */
export function WhatYouFixed({
  fix,
  resolved,
}: {
  fix: MissionResultConfig["fix"];
  resolved: boolean;
}) {
  return (
    <section className="flex h-full flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-white sm:text-base">
        <CircleCheckBig
          className={`h-4 w-4 ${resolved ? "text-emerald-400" : "text-slate-500"}`}
          strokeWidth={2.2}
        />
        {resolved ? "What you fixed" : "What would have fixed it"}
      </h3>

      <p className="mt-4 text-sm leading-relaxed text-slate-400">{fix.problem}</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">{fix.solution}</p>

      <div className="thin-scroll mt-4 overflow-x-auto rounded-xl border border-white/[0.06] bg-base-950/70 p-3">
        <ol className="min-w-max font-mono text-xs leading-6">
          {fix.code.split("\n").map((line, i) => (
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

      <p className="mt-4 flex items-start gap-2.5 text-sm text-slate-300">
        <CircleCheckBig
          aria-hidden
          className={`mt-0.5 h-4 w-4 shrink-0 ${
            resolved ? "text-emerald-400" : "text-slate-500"
          }`}
          strokeWidth={2.2}
        />
        {fix.note}
      </p>
    </section>
  );
}
