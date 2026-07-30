import Link from "next/link";
import { CircleCheckBig, Lock } from "lucide-react";
import {
  TONE_STYLES,
  completionRatio,
  formatUnlockDate,
  type Achievement,
} from "@/lib/achievements";
import { AvailabilityBadge } from "@/components/ui/AvailabilityBadge";
import { AchievementBadge } from "./AchievementBadge";

/**
 * One achievement. Unlocked cards get a tinted border and an unlock date;
 * locked cards get a progress bar and the requirement, so there's always a
 * clear answer to "what do I do next".
 */
export function AchievementCard({ achievement }: { achievement: Achievement }) {
  const tone = TONE_STYLES[achievement.tone];
  const unlocked = achievement.unlocked;
  const roadmap = achievement.roadmap;
  const pct = Math.round(completionRatio(achievement) * 100);

  return (
    <li
      className={`surface flex flex-col items-center p-5 text-center transition-colors ${
        unlocked
          ? "border-white/[0.12]"
          : roadmap
            ? "opacity-70"
            : "hover:border-white/[0.14]"
      }`}
    >
      <div className="relative">
        <AchievementBadge achievement={achievement} />
        {unlocked && (
          <span className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full border border-emerald-400/40 bg-base-900 text-emerald-400">
            <CircleCheckBig className="h-3.5 w-3.5" strokeWidth={2.6} />
          </span>
        )}
      </div>

      <h3 className="mt-3.5 text-sm font-bold text-white">{achievement.title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">
        {achievement.description}
      </p>

      {/* Progress — shown whenever there's more than one step to it, but never
          for a roadmap goal: a part-filled bar toward something no play can
          finish reads as "nearly there" when the truth is "not yet possible". */}
      {achievement.target > 1 && !roadmap && (
        <div className="mt-3.5 w-full">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${
                unlocked ? tone.bar : "from-violet-500 to-violet-400"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1.5 text-right font-mono text-[0.65rem] text-slate-500">
            <span className={unlocked ? tone.icon : "text-slate-300"}>
              {achievement.progress.toLocaleString("en-US")}
            </span>
            {" / "}
            {achievement.target.toLocaleString("en-US")}
          </div>
        </div>
      )}

      {/* State footer */}
      <div className="mt-auto w-full pt-4">
        {unlocked ? (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400/25 bg-violet-500/[0.08] px-2.5 py-1 text-[0.65rem] font-semibold text-violet-200">
              <CircleCheckBig className="h-3 w-3" strokeWidth={2.6} />
              Unlocked
            </span>
            {achievement.unlockedAt && (
              <div className="mt-1.5 text-[0.65rem] text-slate-500">
                {formatUnlockDate(achievement.unlockedAt)}
              </div>
            )}
          </>
        ) : roadmap ? (
          // Not locked — unfunded. The requirement is still shown, because it is
          // what this will ask for, but there is no CTA: every route it could
          // point at is one the player has already exhausted.
          <>
            <AvailabilityBadge status="coming-soon" />
            <div className="mt-1.5 text-[0.65rem] text-slate-600">
              {achievement.requirement}
            </div>
            <div className="mt-1.5 text-[0.65rem] text-slate-500">
              Needs missions beyond the current catalogue.
            </div>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-1 text-[0.65rem] font-semibold text-slate-400">
              <Lock className="h-3 w-3" strokeWidth={2.4} />
              Locked
            </span>
            <div className="mt-1.5 text-[0.65rem] text-slate-600">
              {achievement.requirement}
            </div>
            {achievement.link && (
              <Link
                href={achievement.link.href}
                className="mt-2 inline-block text-[0.65rem] font-semibold text-violet-300 transition-colors hover:text-violet-200"
              >
                {achievement.link.label} →
              </Link>
            )}
          </>
        )}
      </div>
    </li>
  );
}
