import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BriefingIllustration } from "@/components/missions/briefing/BriefingIllustration";
import { MissionActions } from "@/components/missions/briefing/MissionActions";
import { MissionBriefingHeader } from "@/components/missions/briefing/MissionBriefingHeader";
import { MissionMetadata } from "@/components/missions/briefing/MissionMetadata";
import { MissionObjectives } from "@/components/missions/briefing/MissionObjectives";
import { MissionOverview } from "@/components/missions/briefing/MissionOverview";
import { SkillTags } from "@/components/missions/briefing/SkillTags";
import { MISSIONS, getMission, resolveBriefing } from "@/lib/missions";

type Params = { params: { missionId: string } };

export function generateStaticParams() {
  return MISSIONS.map((m) => ({ missionId: m.id }));
}

export function generateMetadata({ params }: Params): Metadata {
  const mission = getMission(params.missionId);
  if (!mission) return { title: "Mission Briefing — CodeRaid" };
  return {
    title: `${mission.title} — Mission Briefing | CodeRaid`,
    description: mission.description,
  };
}

export default function MissionBriefingPage({ params }: Params) {
  const mission = getMission(params.missionId);
  if (!mission) notFound();

  const briefing = resolveBriefing(mission);

  return (
    <DashboardShell active="Missions">
      <MissionBriefingHeader />

      <div className="relative overflow-hidden rounded-2xl border border-violet-400/50 bg-gradient-to-br from-violet-900/20 to-base-900/60 p-5 shadow-neon sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.15fr_1fr]">
          {/* Primary column: what happened → what to do → act */}
          <div className="flex min-w-0 flex-col gap-6">
            <MissionOverview mission={mission} briefing={briefing} />
            <MissionObjectives steps={briefing.steps} />
            <MissionActions
              missionId={mission.id}
              context={briefing.context}
              locked={mission.status === "locked"}
            />
          </div>

          {/* Support column: scene + at-a-glance metadata */}
          <div className="flex min-w-0 flex-col gap-4">
            <BriefingIllustration />
            <MissionMetadata mission={mission} />
            <SkillTags skills={briefing.skills} />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
