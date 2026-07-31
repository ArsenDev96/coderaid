import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Search } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { InvestigationHeader } from "@/components/missions/investigation/InvestigationHeader";
import { InvestigationWorkspace } from "@/components/missions/investigation/InvestigationWorkspace";
import {
  INVESTIGATABLE_MISSION_IDS,
  getInvestigation,
} from "@/lib/investigation";
import { MISSIONS, getMission, missionStep, resolveBriefing } from "@/lib/missions";

type Params = { params: Promise<{ missionId: string }> };

export function generateStaticParams() {
  return MISSIONS.map((m) => ({ missionId: m.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { missionId } = await params;
  const mission = getMission(missionId);
  return {
    title: mission
      ? `${mission.title} — Investigation | CodeRaid`
      : "Investigation — CodeRaid",
  };
}

export default async function InvestigationPage({ params }: Params) {
  const { missionId } = await params;
  const mission = getMission(missionId);
  if (!mission) notFound();

  const investigation = getInvestigation(mission.id);
  const briefing = resolveBriefing(mission);
  const investigationStep = missionStep("Investigation");

  // Investigation content is authored per mission — logs, code and traces can't
  // be derived from the mission model, so missions without an authored config
  // say so rather than rendering an empty workspace.
  if (!investigation) {
    const playable = INVESTIGATABLE_MISSION_IDS.map(getMission).filter(
      (m): m is NonNullable<typeof m> => Boolean(m) && m!.id !== mission.id,
    );

    return (
      <DashboardShell active="Missions">
        <div className="mx-auto max-w-2xl py-10 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-violet-400/40 bg-violet-500/10 text-violet-200 shadow-neon">
            <Search className="h-7 w-7" strokeWidth={1.8} />
          </span>

          <h1 className="mt-5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Investigation: {mission.title}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400">
            The investigation workspace for this mission is still being written.
            {playable.length > 0 && (
              <>
                {" "}
                Try{" "}
                {playable.map((m, i) => (
                  <span key={m.id}>
                    {i > 0 && (i === playable.length - 1 ? " or " : ", ")}
                    <Link
                      href={`/missions/${m.id}/investigation`}
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
              href={`/missions/${mission.id}/briefing`}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-6 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-white/25 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Briefing
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

  return (
    <DashboardShell active="Missions">
      <InvestigationHeader missionId={mission.id} />
      <InvestigationWorkspace
        investigation={investigation}
        title={mission.title}
        severity={briefing.severity}
        step={investigationStep.step}
        totalSteps={investigationStep.totalSteps}
        phase="Investigate"
      />
    </DashboardShell>
  );
}
