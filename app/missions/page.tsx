import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { MissionsHeader } from "@/components/missions/MissionsHeader";
import { MissionBrowser } from "@/components/missions/MissionBrowser";
import { MissionsNextAction } from "@/components/missions/MissionsNextAction";

export const metadata = {
  title: "Missions — CodeRaid",
  description:
    "Debug real Node.js backend incidents: async behaviour, API services and workers under load.",
};

export default function MissionsPage() {
  return (
    <DashboardShell active="Missions">
      <MissionsHeader active="list" />
      <MissionBrowser nextAction={<MissionsNextAction />} />
    </DashboardShell>
  );
}
