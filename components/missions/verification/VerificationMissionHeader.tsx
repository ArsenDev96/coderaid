import { Check, ShieldCheck } from "lucide-react";

/**
 * Compact orientation panel for the verification stage. No rewards/XP widgets —
 * the shared top bar carries those.
 */
export function VerificationMissionHeader({
  title,
  step,
  totalSteps,
}: {
  title: string;
  step: number;
  totalSteps: number;
}) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        {/* Mission */}
        <div className="flex min-w-0 gap-4">
          <span
            aria-hidden
            className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-emerald-400/30 bg-emerald-500/10"
          >
            <ShieldCheck className="h-7 w-7 text-emerald-300" strokeWidth={1.6} />
          </span>

          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-emerald-300">
              Verification Step
            </span>
            <h1 className="mt-2.5 text-xl font-bold tracking-tight text-white sm:text-2xl">
              {title}
            </h1>
            <p className="mt-1.5 max-w-md text-sm leading-relaxed text-slate-400">
              Verifying the fix and measuring the improvement.
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="shrink-0 lg:max-w-[15rem]">
          <p className="text-xs text-slate-500">
            Step {step} of {totalSteps}
          </p>
          <h2 className="mt-1 text-base font-semibold text-white">
            Verification
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            Confirm that the fix resolved the issue and performance is back to
            normal.
          </p>

          <ol className="mt-3 flex items-center gap-1.5">
            {steps.map((n, i) => {
              const done = n < step;
              const current = n === step;
              return (
                <li key={n} className="flex items-center gap-1.5">
                  <span
                    aria-current={current ? "step" : undefined}
                    className={`grid h-6 w-6 place-items-center rounded-full border text-[0.62rem] font-semibold ${
                      current
                        ? "border-violet-400/60 bg-violet-500/80 text-white"
                        : done
                          ? "border-violet-400/40 bg-violet-500/15 text-violet-200"
                          : "border-white/10 bg-white/[0.02] text-slate-600"
                    }`}
                  >
                    {done ? (
                      <>
                        <Check className="h-3 w-3" strokeWidth={3} />
                        <span className="sr-only">Step {n} complete</span>
                      </>
                    ) : (
                      n
                    )}
                  </span>
                  {i < steps.length - 1 && (
                    <span
                      aria-hidden
                      className={`h-px w-5 ${done ? "bg-violet-400/40" : "bg-white/10"}`}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
