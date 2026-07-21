import { CareerProgress } from "@/components/dashboard/CareerProgress";
import { DailyRaid } from "@/components/dashboard/DailyRaid";
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { NextAction } from "@/components/dashboard/NextAction";
import { RecommendedMissions } from "@/components/dashboard/RecommendedMissions";
import { SkillsSummary } from "@/components/dashboard/SkillsSummary";
import { ClaimProgressBanner } from "@/components/progress/ClaimProgressBanner";

export const metadata = {
  title: "Dashboard — CodeRaid",
  description:
    "Your Node.js debugging HQ: real backend incidents, Node.js skills, XP and ranks.",
};

export default function DashboardPage() {
  return (
    <DashboardShell active="Dashboard" topLeft={<DashboardGreeting />}>
      <div className="flex flex-col gap-6">
        {/* Renders nothing unless this player has a pre-account ledger to
            import — a migration artefact, not a permanent fixture. */}
        <ClaimProgressBanner />
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
