import {
  METRIC_ACCENT,
  METRIC_ICONS,
  METRIC_STATUS_VALUE,
  type VerificationMetric,
} from "@/lib/verification";

export function MetricCards({ metrics }: { metrics: VerificationMetric[] }) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {metrics.map((metric) => {
        const Icon = METRIC_ICONS[metric.icon];
        return (
          <li
            key={metric.id}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
          >
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${METRIC_ACCENT[metric.accent]}`}
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
              </span>
              <span className="text-xs font-medium text-slate-400">
                {metric.label}
              </span>
            </div>

            <p
              className={`mt-3 font-mono text-2xl font-bold ${METRIC_STATUS_VALUE[metric.status]}`}
            >
              {metric.after}
            </p>

            <p
              className={`mt-1.5 text-xs font-medium ${
                metric.deltaTone === "good" ? "text-emerald-300" : "text-slate-400"
              }`}
            >
              {metric.delta}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">was {metric.before}</p>
          </li>
        );
      })}
    </ul>
  );
}
