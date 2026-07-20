import { FUTURE_SKILL_TRACKS, LANDING_SKILLS, SKILL_COLORS } from "@/lib/data";
import { Reveal } from "./ui/Reveal";

export function SkillsGrid() {
  return (
    <section id="skills" className="min-w-0">
      <Reveal className="surface flex h-full flex-col p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-white sm:text-2xl">
          Node.js Skills You&apos;ll Build
        </h2>
        <p className="mt-1.5 text-sm text-slate-400">
          The backend skills real Node.js services and interviews demand.
        </p>

        <div className="mt-6 grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3">
          {LANDING_SKILLS.map((skill) => {
            const Icon = skill.icon;
            const c = SKILL_COLORS[skill.color];
            return (
              <div
                key={skill.name}
                className="flex flex-col items-center justify-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center transition-colors hover:border-white/15"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
                  <Icon className={`h-5 w-5 ${c.icon}`} strokeWidth={1.9} />
                </span>
                <h3 className="text-xs font-semibold leading-tight text-white">
                  {skill.name}
                </h3>
              </div>
            );
          })}
        </div>

        {/* Roadmap — not playable yet, so deliberately inert and muted. */}
        <div className="mt-6 border-t border-white/[0.06] pt-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            More tracks coming soon
          </h3>
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {FUTURE_SKILL_TRACKS.map((track) => {
              const Icon = track.icon;
              const c = SKILL_COLORS[track.color];
              return (
                <li
                  key={track.name}
                  // The "Coming Soon" badge below already says this, in text —
                  // `aria-disabled` means nothing on a listitem.
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border border-white/[0.04] bg-white/[0.01] p-3 text-center opacity-60"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/[0.06] bg-white/[0.02]">
                    <Icon className={`h-4 w-4 ${c.icon}`} strokeWidth={1.9} />
                  </span>
                  <span className="text-[0.7rem] font-medium leading-tight text-slate-400">
                    {track.name}
                  </span>
                  <span className="rounded-md border border-white/[0.06] px-1.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Coming Soon
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}
