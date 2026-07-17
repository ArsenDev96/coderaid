import { Flame, Trophy } from "lucide-react";
import {
  achievementSummary,
  formatUnlockDate,
  latestAchievement,
  type Achievement,
} from "@/lib/achievements";
import { AchievementBadge } from "./AchievementBadge";

const DAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"];

/** Three compact values, one card — total unlocked, streak, latest earned. */
export function AchievementSummary({
  achievements,
  streakDays,
}: {
  achievements: Achievement[];
  streakDays: number;
}) {
  const summary = achievementSummary(achievements);
  const latest = latestAchievement(achievements);
  const litDays = Math.min(streakDays, DAY_INITIALS.length);

  return (
    <div className="surface grid grid-cols-1 gap-6 p-5 sm:p-6 lg:grid-cols-3 lg:gap-4">
      {/* Total unlocked */}
      <div className="flex items-center gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-violet-400/25 bg-violet-500/10">
          <Trophy className="h-6 w-6 text-violet-300" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Total Unlocked
          </div>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-white">{summary.unlocked}</span>
            <span className="text-xs text-slate-500">
              / {summary.total} achievements
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full max-w-[11rem] overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-electric-400"
              style={{ width: `${summary.pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Current streak */}
      <div className="flex items-center gap-4 lg:border-l lg:border-white/[0.06] lg:pl-6">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-electric-400/25 bg-electric-500/10">
          <Flame className="h-6 w-6 text-electric-300" strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <div className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Current Streak
          </div>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-white">{streakDays}</span>
            <span className="text-xs text-slate-500">days in a row</span>
          </div>
          <ul className="mt-2 flex gap-1.5" aria-label={`${streakDays} day streak`}>
            {DAY_INITIALS.map((d, i) => (
              <li key={i} className="flex flex-col items-center gap-1">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    i < litDays
                      ? "bg-electric-400 shadow-neon-blue"
                      : "border border-white/15 bg-transparent"
                  }`}
                />
                <span className="text-[0.55rem] text-slate-600">{d}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Latest achievement */}
      <div className="flex items-center gap-4 lg:border-l lg:border-white/[0.06] lg:pl-6">
        {latest ? (
          <>
            <AchievementBadge achievement={latest} />
            <div className="min-w-0">
              <div className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Latest Achievement
              </div>
              <div className="mt-0.5 truncate text-base font-bold text-white">
                {latest.title}
              </div>
              {latest.unlockedAt && (
                <div className="text-xs text-slate-500">
                  Unlocked {formatUnlockDate(latest.unlockedAt)}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="min-w-0">
            <div className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Latest Achievement
            </div>
            <div className="mt-1 text-sm text-slate-400">
              Nothing unlocked yet — complete a mission to earn your first.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
