import { CircleCheckBig, XCircle } from "lucide-react";
import type { VerificationCheck } from "@/lib/verification";

export function VerificationSummary({
  checks,
}: {
  checks: VerificationCheck[];
}) {
  return (
    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-white">Verification Summary</h3>

      <ul className="mt-4 space-y-3">
        {checks.map((check) => (
          <li key={check.id} className="flex items-start gap-2.5">
            {check.passed ? (
              <CircleCheckBig
                aria-hidden
                className="mt-px h-4 w-4 shrink-0 text-emerald-400"
                strokeWidth={2.2}
              />
            ) : (
              <XCircle
                aria-hidden
                className="mt-px h-4 w-4 shrink-0 text-rose-400"
                strokeWidth={2.2}
              />
            )}
            <span className="text-sm leading-relaxed text-slate-300">
              {check.label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
