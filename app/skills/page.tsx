import { DashboardShell } from "@/components/dashboard/DashboardShell";
import {
  SkillsExplorer,
  SkillRecommendationsButton,
} from "@/components/skills/SkillsExplorer";

export const metadata = {
  title: "Skills — CodeRaid",
  description:
    "Track your engineering skills, see what needs work, and find missions to level up.",
};

export default function SkillsPage() {
  return (
    <DashboardShell active="Skills">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Skills
          </h1>
          <p className="mt-1.5 text-sm text-slate-400 sm:text-base">
            Track your engineering skills and grow into a stronger developer.
          </p>
        </div>
        <SkillRecommendationsButton />
      </div>

      <SkillsExplorer />
    </DashboardShell>
  );
}
