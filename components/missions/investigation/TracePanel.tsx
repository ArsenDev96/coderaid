"use client";

import type { Investigation } from "@/lib/investigation";
import {
  CollectedTag,
  MarkEvidenceBar,
  RelatedTag,
  SelectionMark,
  useEvidenceSelection,
} from "./EvidenceSelection";

/**
 * Waterfall of a single request. Span bars are drawn proportional to the root
 * duration, so a span that owns most of the request reads as dominant without
 * the panel having to say which one matters.
 */
export function TracePanel({
  trace,
  hint,
  collectedAs,
  markedHere,
  onCollect,
}: {
  trace: NonNullable<Investigation["trace"]>;
  hint: string;
  /** The finding this row was collected as, or null while uncollected. */
  collectedAs: (evidenceId: string) => string | null;
  /** Whether the player marked this row, rather than holding its finding from elsewhere. */
  markedHere: (rowId: string) => boolean;
  onCollect: (evidenceIds: string[], rowIds: string[]) => void;
}) {
  const selection = useEvidenceSelection(onCollect);
  const total = trace.root.ms;

  return (
    <div>
      <p className="mb-4 text-xs text-slate-400">{trace.caption}</p>

      <div className="rounded-xl border border-white/[0.06] bg-base-950/60 p-4">
        {/* Root span */}
        <div className="flex items-baseline justify-between gap-3 border-b border-white/[0.06] pb-3">
          <span className="font-mono text-xs font-semibold text-slate-200">
            {trace.root.label}
          </span>
          <span className="shrink-0 font-mono text-xs font-semibold text-rose-300">
            {total}ms
          </span>
        </div>

        <ul className="mt-3 space-y-2">
          {trace.spans.map((span, i) => {
            const last = i === trace.spans.length - 1;
            const pct = Math.max((span.ms / total) * 100, 1);
            const collected = span.evidenceId
              ? collectedAs(span.evidenceId)
              : null;
            const mine = collected !== null && markedHere(span.id);
            const selected = selection.isSelected(span.id);

            const body = (
              <>
                <span
                  aria-hidden
                  className="shrink-0 select-none font-mono text-xs text-slate-600"
                >
                  {last ? "└──" : "├──"}
                </span>

                <span className="w-36 shrink-0 truncate font-mono text-xs text-slate-300">
                  {span.label}
                </span>

                {/* Duration bar */}
                <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-white/[0.04]">
                  <span
                    className={`block h-full rounded-full ${
                      pct >= 50
                        ? "bg-gradient-to-r from-rose-500/70 to-rose-400"
                        : "bg-gradient-to-r from-electric-500/50 to-electric-400/80"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </span>

                <span
                  className={`w-16 shrink-0 text-right font-mono text-xs font-semibold ${
                    pct >= 50 ? "text-rose-300" : "text-slate-400"
                  }`}
                >
                  {span.ms}ms
                </span>
              </>
            );

            const base = "flex w-full items-center gap-3 rounded-lg border px-3 py-2";

            if (!span.evidenceId) {
              return (
                <li key={span.id} className={`${base} border-transparent`}>
                  <span aria-hidden className="h-5 w-5 shrink-0" />
                  {body}
                </li>
              );
            }

            if (collected && mine) {
              return (
                <li
                  key={span.id}
                  className={`${base} border-emerald-400/20 bg-emerald-500/[0.06]`}
                >
                  <SelectionMark selected={false} collected />
                  <span className="sr-only">Collected as evidence:</span>
                  {body}
                  <CollectedTag name={collected} />
                </li>
              );
            }

            if (collected) {
              return (
                <li key={span.id} className={`${base} border-white/[0.06]`}>
                  <SelectionMark selected={false} collected={false} related />
                  <span className="sr-only">
                    Belongs to a finding already collected elsewhere:
                  </span>
                  {body}
                  <RelatedTag name={collected} />
                </li>
              );
            }

            return (
              <li key={span.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  aria-label={`${span.label}: ${span.ms} milliseconds of ${total}`}
                  onClick={() => selection.toggle(span.id, span.evidenceId!)}
                  className={`${base} text-left transition-colors ${
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
