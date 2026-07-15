"use client";

import { Clock, Radio } from "lucide-react";
import { LOG_LEVEL_BADGE, type Investigation } from "@/lib/investigation";
import {
  MarkEvidenceBar,
  SelectionMark,
  useEvidenceSelection,
} from "./EvidenceSelection";

export function LogsPanel({
  logs,
  isCollected,
  onCollect,
}: {
  logs: Investigation["logs"];
  isCollected: (evidenceId: string) => boolean;
  onCollect: (ids: string[]) => void;
}) {
  const selection = useEvidenceSelection(onCollect);

  return (
    <div>
      {/* Context for what is being read — static, not a fake control */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-xs font-medium text-slate-300">
          <Radio className="h-3.5 w-3.5 text-emerald-400" strokeWidth={2.2} />
          {logs.service}
        </span>
        <span className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-xs font-medium text-slate-300">
          <Clock className="h-3.5 w-3.5 text-slate-500" strokeWidth={2.2} />
          {logs.window}
        </span>
      </div>

      <div className="thin-scroll overflow-x-auto rounded-xl border border-white/[0.06] bg-base-950/60 p-2">
        <ul className="min-w-[38rem] font-mono text-xs">
          {logs.lines.map((line) => {
            const badge = LOG_LEVEL_BADGE[line.level];
            const collected = line.evidenceId
              ? isCollected(line.evidenceId)
              : false;
            const selected = selection.isSelected(line.id);

            const body = (
              <>
                <span className="shrink-0 text-slate-500">{line.time}</span>
                <span
                  className={`inline-flex w-14 shrink-0 justify-center rounded border px-1.5 py-0.5 text-[0.6rem] font-bold tracking-wide ${badge}`}
                >
                  {line.level}
                </span>
                <span
                  className={`flex-1 whitespace-pre ${
                    line.level === "WARN" ? "text-amber-200" : "text-slate-300"
                  }`}
                >
                  {line.message}
                </span>
              </>
            );

            if (!line.evidenceId) {
              return (
                <li
                  key={line.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-1.5"
                >
                  <span aria-hidden className="h-5 w-5 shrink-0" />
                  {body}
                </li>
              );
            }

            if (collected) {
              return (
                <li
                  key={line.id}
                  className="flex items-center gap-3 rounded-lg border border-emerald-400/20 bg-emerald-500/[0.06] px-3 py-1.5"
                >
                  <SelectionMark selected={false} collected />
                  {/* A visible tag would widen the row past the log gutter. */}
                  <span className="sr-only">Collected as evidence:</span>
                  {body}
                </li>
              );
            }

            return (
              <li key={line.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => selection.toggle(line.id, line.evidenceId!)}
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-1.5 text-left transition-colors ${
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
        hint="Select the log lines that look suspicious."
      />
    </div>
  );
}
