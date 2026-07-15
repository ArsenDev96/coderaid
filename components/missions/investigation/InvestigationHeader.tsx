import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function InvestigationHeader({ missionId }: { missionId: string }) {
  return (
    <div className="mb-6">
      <Link
        href={`/missions/${missionId}/briefing`}
        className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Briefing
      </Link>
      <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
        Investigation Workspace
      </h1>
      <p className="mt-1.5 text-sm text-slate-400 sm:text-base">
        Inspect the system, collect evidence, and identify what changed.
      </p>
    </div>
  );
}
