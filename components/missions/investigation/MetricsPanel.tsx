"use client";

import { METRIC_TONE, type Investigation } from "@/lib/investigation";
import {
  CollectedTag,
  MarkEvidenceBar,
  RelatedTag,
  SelectionMark,
  useEvidenceSelection,
} from "./EvidenceSelection";

function LatencyChart({ latency }: { latency: Investigation["metrics"]["latency"] }) {
  const max = Math.max(...latency.series);
  const deployLeft = (latency.deployAt / latency.series.length) * 100;

  return (
    <figure className="rounded-xl border border-white/[0.06] bg-base-950/60 p-4">
      <figcaption className="mb-3 flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium text-slate-400">
          {latency.caption}
        </span>
        <span className="shrink-0 font-mono text-[0.65rem] text-slate-600">
          peak {max}
          {latency.unit}
        </span>
      </figcaption>

      {/* pt-5 reserves a lane for the deploy label so it never covers a bar. */}
      <div
        role="img"
        aria-label={`Response time held near ${latency.series[0]}${latency.unit} before the deployment, then rose to about ${max}${latency.unit} after it.`}
        className="relative h-32 pt-5"
      >
        {/* Deploy marker */}
        <div
          className="absolute inset-y-0 z-10 border-l border-dashed border-violet-400/60"
          style={{ left: `${deployLeft}%` }}
        >
          <span className="absolute top-0 left-1.5 whitespace-nowrap rounded border border-violet-400/30 bg-violet-500/15 px-1.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-wider text-violet-200">
            {latency.deployLabel}
          </span>
        </div>

        <div className="flex h-full items-end gap-1.5">
          {latency.series.map((value, i) => {
            const post = i >= latency.deployAt;
            return (
              <div
                key={i}
                className={`min-w-0 flex-1 rounded-t ${
                  post
                    ? "bg-gradient-to-t from-rose-500/30 to-rose-400/70"
                    : "bg-gradient-to-t from-electric-500/25 to-electric-400/60"
                }`}
                style={{ height: `${Math.max((value / max) * 100, 3)}%` }}
              />
            );
          })}
        </div>
      </div>
    </figure>
  );
}

export function MetricsPanel({
  metrics,
  hint,
  collectedAs,
  markedHere,
  onCollect,
}: {
  metrics: Investigation["metrics"];
  hint: string;
  /** The finding this row was collected as, or null while uncollected. */
  collectedAs: (evidenceId: string) => string | null;
  /** Whether the player marked this row, rather than holding its finding from elsewhere. */
  markedHere: (rowId: string) => boolean;
  onCollect: (evidenceIds: string[], rowIds: string[]) => void;
}) {
  const selection = useEvidenceSelection(onCollect);

  return (
    <div>
      <LatencyChart latency={metrics.latency} />

      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {metrics.cards.map((card) => {
          const collected = card.evidenceId
            ? collectedAs(card.evidenceId)
            : null;
          const mine = collected !== null && markedHere(card.id);
          const selected = selection.isSelected(card.id);

          const body = (
            <>
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs font-medium text-slate-400">
                  {card.label}
                </span>
                {card.evidenceId ? (
                  <SelectionMark
                    selected={collected ? false : selected}
                    collected={mine}
                    related={collected !== null}
                  />
                ) : null}
              </div>
              <p
                className={`mt-1.5 font-mono text-2xl font-semibold ${METRIC_TONE[card.tone]}`}
              >
                {card.value}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {card.detail}
              </p>
              {collected && (
                <span className="mt-2 inline-flex">
                  {mine ? (
                    <CollectedTag name={collected} />
                  ) : (
                    <RelatedTag name={collected} />
                  )}
                </span>
              )}
            </>
          );

          const base = "rounded-xl border p-4 text-left";

          if (!card.evidenceId) {
            return (
              <li
                key={card.id}
                className={`${base} border-white/[0.06] bg-white/[0.02]`}
              >
                {body}
              </li>
            );
          }

          if (collected) {
            return (
              <li
                key={card.id}
                className={`${base} ${
                  mine
                    ? "border-emerald-400/20 bg-emerald-500/[0.06]"
                    : "border-white/[0.06] bg-white/[0.02]"
                }`}
              >
                {body}
              </li>
            );
          }

          return (
            <li key={card.id}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => selection.toggle(card.id, card.evidenceId!)}
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

      <MarkEvidenceBar
        count={selection.count}
        onSubmit={selection.submit}
        hint={hint}
      />
    </div>
  );
}
