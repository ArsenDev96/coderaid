import { ArrowRight, Check, HelpCircle } from "lucide-react";
import { CODERAID_FLOW, TRADITIONAL_TRAITS } from "@/lib/data";
import { Reveal } from "./ui/Reveal";

export function ComparisonSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <Reveal className="surface p-6 sm:p-10">
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">
            Not Another Coding Quiz.
          </h2>
          <p className="text-sm text-slate-400 sm:text-base">
            Real incidents. Real impact. Real learning.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 items-center gap-6 lg:grid-cols-[1fr_auto_2fr]">
          {/* Traditional platforms */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] p-6">
            <h3 className="text-center text-sm font-semibold text-slate-400">
              Traditional Platforms
            </h3>
            <div className="mt-6 flex items-center justify-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.02]">
                <HelpCircle className="h-5 w-5 text-slate-500" strokeWidth={1.8} />
              </span>
              <span aria-hidden className="h-px w-8 bg-slate-700" />
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.02]">
                <Check className="h-5 w-5 text-slate-500" strokeWidth={1.8} />
              </span>
            </div>
            <ul className="mt-5 grid grid-cols-3 gap-x-2 text-center text-[0.7rem] text-slate-500">
              {TRADITIONAL_TRAITS.map((trait) => (
                <li key={trait} className="leading-tight">
                  {trait}
                </li>
              ))}
            </ul>
          </div>

          {/* VS */}
          <div className="flex justify-center">
            <span className="grid h-14 w-14 place-items-center rounded-full border border-white/[0.1] bg-base-900 text-sm font-bold uppercase tracking-wide text-slate-300">
              VS
            </span>
          </div>

          {/* CodeRaid */}
          <div className="rounded-2xl border border-violet-400/25 bg-gradient-to-b from-violet-600/[0.08] to-transparent p-6">
            <h3 className="text-center text-sm font-semibold text-violet-300">
              CodeRaid
            </h3>

            <ol className="mt-6 flex flex-wrap items-start justify-center gap-y-5">
              {CODERAID_FLOW.map((step, i) => {
                const Icon = step.icon;
                return (
                  <li key={step.label} className="flex items-start">
                    <div className="flex w-[5.5rem] flex-col items-center gap-2 text-center">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-violet-400/30 bg-violet-500/10">
                        <Icon
                          className="h-5 w-5 text-violet-200"
                          strokeWidth={1.8}
                        />
                      </span>
                      <span className="text-[0.7rem] font-medium leading-tight text-slate-300">
                        {step.label}
                      </span>
                    </div>
                    {i < CODERAID_FLOW.length - 1 && (
                      <ArrowRight
                        aria-hidden
                        className="mt-4 h-4 w-4 shrink-0 text-violet-500/50"
                      />
                    )}
                  </li>
                );
              })}
            </ol>

            <p className="mt-6 text-center text-xs text-slate-400">
              Think like an engineer. Make decisions.{" "}
              <a
                href="#mission"
                className="font-medium text-violet-300 transition-colors hover:text-violet-200"
              >
                See real impact.
              </a>
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
