import type { RequestSpan } from "@/lib/verification";

/** Average post-fix request, per span. Bars are scaled to the slowest span. */
export function RequestBreakdown({
  spans,
  totalMs,
}: {
  spans: RequestSpan[];
  totalMs: number;
}) {
  const max = Math.max(...spans.map((s) => s.durationMs));

  return (
    <section className="flex h-full flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-white">
        Request Breakdown (Average)
      </h3>

      <ul className="mt-4 flex-1 space-y-3">
        {spans.map((span) => (
          <li key={span.label} className="flex items-center gap-3">
            <span className="w-32 shrink-0 truncate text-xs text-slate-400">
              {span.label}
            </span>
            <span className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/[0.04]">
              <span
                className="block h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400"
                style={{ width: `${Math.max((span.durationMs / max) * 100, 4)}%` }}
              />
            </span>
            <span className="w-12 shrink-0 text-right font-mono text-xs text-slate-300">
              {span.durationMs}ms
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
        <span className="text-sm font-medium text-slate-300">Total</span>
        <span className="font-mono text-lg font-bold text-emerald-300">
          {totalMs}ms
        </span>
      </div>
    </section>
  );
}
