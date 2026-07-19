import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Trophy } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ResultsWorkspace } from "@/components/missions/results/ResultsWorkspace";
import { RESULT_MISSION_IDS, getResult } from "@/lib/results";
import { MISSIONS, getMission } from "@/lib/missions";

type Params = { params: { missionId: string } };

export function generateStaticParams() {
  return MISSIONS.map((m) => ({ missionId: m.id }));
}

export function generateMetadata({ params }: Params): Metadata {
  const mission = getMission(params.missionId);
  return {
    title: mission
      ? `${mission.title} — Results | CodeRaid`
      : "Results — CodeRaid",
  };
}

export default function ResultsPage({ params }: Params) {
  const mission = getMission(params.missionId);
  if (!mission) notFound();

  const result = getResult(mission.id);

  // Results content is authored per mission — the score, lessons and rewards
  // belong to that mission's scenario, so they can't be derived.
  if (!result) {
    const playable = RESULT_MISSION_IDS.map(getMission).filter(
      (m): m is NonNullable<typeof m> => Boolean(m) && m!.id !== mission.id,
    );

    return (
      <DashboardShell active="Missions">
        <div className="mx-auto max-w-2xl py-10 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-violet-400/40 bg-violet-500/10 text-violet-200 shadow-neon">
            <Trophy className="h-7 w-7" strokeWidth={1.8} />
          </span>

          <h1 className="mt-5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Results: {mission.title}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400">
            The results summary for this mission is still being written — your
            progress is saved.
            {playable.length > 0 && (
              <>
                {" "}
                Try{" "}
                {playable.map((m, i) => (
                  <span key={m.id}>
                    {i > 0 && (i === playable.length - 1 ? " or " : ", ")}
                    <Link
                      href={`/missions/${m.id}/results`}
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
              href={`/missions/${mission.id}/verification`}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-6 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-white/25 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Verification
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

  // Grading, crediting and the "what's next" link all depend on what this
  // player actually did, so they resolve in the workspace after hydration.
  return (
    <DashboardShell active="Missions">
      <ResultsWorkspace mission={mission} config={result} />
    </DashboardShell>
  );
}
