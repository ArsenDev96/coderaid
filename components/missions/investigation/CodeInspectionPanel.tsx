"use client";

import { FileCode2 } from "lucide-react";
import type { Investigation } from "@/lib/investigation";
import { CodeText, useCodePreferences } from "@/components/ui/CodeText";
import {
  MarkEvidenceBar,
  SelectionMark,
  useEvidenceSelection,
} from "./EvidenceSelection";

export function CodeInspectionPanel({
  code,
  hint,
  collectedAs,
  markedHere,
  onCollect,
}: {
  code: Investigation["code"];
  hint: string;
  /** The finding this row was collected as, or null while uncollected. */
  collectedAs: (evidenceId: string) => string | null;
  /** Whether the player marked this row, rather than holding its finding from elsewhere. */
  markedHere: (rowId: string) => boolean;
  onCollect: (evidenceIds: string[], rowIds: string[]) => void;
}) {
  const selection = useEvidenceSelection(onCollect);
  const { palette, showLineNumbers } = useCodePreferences();

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 font-mono text-xs text-slate-300">
          <FileCode2 className="h-3.5 w-3.5 text-violet-300" strokeWidth={2.2} />
          {code.file}
        </span>
        <span className="inline-flex items-center rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300">
          {code.language}
        </span>
      </div>

      <div className="thin-scroll overflow-x-auto rounded-xl border border-white/[0.06] bg-base-950/60 p-2">
        <ul className="min-w-[34rem] font-mono text-xs leading-6">
          {code.lines.map((line) => {
            const collected = line.evidenceId
              ? collectedAs(line.evidenceId)
              : null;
            const mine = collected !== null && markedHere(String(line.n));
            const selected = selection.isSelected(String(line.n));

            const body = (
              <>
                {/* Hiding the gutter costs nothing in accessibility: the line
                    number is already in each selectable line's aria-label. */}
                {showLineNumbers && (
                  <span className="w-8 shrink-0 select-none text-right text-slate-600">
                    {line.n}
                  </span>
                )}
                <span className={`flex-1 whitespace-pre ${palette.plain}`}>
                  {line.text ? (
                    <CodeText line={line.text} palette={palette} />
                  ) : (
                    " "
                  )}
                </span>
              </>
            );

            if (!line.evidenceId) {
              return (
                <li key={line.n} className="flex items-center gap-3 rounded px-3">
                  <span aria-hidden className="h-5 w-5 shrink-0" />
                  {body}
                </li>
              );
            }

            if (collected) {
              // Named on hover rather than with a tag: a code gutter has no
              // room for one, and collected lines come in runs.
              const label = mine
                ? `Collected as evidence: ${collected}`
                : `Already held from another tool: ${collected}`;
              return (
                <li
                  key={line.n}
                  title={label}
                  className={`flex items-center gap-3 rounded border px-3 ${
                    mine
                      ? "border-emerald-400/20 bg-emerald-500/[0.06]"
                      : "border-white/[0.06] bg-white/[0.02]"
                  }`}
                >
                  <SelectionMark
                    selected={false}
                    collected={mine}
                    related={!mine}
                  />
                  <span className="sr-only">{label}.</span>
                  {body}
                </li>
              );
            }

            return (
              <li key={line.n}>
                <button
                  type="button"
                  aria-pressed={selected}
                  aria-label={`Line ${line.n}: ${line.text.trim()}`}
                  onClick={() => selection.toggle(String(line.n), line.evidenceId!)}
                  className={`flex w-full items-center gap-3 rounded border px-3 text-left transition-colors ${
                    selected
                      ? "border-violet-400/40 bg-violet-500/[0.12]"
                      : "border-transparent hover:border-white/10 hover:bg-white/[0.03]"
                  }`}
                >
                  <SelectionMark selected={selected} collected={false} />
                  {body}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <MarkEvidenceBar
        count={selection.count}
        onSubmit={selection.submit}
        hint={hint}
      />
    </div>
  );
}
