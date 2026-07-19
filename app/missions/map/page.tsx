import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { MissionsHeader } from "@/components/missions/MissionsHeader";
import { MissionMapView } from "@/components/missions/map/MissionMapView";

export const metadata = {
  title: "Mission Map — CodeRaid",
  description:
    "Your Node.js debugging path: what you've completed, what's in progress, and what's still being prepared.",
};

export default function MissionMapPage({
  searchParams,
}: {
  searchParams: { mission?: string };
}) {
  return (
    <DashboardShell active="Missions">
      <MissionsHeader active="map" />
      <MissionMapView initialMissionId={searchParams.mission} />
    </DashboardShell>
  );
}
