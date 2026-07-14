import { Lock } from "lucide-react";
import { CAREER_RANKS } from "@/lib/data";
import { Reveal } from "./ui/Reveal";
import { SectionHeading } from "./ui/SectionHeading";

export function CareerPath() {
  return (
    <section id="career" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <SectionHeading
        eyebrow="Career Progression"
        title={
          <>
            Progress Your Engineering{" "}
            <span className="text-gradient">Career</span>
          </>
        }
        subtitle="Climb from your first internship mission to architecting systems. Every rank unlocks harder incidents and deeper skills."
      />

      <div className="mt-14">
        {/* Horizontally scrollable on mobile, evenly laid out on desktop */}
        <div className="thin-scroll -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-5">
          {CAREER_RANKS.map((rank, i) => {
            const Icon = rank.icon;
            const isCurrent = rank.state === "current";
            const isLocked = rank.state === "locked";

            return (
              <Reveal
                key={rank.name}
                delay={i * 0.08}
                className="min-w-[15rem] snap-start sm:min-w-0"
              >
                <div
                  className={`relative flex h-full flex-col rounded-2xl border p-5 transition-colors ${
                    isCurrent
                      ? "border-violet-400/50 bg-gradient-to-b from-violet-600/[0.14] to-electric-500/[0.06] shadow-neon"
                      : isLocked
                        ? "border-white/[0.06] bg-white/[0.01]"
                        : "border-white/[0.08] bg-white/[0.02]"
                  }`}
                >
                  {isCurrent && (
                    <span className="absolute -top-2.5 left-5 rounded-full border border-violet-400/50 bg-base-900 px-2.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wide text-violet-200">
                      You are here
                    </span>
                  )}

                  <div className="flex items-center justify-between">
                    <span
                      className={`grid h-12 w-12 place-items-center rounded-xl border ${
                        isCurrent
                          ? "border-violet-400/40 bg-violet-500/15 text-violet-200"
                          : isLocked
                            ? "border-white/[0.06] bg-white/[0.02] text-slate-600"
                            : "border-electric-400/25 bg-electric-500/10 text-electric-300"
                      }`}
                    >
                      <Icon className="h-6 w-6" strokeWidth={1.8} />
                    </span>
                    {isLocked && <Lock className="h-4 w-4 text-slate-600" />}
                  </div>

                  <h3
                    className={`mt-4 text-sm font-semibold ${
                      isLocked ? "text-slate-400" : "text-white"
                    }`}
                  >
                    {rank.name}
                  </h3>
                  <div
                    className={`mt-1.5 font-mono text-xs ${
                      isCurrent ? "text-violet-300" : "text-slate-500"
                    }`}
                  >
                    {rank.xpRange}
                  </div>

                  <div className="mt-4 pt-3">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wide ${
                        isCurrent
                          ? "bg-violet-500/15 text-violet-200"
                          : isLocked
                            ? "bg-white/[0.03] text-slate-600"
                            : "bg-emerald-500/10 text-emerald-300"
                      }`}
                    >
                      {isCurrent
                        ? "Current"
                        : isLocked
                          ? "Locked"
                          : "Unlocked"}
                    </span>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
