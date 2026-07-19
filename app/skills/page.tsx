import { DashboardShell } from "@/components/dashboard/DashboardShell";
import {
  SkillsExplorer,
  SkillRecommendationsButton,
} from "@/components/skills/SkillsExplorer";

export const metadata = {
  title: "Skills — CodeRaid",
  description:
    "Track your Node.js backend skills — async JavaScript, runtime internals, APIs, background jobs and production debugging — and find the incident that trains each one.",
};

export default function SkillsPage() {
  return (
    <DashboardShell active="Skills">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Node.js Skills
          </h1>
          <p className="mt-1.5 text-sm text-slate-400 sm:text-base">
            Async JavaScript, runtime internals, backend APIs and production
            debugging — the skills real Node.js incidents and backend interviews
            actually test.
          </p>
        </div>
        <SkillRecommendationsButton />
      </div>

      <SkillsExplorer />
    </DashboardShell>
  );
}
