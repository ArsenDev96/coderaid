import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { LeaderboardsExplorer } from "@/components/leaderboards/LeaderboardsExplorer";

export const metadata = {
  title: "Leaderboards — CodeRaid",
  description:
    "Compare your progress with other developers and see where you rank.",
};

export default function LeaderboardsPage() {
  return (
    <DashboardShell active="Leaderboards">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Leaderboards
        </h1>
        <p className="mt-1.5 text-sm text-slate-400 sm:text-base">
          Compete with developers and climb the ranks.
        </p>
      </div>

      <LeaderboardsExplorer />
    </DashboardShell>
  );
}
