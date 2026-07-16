import type { VerificationChart } from "@/lib/verification";

/**
 * Two connected lines split at the "fix applied" marker: the pre-fix latency
 * (purple) up to the fix, then the post-fix latency (green) dropping after it.
 * Drawn in a 0–100 viewBox so it scales without a charting dependency.
 */
export function PerformanceChart({ chart }: { chart: VerificationChart }) {
  const { yMax, unit, before, after, fixFraction, fixLabel, xLabels } = chart;

  const y = (v: number) => (1 - v / yMax) * 100;
  const beforePts = before.map((v, i) => {
    const x = (i / (before.length - 1)) * fixFraction * 100;
    return `${x},${y(v)}`;
  });
  const afterPts = after.map((v, i) => {
    const x = (fixFraction + (i / (after.length - 1)) * (1 - fixFraction)) * 100;
    return `${x},${y(v)}`;
  });

  const yTicks = Array.from({ length: yMax + 1 }, (_, i) => yMax - i);

  return (
    <figure className="flex h-full flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
      <figcaption className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-semibold text-white">{chart.caption}</span>
        <span className="flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-0.5 w-4 rounded bg-violet-400" />
            Before Fix
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-0.5 w-4 rounded bg-emerald-400" />
            After Fix
          </span>
        </span>
      </figcaption>

      <div className="mt-4 flex flex-1 gap-2">
        {/* Y axis */}
        <div className="flex flex-col justify-between py-0.5 font-mono text-[0.6rem] text-slate-600">
          {yTicks.map((t) => (
            <span key={t}>
              {t}
              {unit}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="h-40 w-full sm:h-48"
            role="img"
            aria-label={`Response time held near ${before[0]}${unit} before the fix, then dropped to about ${after[after.length - 1]}${unit} after it.`}
          >
            {/* gridlines */}
            {yTicks.map((t) => (
              <line
                key={t}
                x1="0"
                x2="100"
                y1={y(t)}
                y2={y(t)}
                stroke="rgba(148,163,184,0.08)"
                strokeWidth="0.5"
              />
            ))}

            {/* fix marker */}
            <line
              x1={fixFraction * 100}
              x2={fixFraction * 100}
              y1="0"
              y2="100"
              stroke="rgba(167,139,250,0.6)"
              strokeWidth="0.5"
              strokeDasharray="2 2"
            />

            <polyline
              points={beforePts.join(" ")}
              fill="none"
              stroke="#a78bfa"
              strokeWidth="1.4"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            <polyline
              points={afterPts.join(" ")}
              fill="none"
              stroke="#34d399"
              strokeWidth="1.4"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* fix label + x axis */}
          <div className="relative mt-1 h-4">
            <span
              className="absolute -translate-x-1/2 whitespace-nowrap rounded border border-violet-400/30 bg-violet-500/15 px-1.5 py-0.5 text-[0.55rem] font-semibold text-violet-200"
              style={{ left: `${fixFraction * 100}%` }}
            >
              {fixLabel}
            </span>
          </div>
          <div className="mt-1 flex justify-between font-mono text-[0.6rem] text-slate-600">
            {xLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>
      </div>
    </figure>
  );
}
