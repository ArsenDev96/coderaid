"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, RotateCcw, ShieldCheck } from "lucide-react";
import { useProgress } from "@/components/progress/ProgressProvider";
import { resetMissionProgress } from "@/lib/settings";
import { ResetProgressDialog } from "./ResetProgressDialog";
import { SectionCard } from "./SectionCard";

/**
 * What "reset" can actually do depends on where progress lives.
 *
 * Signed out, it still clears everything: the ledger is local. Signed in, the
 * ledger is derived from an append-only run history in Postgres, so this sweep
 * can only clear the local *stage* state — saved picks, run telemetry, cached
 * grades — which is what lets a mission be replayed from the briefing. The
 * recorded runs, and the XP earned from them, survive by design.
 *
 * The copy says so rather than promising a reset that will not happen. A
 * control that cannot honour its label is worse than no control.
 */
export function ProgressSection() {
  const router = useRouter();
  const { refresh, authenticated } = useProgress();
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);

  function reset() {
    // The sweep covers the whole `coderaid:` namespace except the profile and
    // preferences.
    resetMissionProgress();
    setConfirming(false);
    setDone(true);
    // Re-resolve progress so the mission states held in the provider update
    // immediately, in this tab and every other.
    refresh();
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
                {authenticated ? "Clear saved mission state" : "Reset mission progress"}
              </div>
              <p className="text-xs text-slate-500">
                {authenticated
                  ? "Clears your saved investigation, diagnosis and fix for every mission so you can replay from the briefing. Recorded runs and the XP you earned from them are kept."
                  : "This will reset all mission progress and cannot be undone."}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3 sm:justify-end">
            {done && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
                {authenticated ? "Saved state cleared" : "Progress reset"}
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
              {authenticated ? "Clear Saved State" : "Reset Progress"}
            </button>
          </div>
        </div>
      </SectionCard>

      {confirming && (
        <ResetProgressDialog
          onConfirm={reset}
          onClose={() => setConfirming(false)}
          authenticated={authenticated}
        />
      )}
    </>
  );
}
