import { CAREER_RANKS, RANK_ACCENTS } from "@/lib/data";
import { Reveal } from "./ui/Reveal";

export function CareerPath() {
  return (
    <section
      id="career"
      className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20"
    >
      <Reveal className="surface p-6 sm:p-10">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[16rem_1fr] lg:gap-10">
          {/* Copy */}
          <div>
            <h2 className="text-xl font-semibold text-white sm:text-2xl">
              Level Up Your Career
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Complete missions, earn XP and climb the ranks.
            </p>
          </div>

          {/* Rank rail — horizontally scrollable on small screens */}
          <ol className="thin-scroll -mx-2 flex snap-x items-start gap-1 overflow-x-auto px-2 pb-3 lg:mx-0 lg:justify-between lg:overflow-visible lg:px-0 lg:pb-0">
            {CAREER_RANKS.map((rank, i) => {
              const Icon = rank.icon;
              const accent = RANK_ACCENTS[rank.accent];
              return (
                <li
                  key={rank.name}
                  className="flex min-w-0 shrink-0 snap-start items-start lg:flex-1"
                >
                  <Reveal
                    delay={i * 0.07}
                    className="flex w-[7.5rem] flex-col items-center gap-2 text-center"
                  >
                    {/* Hexagon badge — star pips for early ranks, a crown for the top two */}
                    <span
                      className={`flex h-14 w-[3.4rem] items-center justify-center gap-px border bg-gradient-to-b [clip-path:polygon(50%_0%,100%_25%,100%_75%,50%_100%,0%_75%,0%_25%)] ${accent.badge}`}
                    >
                      {Array.from({ length: rank.stars || 1 }).map((_, s) => (
                        <Icon
                          key={s}
                          className={`${rank.stars > 1 ? "h-3 w-3" : "h-5 w-5"} ${accent.star}`}
                          fill="currentColor"
                          strokeWidth={rank.stars > 0 ? 0 : 1.8}
                        />
                      ))}
                    </span>

                    <span className={`mt-1 text-xs font-semibold ${accent.name}`}>
                      {rank.name}
                    </span>
                    <span className="font-mono text-[0.6rem] text-slate-500">
                      {rank.xpRange}
                    </span>
                  </Reveal>

                  {/* Connector */}
                  {i < CAREER_RANKS.length - 1 && (
                    <span
                      aria-hidden
                      className="mt-7 hidden h-px flex-1 bg-gradient-to-r from-white/20 to-white/5 lg:block"
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </Reveal>
    </section>
  );
}
