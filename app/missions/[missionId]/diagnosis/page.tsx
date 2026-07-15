import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Stethoscope } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { MISSIONS, getMission } from "@/lib/missions";

type Params = { params: { missionId: string } };

export function generateStaticParams() {
  return MISSIONS.map((m) => ({ missionId: m.id }));
}

export function generateMetadata({ params }: Params): Metadata {
  const mission = getMission(params.missionId);
  return {
    title: mission
      ? `${mission.title} — Diagnosis | CodeRaid`
      : "Diagnosis — CodeRaid",
  };
}

export default function DiagnosisPage({ params }: Params) {
  const mission = getMission(params.missionId);
  if (!mission) notFound();

  return (
    <DashboardShell active="Missions">
      <div className="mx-auto max-w-2xl py-10 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-violet-400/40 bg-violet-500/10 text-violet-200 shadow-neon">
          <Stethoscope className="h-7 w-7" strokeWidth={1.8} />
        </span>

        <h1 className="mt-5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Diagnosis: {mission.title}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400">
          Naming the root cause from your collected evidence is the next step in
          the mission flow. This route reserves its place — your investigation
          progress is saved.
        </p>

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href={`/missions/${mission.id}/investigation`}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-6 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-white/25 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Investigation
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
