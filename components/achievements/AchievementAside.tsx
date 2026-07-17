import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import {
  TONE_STYLES,
  completionRatio,
  formatUnlockDate,
  latestAchievement,
  nextToUnlock,
  type Achievement,
} from "@/lib/achievements";
import { AchievementBadge } from "./AchievementBadge";

/**
 * The two "what just happened / what's next" panels. They sit on the right on
 * desktop and drop below the grid under xl.
 */
export function AchievementAside({ achievements }: { achievements: Achievement[] }) {
  const latest = latestAchievement(achievements);
  const next = nextToUnlock(achievements);

  return (
    <div className="flex flex-col gap-4">
      {latest && <RecentAchievement achievement={latest} />}
      {next && <NextToUnlock achievement={next} />}
    </div>
  );
}

function RecentAchievement({ achievement }: { achievement: Achievement }) {
  const tone = TONE_STYLES[achievement.tone];

  return (
    <section
      className={`rounded-2xl border border-violet-400/25 bg-gradient-to-b from-violet-600/[0.12] to-transparent p-5 text-center ${tone.glow}`}
    >
      <h2 className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-violet-300">
        Recent Achievement
      </h2>

      <div className="mt-4 flex justify-center">
        <AchievementBadge achievement={achievement} size="lg" />
      </div>

      <h3 className="mt-4 text-lg font-bold text-white">{achievement.title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
        {achievement.description}
      </p>

      {achievement.unlockedAt && (
        <div className="mt-4 inline-flex items-center gap-1.5 text-[0.65rem] text-violet-300">
          <Clock className="h-3 w-3" strokeWidth={2.2} />
          Unlocked {formatUnlockDate(achievement.unlockedAt)}
        </div>
      )}
    </section>
  );
}

function NextToUnlock({ achievement }: { achievement: Achievement }) {
  const pct = Math.round(completionRatio(achievement) * 100);

  return (
    <section className="surface p-5 text-center">
      <h2 className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
        Next to Unlock
      </h2>

      <div className="mt-4 flex justify-center">
        <AchievementBadge achievement={achievement} size="md" />
      </div>

      <h3 className="mt-4 text-base font-bold text-white">{achievement.title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
        {achievement.description}
      </p>

      <div className="mt-4">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-electric-400"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[0.65rem]">
          <span className="text-slate-600">{achievement.requirement}</span>
          <span className="font-mono text-slate-400">
            {achievement.progress.toLocaleString("en-US")} /{" "}
            {achievement.target.toLocaleString("en-US")}
          </span>
        </div>
      </div>

      {achievement.link && (
        <Link
          href={achievement.link.href}
          className="group mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/[0.08] px-4 py-2.5 text-sm font-semibold text-violet-200 transition-colors hover:border-violet-400/50"
        >
          {achievement.link.label}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </section>
  );
}
