import { Activity, Cpu } from "lucide-react";
import { LAG_THRESHOLD_MS, type Measurement } from "@/lib/verification-runtime";

/**
 * What the replay actually measured, kept visually separate from the panels
 * around it.
 *
 * The distinction is the point. Everything else on this screen is an authored
 * illustration of the incident, revealed according to whether the fix worked.
 * This block is the only thing on the page that came from code that just ran on
 * the player's own machine, so it says so plainly rather than blending in — a
 * measurement presented as indistinguishable from a mock-up is worth less than
 * either.
 */
export function ReplayMeasurement({ measurement }: { measurement: Measurement }) {
  const { maxLagMs, totalMs, rows, responsive } = measurement;

  return (
    <section
      aria-label="Replay measurement"
      className={`rounded-2xl border p-4 sm:p-5 ${
        responsive
          ? "border-emerald-400/25 bg-emerald-500/[0.06]"
          : "border-amber-400/25 bg-amber-500/[0.06]"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${
            responsive
              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
              : "border-amber-400/30 bg-amber-500/10 text-amber-300"
          }`}
        >
          {responsive ? (
            <Activity className="h-4 w-4" strokeWidth={2.2} />
          ) : (
            <Cpu className="h-4 w-4" strokeWidth={2.2} />
          )}
        </span>

        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white">
            Measured in your browser, just now
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            {rows.toLocaleString()} rows were aggregated with the same quadratic
            scan as the incident, with your fix in place.{" "}
            {responsive
              ? "The main thread kept answering throughout — the work ran off it."
              : "The main thread stopped answering while it ran — the work is still on it."}
          </p>

          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-slate-500">
                Longest stall
              </dt>
              <dd
                className={`font-mono text-lg font-semibold ${
                  responsive ? "text-emerald-300" : "text-amber-300"
                }`}
              >
                {maxLagMs}ms
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-slate-500">
                Replay time
              </dt>
              <dd className="font-mono text-lg font-semibold text-slate-300">
                {totalMs}ms
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-slate-500">
                Responsive under
              </dt>
              <dd className="font-mono text-lg font-semibold text-slate-500">
                {LAG_THRESHOLD_MS}ms
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
