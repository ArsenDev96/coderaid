import { ArrowRight } from "lucide-react";
import { HOW_IT_WORKS } from "@/lib/data";
import { Reveal } from "./ui/Reveal";
import { SectionHeading } from "./ui/SectionHeading";

// Distinct accent per step, matching the connected-flow look.
const ACCENTS = [
  "border-violet-500/40 text-violet-300 shadow-[0_0_28px_-8px_rgba(139,92,246,0.7)]",
  "border-electric-400/40 text-electric-300 shadow-[0_0_28px_-8px_rgba(56,189,248,0.7)]",
  "border-emerald-400/40 text-emerald-300 shadow-[0_0_28px_-8px_rgba(52,211,153,0.7)]",
  "border-amber-400/40 text-amber-300 shadow-[0_0_28px_-8px_rgba(251,191,36,0.7)]",
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28"
    >
      <SectionHeading
        eyebrow="The Loop"
        title={
          <>
            How <span className="text-gradient">CodeRaid</span> Works
          </>
        }
        subtitle="Every mission follows the same rhythm a real engineer works through — from alert to shipped fix."
      />

      <div className="mt-16 grid grid-cols-1 gap-x-4 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {HOW_IT_WORKS.map((step, i) => {
          const Icon = step.icon;
          return (
            <Reveal key={step.step} delay={i * 0.1} className="relative">
              {/* connector arrow (desktop, between cards) */}
              {i < HOW_IT_WORKS.length - 1 && (
                <ArrowRight
                  aria-hidden
                  className="absolute -right-4 top-8 hidden h-5 w-5 text-violet-500/50 lg:block"
                />
              )}
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <span
                    className={`grid h-[4.6rem] w-[4.6rem] place-items-center rounded-full border bg-base-900 ${ACCENTS[i]}`}
                  >
                    <Icon className="h-7 w-7" strokeWidth={1.7} />
                  </span>
                  <span className="absolute -left-1 -top-1 grid h-6 w-6 place-items-center rounded-full border border-white/15 bg-base-950 text-xs font-semibold text-slate-300">
                    {step.step}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-semibold text-white">
                  {step.title}
                </h3>
                <p className="mt-1.5 max-w-[15rem] text-sm leading-relaxed text-slate-400">
                  {step.description}
                </p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
