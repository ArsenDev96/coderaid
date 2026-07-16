import { CircleCheckBig } from "lucide-react";

/** Carries the diagnosis forward so the fix decision has its premise in view. */
export function ConfirmedRootCause({ rootCause }: { rootCause: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.05] p-4 sm:p-5">
      <span
        aria-hidden
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
      >
        <CircleCheckBig className="h-4 w-4" strokeWidth={2.2} />
      </span>
      <div className="min-w-0">
        <h3 className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-emerald-300">
          Confirmed Root Cause
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-200">
          {rootCause}
        </p>
      </div>
    </div>
  );
}
