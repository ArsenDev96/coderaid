import { FUTURE_TRACKS } from "@/lib/skills";
import {
  AvailabilityBadge,
  AvailabilityNote,
} from "@/components/ui/AvailabilityBadge";

/**
 * Roadmap-only tracks, rendered after the Node.js skill grid.
 *
 * These are deliberately not `Skill`s: they never enter search, the category
 * tabs, the radar, the summary counts or skills-to-improve. Nothing here is
 * clickable or focusable — they are static, muted, `aria-disabled` cards that
 * only communicate what comes after the Node.js MVP.
 */
export function FutureTracks() {
  return (
    <section aria-labelledby="future-skill-tracks" className="mt-2">
      <div className="flex items-center justify-between gap-3">
        <h2
          id="future-skill-tracks"
          className="text-base font-semibold text-slate-300"
        >
          Future Skill Tracks
        </h2>
        <span className="text-xs text-slate-500">
          {FUTURE_TRACKS.length} planned
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        CodeRaid is Node.js-first today. These tracks are on the roadmap and are
        not part of your current progress.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {FUTURE_TRACKS.map((track) => {
          const Icon = track.icon;
          return (
            <div
              key={track.id}
              aria-disabled="true"
              className="flex w-full flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-left opacity-70"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${track.accent}`}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-slate-300">
                    {track.name}
                  </h3>
                  <AvailabilityBadge status="coming-soon" className="mt-1" />
                </div>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                {track.description}
              </p>

              <AvailabilityNote status="coming-soon" className="mt-2" />
            </div>
          );
        })}
      </div>
    </section>
  );
}
