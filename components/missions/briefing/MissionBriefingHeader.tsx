import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function MissionBriefingHeader() {
  return (
    <div className="mb-6">
      <Link
        href="/missions"
        className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Missions
      </Link>
      <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
        Mission Briefing
      </h1>
      <p className="mt-1.5 text-sm text-slate-400 sm:text-base">
        Review the incident, understand the objectives, and start your
        investigation.
      </p>
    </div>
  );
}
