"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Target } from "lucide-react";
import { useProgress } from "@/components/progress/ProgressProvider";
import { firstIncident, storageNote } from "@/lib/start";

/**
 * The one-time success state, shown immediately after onboarding completes.
 *
 * It has exactly one goal — **start the recommended first incident** — so it is
 * a single centred card with one dominant CTA. It replaces a screen that
 * offered four competing actions at once: a marketing column, an "Already have
 * progress? Continue" link in the header, "Enter Dashboard" as the primary
 * button and "Start <mission>" as the secondary one. The mission was the point
 * and it was the *least* prominent thing on the page.
 *
 * A returning player never sees this; `StartExperience` redirects them to the
 * mission they were actually in the middle of.
 */
export function OnboardingSuccess({
  name,
  experienceId,
}: {
  name: string;
  experienceId: string;
}) {
  const { view, authenticated, hydrated } = useProgress();

  // Only ever links into a mission that can be played end to end. The static
  // per-experience suggestion is used when it is playable, and falls through to
  // the same recommendation logic the rest of the app uses when it is not.
  const mission = firstIncident(experienceId, view);
  const note = storageNote(authenticated);

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="surface-strong flex flex-col items-center p-6 text-center sm:p-8">
        <span className="grid h-12 w-12 place-items-center rounded-2xl border border-emerald-400/30 bg-emerald-500/10 text-emerald-300 shadow-neon">
          <CheckCircle2 className="h-6 w-6" strokeWidth={2} />
        </span>

        <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
          You&apos;re ready{name ? `, ${name}` : ""}!
        </h2>
        <p className="mt-1.5 text-sm text-slate-400">
          Your Node.js training path is set up.
        </p>

        {mission ? (
          <>
            {/* The recommendation, given the weight the whole screen exists for. */}
            <div className="mt-6 w-full rounded-xl border border-violet-400/30 bg-violet-500/[0.07] p-4 text-left">
              <div className="flex items-center gap-2 text-violet-300">
                <Target className="h-3.5 w-3.5" strokeWidth={2.2} />
                <span className="text-[0.62rem] font-semibold uppercase tracking-[0.16em]">
                  Recommended first incident
                </span>
              </div>
              <div className="mt-1.5 text-lg font-semibold leading-snug text-white">
                {mission.title}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                {mission.difficulty} · {mission.minutes} min · {mission.xp} XP
              </p>
            </div>

            <div className="mt-5 flex w-full flex-col items-center gap-3">
              <Link
                href={`/missions/${mission.id}/briefing`}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-xl border border-violet-400/40 bg-gradient-to-r from-violet-600 to-electric-500 px-6 py-3.5 text-base font-semibold text-white shadow-neon transition-transform hover:scale-[1.02]"
              >
                Start Mission
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              {/* Available, and unmistakably secondary: a text link, not a button. */}
              <Link
                href="/dashboard"
                className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
              >
                View Dashboard
              </Link>
            </div>
          </>
        ) : (
          // Nothing playable at all — never true today, but the card must not
          // render a CTA that dead-ends if the catalogue ever changes.
          <div className="mt-6 flex w-full flex-col items-center gap-3">
            <p className="text-sm text-slate-400">
              More Node.js incidents are being written.
            </p>
            <Link
              href="/missions"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-violet-400/40 bg-gradient-to-r from-violet-600 to-electric-500 px-6 py-3.5 text-base font-semibold text-white shadow-neon transition-transform hover:scale-[1.02]"
            >
              Browse Missions
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
            >
              View Dashboard
            </Link>
          </div>
        )}
      </div>

      {/*
        Rendered only once the provider knows which player this is. Before that
        `authenticated` is false, and telling a signed-in player their progress
        is browser-local would be exactly the inaccuracy this copy replaces.
      */}
      {hydrated && (
        <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
          <p className="text-xs leading-relaxed text-slate-400">{note.primary}</p>
          <p className="mt-1 text-[0.7rem] leading-relaxed text-slate-500">
            {note.secondary}
          </p>
        </div>
      )}
    </div>
  );
}
