"use client";

import Link from "next/link";
import { ArrowRight, Stethoscope } from "lucide-react";
import { completeStage } from "@/lib/run";

export function InvestigationActions({
  missionId,
  keyCollected,
  keyRequired,
}: {
  missionId: string;
  keyCollected: number;
  keyRequired: number;
}) {
  const unlocked = keyCollected >= keyRequired;
  const remaining = keyRequired - keyCollected;

  return (
    // Stacked layouts scroll the rail out of reach — keep the exit visible there.
    <div className="max-xl:sticky max-xl:bottom-3 max-xl:z-20">
      <div className="rounded-2xl border border-white/[0.06] bg-base-900/90 p-3 backdrop-blur xl:border-transparent xl:bg-transparent xl:p-0 xl:backdrop-blur-none">
        {unlocked ? (
          <Link
            href={`/missions/${missionId}/diagnosis`}
            onClick={() => completeStage(missionId, "Investigation")}
            className="group inline-flex w-full items-center justify-center gap-2.5 rounded-xl border border-violet-400/40 bg-gradient-to-r from-violet-600 to-violet-500 px-6 py-3.5 text-sm font-semibold text-white shadow-neon transition-transform hover:scale-[1.02]"
          >
            <Stethoscope className="h-4 w-4" strokeWidth={2.2} />
            Continue to Diagnosis
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ) : (
          <button
            type="button"
            disabled
            aria-describedby="diagnosis-gate-hint"
            className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-6 py-3.5 text-sm font-semibold text-slate-500"
          >
            <Stethoscope className="h-4 w-4" strokeWidth={2.2} />
            Continue to Diagnosis
          </button>
        )}

        <p
          id="diagnosis-gate-hint"
          className="mt-2.5 text-center text-xs text-slate-500"
        >
          {unlocked
            ? "You have enough evidence — continue when you are ready."
            : `Collect at least ${keyRequired} key clues to continue. ${remaining} to go.`}
        </p>
      </div>
    </div>
  );
}
