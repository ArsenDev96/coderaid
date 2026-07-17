import { Lock, Sparkle } from "lucide-react";
import {
  ACHIEVEMENT_ICONS,
  LOCKED_ICON,
  TONE_STYLES,
  type Achievement,
} from "@/lib/achievements";

const SIZES = {
  sm: { box: "h-[4.5rem] w-[4.5rem]", glyph: "h-7 w-7" },
  md: { box: "h-24 w-24", glyph: "h-9 w-9" },
  lg: { box: "h-32 w-32", glyph: "h-12 w-12" },
};

/**
 * The hexagonal achievement badge. Unlocked badges take their tone and a soft
 * halo; locked badges go muted and wear a lock, so the state reads at a glance
 * without the label. The tone sits on the wrapper as a text colour, so the
 * hexagon stroke and the icon both pick it up via `currentColor`.
 */
export function AchievementBadge({
  achievement,
  size = "sm",
}: {
  achievement: Achievement;
  size?: keyof typeof SIZES;
}) {
  const Icon = ACHIEVEMENT_ICONS[achievement.icon ?? ""] ?? Sparkle;
  const tone = TONE_STYLES[achievement.tone];
  const { box, glyph } = SIZES[size];
  const unlocked = achievement.unlocked;

  return (
    <span
      aria-hidden
      className={`relative grid shrink-0 place-items-center ${box} ${
        unlocked ? tone.icon : LOCKED_ICON
      }`}
    >
      <svg viewBox="0 0 100 112" className="absolute inset-0 h-full w-full">
        <polygon
          points="50,3 95,29 95,83 50,109 5,83 5,29"
          fill="currentColor"
          fillOpacity={unlocked ? 0.12 : 0.05}
          stroke="currentColor"
          strokeOpacity={unlocked ? 0.75 : 0.35}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </svg>

      <Icon className={`relative z-10 ${glyph}`} strokeWidth={1.7} />

      {!unlocked && (
        <span className="absolute -bottom-0.5 -right-0.5 z-10 grid h-6 w-6 place-items-center rounded-full border border-white/10 bg-base-900 text-slate-500">
          <Lock className="h-3 w-3" strokeWidth={2.4} />
        </span>
      )}
    </span>
  );
}
