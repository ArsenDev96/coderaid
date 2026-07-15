import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { MissionBrowser } from "@/components/missions/MissionBrowser";
import { MissionsNextAction } from "@/components/missions/MissionsNextAction";

export const metadata = {
  title: "Missions — CodeRaid",
  description:
    "Choose your next engineering challenge and level up through real backend missions.",
};

export default function MissionsPage() {
  return (
    <DashboardShell active="Missions">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Missions
        </h1>
        <p className="mt-1.5 text-sm text-slate-400 sm:text-base">
          Choose your next engineering challenge and level up.
        </p>
      </div>

      <MissionBrowser nextAction={<MissionsNextAction />} />
    </DashboardShell>
  );
}
