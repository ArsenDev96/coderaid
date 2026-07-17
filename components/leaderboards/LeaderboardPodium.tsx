import { PODIUM_ACCENTS, formatXp, type LeaderboardPlayer } from "@/lib/leaderboards";
import { PlayerAvatar } from "./PlayerAvatar";

/**
 * The top three. Compact rows on mobile; on `sm+` a real podium — second,
 * first, third — with the champion raised and haloed gold.
 */
export function LeaderboardPodium({ players }: { players: LeaderboardPlayer[] }) {
  if (players.length === 0) return null;

  // Mobile keeps rank order; the podium re-orders to 2 · 1 · 3 from sm up.
  const desktopOrder = ["sm:order-2", "sm:order-1", "sm:order-3"];

  return (
    <ol className="flex flex-col gap-3 sm:grid sm:grid-cols-3 sm:items-end sm:gap-4">
      {players.map((player, i) => {
        const accent = PODIUM_ACCENTS[i];
        const isFirst = i === 0;

        return (
          <li
            key={player.id}
            aria-current={player.isCurrentUser ? "true" : undefined}
            className={`relative flex items-center gap-4 rounded-2xl border p-4 sm:mt-6 sm:flex-col sm:gap-0 sm:pb-6 sm:pt-9 ${
              isFirst ? `sm:pb-8 sm:pt-11 ${accent.glow}` : ""
            } ${accent.card} ${desktopOrder[i]}`}
          >
            {/* Rank medal — inline on mobile, straddling the card edge on desktop */}
            <span
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border text-sm font-bold sm:absolute sm:-top-4 sm:left-1/2 sm:-translate-x-1/2 ${
                isFirst ? "sm:h-10 sm:w-10 sm:text-base" : ""
              } ${accent.badge}`}
            >
              {player.rank}
            </span>

            <PlayerAvatar
              avatar={player.avatar}
              size={isFirst ? "lg" : "md"}
              className={`border-2 ${accent.ring} ${isFirst ? accent.glow : ""}`}
            />

            <div className="min-w-0 flex-1 sm:mt-3 sm:flex-none sm:text-center">
              <div
                className={`truncate font-bold text-white ${isFirst ? "sm:text-lg" : "sm:text-base"}`}
              >
                {player.username}
                {player.isCurrentUser && (
                  <span className="ml-1.5 text-violet-300">(You)</span>
                )}
              </div>
              <div className={`text-xs font-medium ${accent.text}`}>
                Level {player.level}
              </div>
            </div>

            <div
              className={`shrink-0 text-right sm:mt-3 sm:text-center ${
                isFirst ? "sm:text-xl" : "sm:text-base"
              }`}
            >
              <span className="font-mono font-bold text-white">
                {formatXp(player.xp)}
              </span>
              <span className="ml-1 text-xs font-medium text-slate-400">XP</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
