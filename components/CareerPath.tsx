import { CAREER_RANKS, RANK_ACCENTS } from "@/lib/data";
import { catalogueReach, rankInReach, reachableRanks } from "@/lib/reach";
import { AvailabilityBadge } from "./ui/AvailabilityBadge";
import { Reveal } from "./ui/Reveal";

export function CareerPath() {
  // Four of the six ranks need missions that are not written yet. They stay on
  // the rail — the ladder is real and the roadmap is the honest reason they are
  // out of reach — but they are muted and badged rather than shown as goals.
  const reach = catalogueReach();
  const reachable = reachableRanks(reach);
  const topRank = reachable[reachable.length - 1]?.name ?? CAREER_RANKS[0].name;

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
              Your Node.js Progression
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Resolve Node.js incidents, earn XP and climb the ladder. The
              current catalogue carries you through{" "}
              <span className="text-slate-300">{topRank}</span> — the ranks past
              it arrive with the chapters that fund them.
            </p>
          </div>

          {/* Rank rail — horizontally scrollable on small screens */}
          <ol className="thin-scroll -mx-2 flex snap-x items-start gap-1 overflow-x-auto px-2 pb-3 lg:mx-0 lg:justify-between lg:overflow-visible lg:px-0 lg:pb-0">
            {CAREER_RANKS.map((rank, i) => {
              const Icon = rank.icon;
              const inReach = rankInReach(rank, reach);
              // A rank the catalogue cannot fund loses its accent entirely, so
              // the rail reads as "these two are the game today" at a glance.
              const accent = inReach
                ? RANK_ACCENTS[rank.accent]
                : {
                    badge: "border-white/10 bg-white/[0.03]",
                    star: "text-slate-600",
                    name: "text-slate-500",
                  };
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
                    <span
                      className={`font-mono text-[0.6rem] ${
                        inReach ? "text-slate-500" : "text-slate-600"
                      }`}
                    >
                      {rank.xpRange}
                    </span>
                    {!inReach && <AvailabilityBadge status="coming-soon" />}
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
