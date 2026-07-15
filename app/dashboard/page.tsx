import { CareerProgress } from "@/components/dashboard/CareerProgress";
import { DailyRaid } from "@/components/dashboard/DailyRaid";
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { NextAction } from "@/components/dashboard/NextAction";
import { RecommendedMissions } from "@/components/dashboard/RecommendedMissions";
import { SkillsSummary } from "@/components/dashboard/SkillsSummary";

export const metadata = {
  title: "Dashboard — CodeRaid",
  description: "Your engineering career HQ: missions, XP, skills, and ranks.",
};

export default function DashboardPage() {
  return (
    <DashboardShell active="Dashboard" topLeft={<DashboardGreeting />}>
      <div className="flex flex-col gap-6">
        <NextAction />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <DailyRaid />
          <CareerProgress />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <RecommendedMissions />
          <SkillsSummary />
        </div>
      </div>
    </DashboardShell>
  );
}
