import Link from "next/link";
import { ChevronRight, Trophy } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { AchievementsExplorer } from "@/components/achievements/AchievementsExplorer";

export const metadata = {
  title: "Achievements — CodeRaid",
  description:
    "Track your milestones, streaks, and Node.js debugging accomplishments.",
};

export default function AchievementsPage() {
  return (
    <DashboardShell active="Achievements">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Achievements
          </h1>
          <p className="mt-1.5 text-sm text-slate-400 sm:text-base">
            Track your milestones, streaks, and Node.js debugging accomplishments.
          </p>
        </div>

        <Link
          href="/leaderboards"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/[0.06] px-4 py-2.5 text-sm font-semibold text-violet-200 transition-colors hover:border-violet-400/50"
        >
          <Trophy className="h-4 w-4" strokeWidth={2.1} />
          View Leaderboards
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <AchievementsExplorer />
    </DashboardShell>
  );
}
