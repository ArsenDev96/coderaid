import { HOW_IT_WORKS } from "@/lib/data";
import { Reveal } from "./ui/Reveal";

// Distinct accent per step, matching the connected-flow look.
const ACCENTS = [
  "border-violet-400/40 bg-violet-500/10 text-violet-200",
  "border-electric-400/40 bg-electric-500/10 text-electric-200",
  "border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-200",
  "border-amber-400/40 bg-amber-500/10 text-amber-200",
  "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20"
    >
      <Reveal className="surface p-6 sm:p-10">
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">
            How <span className="text-gradient">CodeRaid</span> Works
          </h2>
          <p className="text-sm text-slate-400 sm:text-base">
            A gameplay loop built around debugging real Node.js backend
            failures.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-x-3 gap-y-8 sm:grid-cols-2 lg:grid-cols-5">
          {HOW_IT_WORKS.map((step, i) => {
            const Icon = step.icon;
            return (
              <Reveal key={step.step} delay={i * 0.08} className="relative">
                {/* dashed connector (desktop, between cards) */}
                {i < HOW_IT_WORKS.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute -right-2.5 top-1/2 hidden w-3 border-t border-dashed border-violet-500/40 lg:block"
                  />
                )}

                <div className="relative h-full rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 pb-5 pt-7 text-center transition-colors hover:border-white/15">
                  {/* step number sits on the top border */}
                  <span className="absolute -top-3 left-1/2 grid h-6 w-6 -translate-x-1/2 place-items-center rounded-full border border-violet-400/40 bg-base-900 text-[0.65rem] font-semibold text-violet-200">
                    {step.step}
                  </span>

                  <span
                    className={`mx-auto grid h-11 w-11 place-items-center rounded-xl border ${ACCENTS[i]}`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.8} />
                  </span>

                  <h3 className="mt-3 text-sm font-semibold text-white">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                    {step.description}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}
