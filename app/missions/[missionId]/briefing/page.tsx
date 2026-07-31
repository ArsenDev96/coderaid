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
import {
  blockedReason,
  canStart,
  missionAvailability,
} from "@/lib/availability";

type Params = { params: Promise<{ missionId: string }> };

export function generateStaticParams() {
  return MISSIONS.map((m) => ({ missionId: m.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { missionId } = await params;
  const mission = getMission(missionId);
  if (!mission) return { title: "Mission Briefing — CodeRaid" };
  return {
    title: `${mission.title} — Mission Briefing | CodeRaid`,
    description: mission.description,
  };
}

export default async function MissionBriefingPage({ params }: Params) {
  const { missionId } = await params;
  const mission = getMission(missionId);
  if (!mission) notFound();

  const briefing = resolveBriefing(mission);
  const availability = missionAvailability(mission);

  // The single gate that stops a player reaching an unwritten stage: the CTA
  // only links into /investigation when the whole flow is authored.
  const blocked = canStart(mission)
    ? null
    : (blockedReason(mission) ?? "This mission is not available yet.");

  return (
    <DashboardShell active="Missions">
      <MissionBriefingHeader />

      <div className="relative overflow-hidden rounded-2xl border border-violet-400/50 bg-gradient-to-br from-violet-900/20 to-base-900/60 p-5 shadow-neon sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.15fr_1fr]">
          {/* Primary column: what happened → what to do → act */}
          <div className="flex min-w-0 flex-col gap-6">
            <MissionOverview
              mission={mission}
              briefing={briefing}
              availability={availability}
            />
            <MissionObjectives steps={briefing.steps} />
            <MissionActions
              missionId={mission.id}
              context={briefing.context}
              availability={availability}
              blockedReason={blocked}
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
