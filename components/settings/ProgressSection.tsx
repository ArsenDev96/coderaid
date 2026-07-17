"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, RotateCcw, ShieldCheck } from "lucide-react";
import { resetMissionProgress } from "@/lib/settings";
import { ResetProgressDialog } from "./ResetProgressDialog";
import { SectionCard } from "./SectionCard";

export function ProgressSection() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);

  function reset() {
    resetMissionProgress();
    setConfirming(false);
    setDone(true);
    // Other pages read this progress on render; refresh so nothing downstream
    // keeps showing a mission as resumable after it's been cleared.
    router.refresh();
  }

  return (
    <>
      <SectionCard
        icon={ShieldCheck}
        title="Progress"
        description="Manage your mission progress."
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-rose-400/25 bg-rose-500/10 text-rose-300">
              <RotateCcw className="h-4 w-4" strokeWidth={1.9} />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white">
                Reset mission progress
              </div>
              <p className="text-xs text-slate-500">
                This will reset all mission progress and cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3 sm:justify-end">
            {done && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
                Progress reset
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setDone(false);
                setConfirming(true);
              }}
              className="w-full rounded-xl border border-rose-400/40 bg-rose-500/[0.08] px-5 py-2.5 text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-500/20 sm:w-auto"
            >
              Reset Progress
            </button>
          </div>
        </div>
      </SectionCard>

      {confirming && (
        <ResetProgressDialog
          onConfirm={reset}
          onClose={() => setConfirming(false)}
        />
      )}
    </>
  );
}
