import { ArrowRight, LineChart } from "lucide-react";
import type { MissionResultMetric } from "@/lib/results";

/** Compact before→after sparkline: purple pre-fix line, green post-fix line. */
function Sparkline({
  spark,
}: {
  spark: NonNullable<MissionResultMetric["spark"]>;
}) {
  const y = (v: number) => (1 - v / spark.yMax) * 100;
  const before = spark.before
    .map((v, i) => `${(i / (spark.before.length - 1)) * 48},${y(v)}`)
    .join(" ");
  const after = spark.after
    .map((v, i) => `${52 + (i / (spark.after.length - 1)) * 48},${y(v)}`)
    .join(" ");

  return (
    <div className="mt-3">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-16 w-full"
        aria-hidden
      >
        <line
          x1="50"
          x2="50"
          y1="0"
          y2="100"
          stroke="rgba(167,139,250,0.5)"
          strokeWidth="0.5"
          strokeDasharray="2 2"
        />
        <polyline
          points={before}
          fill="none"
          stroke="#a78bfa"
          strokeWidth="1.4"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points={after}
          fill="none"
          stroke="#34d399"
          strokeWidth="1.4"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-1 flex justify-between text-[0.6rem] text-slate-600">
        <span>Before Fix</span>
        <span>After Fix</span>
      </div>
    </div>
  );
}

/**
 * Before/after impact of the correct fix.
 *
 * On an unresolved run there is no improvement to show — nothing changed — so
 * the panel reports the target the fix would have hit instead of claiming
 * numbers the player's change didn't produce.
 */
export function PerformanceImprovement({
  metrics,
  resolved,
}: {
  metrics: MissionResultMetric[];
  resolved: boolean;
}) {
  const [featured, ...rest] = metrics;

  return (
    <section className="flex h-full flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white sm:text-base">
          <LineChart
            className={`h-4 w-4 ${resolved ? "text-emerald-400" : "text-slate-500"}`}
            strokeWidth={2.2}
          />
          {resolved ? "Performance improvement" : "Impact you missed"}
        </h3>
        <span className="flex items-center gap-3 text-[0.68rem] text-slate-400">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            Before Fix
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {resolved ? "After Fix" : "Target"}
          </span>
        </span>
      </div>

      {/* Featured metric with sparkline */}
      {featured && (
        <div className="mt-4 rounded-xl border border-white/[0.06] bg-base-950/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-slate-300">{featured.label}</span>
            <span className="flex items-center gap-2 font-mono text-sm font-semibold">
              <span className="text-violet-300">{featured.before}</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-600" />
              <span className="text-emerald-300">{featured.after}</span>
            </span>
          </div>
          {featured.spark && <Sparkline spark={featured.spark} />}
        </div>
      )}

      {/* Remaining metrics as before → after rows */}
      <ul className="mt-3 flex flex-col gap-3">
        {rest.map((metric) => (
          <li
            key={metric.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-base-950/40 px-4 py-3"
          >
            <span className="text-sm text-slate-300">{metric.label}</span>
            <span className="flex items-center gap-2 font-mono text-sm font-semibold">
              <span className="text-violet-300">{metric.before}</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-600" />
              <span className="text-emerald-300">{metric.after}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
