import { CareerProgressCard } from "@/components/dashboard/CareerProgressCard";
import { CurrentMission } from "@/components/dashboard/CurrentMission";
import { DailyRaid } from "@/components/dashboard/DailyRaid";
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { RecommendedMissions } from "@/components/dashboard/RecommendedMissions";
import { UpNext } from "@/components/dashboard/UpNext";
import { YourSkills } from "@/components/dashboard/YourSkills";
import { DASHBOARD_TIP } from "@/lib/dashboard";

export const metadata = {
  title: "Dashboard — CodeRaid",
  description: "Your engineering career HQ: missions, XP, skills, and ranks.",
};

export default function DashboardPage() {
  return (
    <DashboardShell active="Dashboard" topLeft={<DashboardGreeting />} footerTip={DASHBOARD_TIP}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left / main column */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <CurrentMission />
          <RecommendedMissions />
          <YourSkills />
        </div>

        {/* Right rail */}
        <div className="flex flex-col gap-6">
          <DailyRaid />
          <CareerProgressCard />
          <UpNext />
        </div>
      </div>
    </DashboardShell>
  );
}
