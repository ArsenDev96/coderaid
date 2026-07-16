import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Wrench } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { FixWorkspace } from "@/components/missions/fix/FixWorkspace";
import { FIXABLE_MISSION_IDS, getFix } from "@/lib/fix";
import { MISSIONS, getMission, missionStep } from "@/lib/missions";

type Params = { params: { missionId: string } };

export function generateStaticParams() {
  return MISSIONS.map((m) => ({ missionId: m.id }));
}

export function generateMetadata({ params }: Params): Metadata {
  const mission = getMission(params.missionId);
  return {
    title: mission ? `${mission.title} — Fix | CodeRaid` : "Fix — CodeRaid",
  };
}

export default function FixPage({ params }: Params) {
  const mission = getMission(params.missionId);
  if (!mission) notFound();

  const fix = getFix(mission.id);

  // Fix content is authored per mission — the options and their reasoning only
  // make sense against that mission's root cause, so they can't be derived.
  if (!fix) {
    const playable = FIXABLE_MISSION_IDS.map(getMission).filter(
      (m): m is NonNullable<typeof m> => Boolean(m) && m!.id !== mission.id,
    );

    return (
      <DashboardShell active="Missions">
        <div className="mx-auto max-w-2xl py-10 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-violet-400/40 bg-violet-500/10 text-violet-200 shadow-neon">
            <Wrench className="h-7 w-7" strokeWidth={1.8} />
          </span>

          <h1 className="mt-5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Fix: {mission.title}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400">
            The fix step for this mission is still being written — your diagnosis
            is saved.
            {playable.length > 0 && (
              <>
                {" "}
                Try{" "}
                {playable.map((m, i) => (
                  <span key={m.id}>
                    {i > 0 && (i === playable.length - 1 ? " or " : ", ")}
                    <Link
                      href={`/missions/${m.id}/fix`}
                      className="font-medium text-violet-300 underline-offset-4 hover:underline"
                    >
                      {m.title}
                    </Link>
                  </span>
                ))}{" "}
                to play the full loop.
              </>
            )}
          </p>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href={`/missions/${mission.id}/diagnosis`}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-6 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-white/25 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Diagnosis
            </Link>
            <Link
              href="/missions"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-400/40 bg-gradient-to-r from-violet-600 to-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-neon transition-transform hover:scale-[1.02]"
            >
              All Missions
            </Link>
          </div>
        </div>
      </DashboardShell>
    );
  }

  const { step, totalSteps } = missionStep("Fix");

  return (
    <DashboardShell active="Missions">
      <div className="mb-6">
        <Link
          href={`/missions/${mission.id}/diagnosis`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Diagnosis
        </Link>
      </div>

      <FixWorkspace
        config={fix}
        title={mission.title}
        description="You've identified the root cause. Now implement the fix to resolve the issue and improve performance."
        step={step}
        totalSteps={totalSteps}
      />
    </DashboardShell>
  );
}
