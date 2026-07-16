"use client";

import { FileCode2 } from "lucide-react";
import type { Investigation } from "@/lib/investigation";
import {
  MarkEvidenceBar,
  SelectionMark,
  useEvidenceSelection,
} from "./EvidenceSelection";

export function CodeInspectionPanel({
  code,
  hint,
  isCollected,
  onCollect,
}: {
  code: Investigation["code"];
  hint: string;
  isCollected: (evidenceId: string) => boolean;
  onCollect: (ids: string[]) => void;
}) {
  const selection = useEvidenceSelection(onCollect);

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
              ? isCollected(line.evidenceId)
              : false;
            const selected = selection.isSelected(String(line.n));

            const body = (
              <>
                <span className="w-8 shrink-0 select-none text-right text-slate-600">
                  {line.n}
                </span>
                <span className="flex-1 whitespace-pre text-slate-300">
                  {line.text || " "}
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
              return (
                <li
                  key={line.n}
                  className="flex items-center gap-3 rounded border border-emerald-400/20 bg-emerald-500/[0.06] px-3"
                >
                  <SelectionMark selected={false} collected />
                  <span className="sr-only">Collected as evidence:</span>
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
