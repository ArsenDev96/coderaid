import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { MissionLegend } from "@/components/missions/MissionLegend";
import { MissionMapBoard } from "@/components/missions/MissionMapBoard";
import { MissionStats } from "@/components/missions/MissionStats";

export const metadata = {
  title: "Mission Map — CodeRaid",
  description:
    "Choose your next engineering challenge. Progress through chapters of real backend missions.",
};

export default function MissionsPage() {
  return (
    <DashboardShell active="Missions">
      {/* Header + stats */}
      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Mission Map
          </h1>
          <p className="mt-1.5 text-sm text-slate-400 sm:text-base">
            Choose your next engineering challenge.
          </p>
        </div>
        <div className="w-full xl:w-[660px]">
          <MissionStats />
        </div>
      </div>

      {/* Board */}
      <div className="mt-8">
        <MissionMapBoard />
      </div>

      {/* Legend */}
      <div className="mt-8">
        <MissionLegend />
      </div>
    </DashboardShell>
  );
}
