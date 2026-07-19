"use client";

import Link from "next/link";
import { ArrowRight, Clock, Coffee, Laptop, Search, Target } from "lucide-react";
import { recommendedMission } from "@/lib/availability";
import { useProgress } from "@/components/progress/ProgressProvider";
import { nextActionFor } from "@/lib/dashboard";
import { useMissionResume } from "@/components/missions/map/useMissionResume";
import type { Mission } from "@/lib/missions";

const CTA =
  "group inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-violet-400/40 bg-gradient-to-r from-violet-600 to-violet-500 px-7 py-3.5 text-sm font-semibold text-white shadow-neon transition-transform hover:scale-[1.02] sm:w-auto";

/**
 * The "continue where you left off" card for the mission list. It only ever
 * points at a mission that is playable end to end — when there is none, it
 * degrades to the catalogue instead of a dead link into unwritten content.
 */
export function MissionsNextAction() {
  const { view } = useProgress();
  const mission = recommendedMission(view);

  if (!mission) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
        <div className="flex items-center gap-2 text-slate-400">
          <Target className="h-4 w-4" strokeWidth={2.2} />
          <span className="text-xs font-semibold uppercase tracking-[0.16em]">
            Your Next Action
          </span>
        </div>
        <h2 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-white">
          Nothing to continue right now
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          More Node.js incidents are currently being prepared.
        </p>
        <Link
          href="/missions"
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-6 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-white/25 hover:text-white"
        >
          Browse all missions
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return <NextActionCard mission={mission} />;
}

function NextActionCard({ mission }: { mission: Mission }) {
  const a = nextActionFor(mission);
  // Stage, clue count and time left are read from this mission's saved state,
  // so the card describes the player's actual position in it.
  const resume = useMissionResume(mission.id);
  const pct = Math.round((resume.step / resume.totalSteps) * 100);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-400/50 bg-gradient-to-br from-violet-900/25 to-base-900/60 p-5 shadow-neon sm:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-violet-300">
            <Target className="h-4 w-4" strokeWidth={2.2} />
            <span className="text-xs font-semibold uppercase tracking-[0.16em]">
              Your Next Action
            </span>
          </div>

          <h2 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
            {resume.started ? "Continue" : "Start"}: {a.title}
          </h2>

          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="font-semibold text-white">
              Step {resume.step} of {resume.totalSteps}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">{resume.stage}</span>
          </div>

          <div className="mt-3 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-electric-400"
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-slate-400">
            <span className="flex items-center gap-1.5">
              <Search className="h-4 w-4 text-violet-300" />
              {resume.cluesFound} of {resume.cluesTotal} key clues found
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-slate-500" />~ {resume.timeLeftLabel} left
            </span>
          </div>
        </div>

        {/* Illustration + CTA */}
        <div className="flex shrink-0 flex-col items-center gap-4 sm:flex-row lg:flex-col lg:items-end">
          <div
            aria-hidden
            className="relative hidden h-24 w-40 items-center justify-center sm:flex"
          >
            <div className="absolute inset-0 rounded-2xl bg-violet-600/15 blur-2xl" />
            <Laptop
              className="relative h-16 w-16 text-violet-400/70"
              strokeWidth={1.1}
            />
            <Search
              className="absolute right-8 top-3 h-8 w-8 text-violet-300"
              strokeWidth={1.6}
            />
            <Coffee
              className="absolute bottom-3 right-1 h-6 w-6 text-slate-600"
              strokeWidth={1.4}
            />
          </div>

          <Link href={resume.href} className={CTA}>
            {resume.started ? "Continue Mission" : "Start Mission"}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
