import { Settings as SettingsIcon, ShieldCheck } from "lucide-react";
import { CAREER_RANKS } from "@/lib/data";
import { DEMO_PLAYER } from "@/lib/dashboard";
import { AVATARS } from "@/lib/onboarding";
import type { ProfileValues } from "./ProfileSection";

/**
 * The rank the player currently holds, read off the same XP ladder the landing
 * page and dashboard show — the last rank whose range they've reached.
 */
function currentRank(totalXp: number): string {
  const reached = CAREER_RANKS.filter(
    (r) => totalXp >= Number(r.xpRange.split("–")[0].replace(/[^\d]/g, "")),
  );
  return reached[reached.length - 1]?.name ?? CAREER_RANKS[0].name;
}

/**
 * A small preview of how the profile reads, mirroring the form live so the
 * effect of a change is visible before it's saved. Progress values come from
 * the shared player record — this panel displays them, it never sets them.
 */
export function ProfilePreview({ profile }: { profile: ProfileValues }) {
  const avatar = AVATARS.find((a) => a.id === profile.avatarId) ?? AVATARS[0];
  const Icon = avatar.icon;
  const name = profile.name.trim() || DEMO_PLAYER.name;

  return (
    <div className="flex flex-col gap-4">
      <section className="surface p-5">
        <h2 className="text-sm font-semibold text-white">Your Profile</h2>

        <div className="mt-5 flex flex-col items-center">
          {/* Hexagon avatar plate, matching the badge language used elsewhere */}
          <span className="relative grid h-24 w-24 place-items-center text-violet-300">
            <svg viewBox="0 0 100 112" className="absolute inset-0 h-full w-full">
              <polygon
                points="50,3 95,29 95,83 50,109 5,83 5,29"
                fill="currentColor"
                fillOpacity={0.12}
                stroke="currentColor"
                strokeOpacity={0.7}
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
            </svg>
            <span
              className={`relative z-10 grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br ${avatar.gradient}`}
            >
              <Icon className="h-6 w-6 text-white" strokeWidth={1.8} />
            </span>
          </span>

          <div className="mt-3.5 max-w-full truncate text-base font-bold text-white">
            {name}
          </div>
          <div className="text-xs font-medium text-violet-300">
            Level {DEMO_PLAYER.level}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/[0.06] pt-4">
          <div>
            <div className="text-xs text-slate-500">Total XP</div>
            <div className="mt-0.5 font-mono text-sm font-bold text-violet-300">
              {DEMO_PLAYER.totalXp.toLocaleString("en-US")} XP
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Rank</div>
            <div className="mt-0.5 text-sm font-bold text-electric-300">
              {currentRank(DEMO_PLAYER.totalXp)}
            </div>
          </div>
        </div>
      </section>

      <section className="surface p-5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-slate-400">
            <SettingsIcon className="h-4 w-4" strokeWidth={1.9} />
          </span>
          <h2 className="text-sm font-semibold text-white">About Settings</h2>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-400">
          These settings affect your CodeRaid experience only.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          Your profile and preferences are kept when you reset mission progress.
        </p>
        <ShieldCheck className="mt-3 h-4 w-4 text-violet-400/70" strokeWidth={1.9} />
      </section>
    </div>
  );
}
