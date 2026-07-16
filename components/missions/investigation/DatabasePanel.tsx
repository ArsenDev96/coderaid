"use client";

import { Repeat } from "lucide-react";
import type { Investigation } from "@/lib/investigation";
import {
  CollectedTag,
  MarkEvidenceBar,
  SelectionMark,
  useEvidenceSelection,
} from "./EvidenceSelection";

export function DatabasePanel({
  database,
  hint,
  isCollected,
  onCollect,
}: {
  database: Investigation["database"];
  hint: string;
  isCollected: (evidenceId: string) => boolean;
  onCollect: (ids: string[]) => void;
}) {
  const selection = useEvidenceSelection(onCollect);

  return (
    <div>
      <p className="mb-4 text-xs text-slate-400">{database.caption}</p>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {database.stats.map((stat) => {
          const collected = stat.evidenceId
            ? isCollected(stat.evidenceId)
            : false;
          const selected = selection.isSelected(stat.id);

          const body = (
            <>
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs font-medium text-slate-400">
                  {stat.label}
                </span>
                {stat.evidenceId ? (
                  <SelectionMark selected={selected} collected={collected} />
                ) : null}
              </div>
              <p className="mt-1.5 font-mono text-2xl font-semibold text-slate-100">
                {stat.value}
              </p>
              {stat.detail && (
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  {stat.detail}
                </p>
              )}
              {collected && (
                <span className="mt-2 inline-flex">
                  <CollectedTag />
                </span>
              )}
            </>
          );

          const base = "rounded-xl border p-4 text-left";

          if (!stat.evidenceId) {
            return (
              <li
                key={stat.id}
                className={`${base} border-white/[0.06] bg-white/[0.02]`}
              >
                {body}
              </li>
            );
          }

          if (collected) {
            return (
              <li
                key={stat.id}
                className={`${base} border-emerald-400/20 bg-emerald-500/[0.06]`}
              >
                {body}
              </li>
            );
          }

          return (
            <li key={stat.id}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => selection.toggle(stat.id, stat.evidenceId!)}
                className={`${base} w-full transition-colors ${
                  selected
                    ? "border-violet-400/40 bg-violet-500/[0.12]"
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/15"
                }`}
              >
                {body}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Only scenarios with a query worth pinning author a callout. */}
      {database.queryCallout && (
        <div className="mt-3 rounded-xl border border-white/[0.06] bg-base-950/60 p-4">
          <h4 className="flex items-center gap-2 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
            <Repeat className="h-3.5 w-3.5" strokeWidth={2.2} />
            {database.queryCallout.label}
          </h4>
          <div className="thin-scroll mt-2.5 overflow-x-auto">
            <code className="block whitespace-pre font-mono text-xs text-violet-200">
              {database.queryCallout.sql}
            </code>
          </div>
        </div>
      )}

      <MarkEvidenceBar
        count={selection.count}
        onSubmit={selection.submit}
        hint={hint}
      />
    </div>
  );
}
