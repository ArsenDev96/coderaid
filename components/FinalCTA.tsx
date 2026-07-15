import Link from "next/link";
import { ArrowRight, Crosshair } from "lucide-react";
import { Reveal } from "./ui/Reveal";

export function FinalCTA() {
  return (
    <section id="pricing" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl border border-violet-400/30 bg-gradient-to-br from-violet-700/40 via-violet-900/30 to-electric-900/20 px-6 py-10 sm:px-12 sm:py-12">
          {/* circuit backdrop */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-grid-fade opacity-40 [background-size:32px_32px] [mask-image:radial-gradient(80%_80%_at_20%_50%,black,transparent)]"
          />

          <div className="relative flex flex-col items-center gap-6 text-center lg:flex-row lg:justify-between lg:text-left">
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center lg:gap-6">
              <span className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl border border-violet-400/40 bg-violet-500/15 shadow-neon">
                <Crosshair className="h-9 w-9 animate-pulse-soft text-violet-200" strokeWidth={1.6} />
              </span>
              <div>
                <h2 className="text-2xl font-bold leading-tight text-white sm:text-3xl lg:text-4xl">
                  Your first incident is waiting.
                </h2>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-300 sm:text-base">
                  Start solving real problems and become a better engineer.
                </p>
              </div>
            </div>

            <Link
              href="/start"
              className="group inline-flex shrink-0 items-center gap-2 rounded-xl border border-violet-400/40 bg-gradient-to-r from-violet-600 to-electric-500 px-7 py-3.5 text-sm font-semibold text-white shadow-neon transition-transform hover:scale-[1.03]"
            >
              Start Your First Mission
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
