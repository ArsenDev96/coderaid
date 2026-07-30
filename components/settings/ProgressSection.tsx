"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, RotateCcw, ShieldCheck, TriangleAlert } from "lucide-react";
import { useProgress } from "@/components/progress/ProgressProvider";
import { resetServerProgress } from "@/lib/ledger-client";
import { resetMissionProgress } from "@/lib/settings";
import { ResetProgressDialog, type ResetVariant } from "./ResetProgressDialog";
import { SectionCard } from "./SectionCard";

/**
 * What "reset" can actually do depends on where progress lives, and for a
 * signed-in player there are now **two different things it could mean**.
 *
 * Signed out, the ledger is local, so one sweep clears everything.
 *
 * Signed in, the ledger is derived from an append-only run history in Postgres.
 * The local sweep can only clear the saved *stage* state — picks, telemetry,
 * cached grades — which is what lets a mission be replayed from its briefing.
 * Starting the account over is a separate, server-side action (§12 item 7): it
 * stamps a tombstone that every derivation reads past, so the numbers go to
 * zero while the runs themselves stay recorded.
 *
 * They are deliberately two controls rather than one. One clears working state
 * and is nearly free; the other zeroes everything the player has earned.
 * Collapsing them into a single button would make the safe action feel
 * dangerous and the dangerous one easy to reach by habit.
 */
export function ProgressSection() {
  const router = useRouter();
  const { refresh, adopt, authenticated } = useProgress();
  const [confirming, setConfirming] = useState<ResetVariant | null>(null);
  const [done, setDone] = useState<ResetVariant | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  /** The local sweep: the whole `coderaid:` namespace bar profile and settings. */
  function clearLocal() {
    resetMissionProgress();
    setConfirming(null);
    setDone(authenticated ? "saved-state" : "progress");
    // Re-resolve progress so the mission states held in the provider update
    // immediately, in this tab and every other.
    refresh();
    router.refresh();
  }

  /**
   * The account reset. Clears the local state too — leaving a confirmed
   * diagnosis behind for a mission the server now considers unplayed is exactly
   * the stale-state mismatch the rest of this app works to avoid.
   */
  async function resetAccount() {
    setBusy(true);
    setFailed(false);
    const result = await resetServerProgress();
    setBusy(false);

    if (result.status !== "ok") {
      // The dialog stays open on failure: closing it would read as success.
      setFailed(true);
      return;
    }

    resetMissionProgress();
    adopt(result.ledger);
    setConfirming(null);
    setDone("account");
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
            {done && done !== "account" && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
                {authenticated ? "Saved state cleared" : "Progress reset"}
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setDone(null);
                setConfirming(authenticated ? "saved-state" : "progress");
              }}
              className="w-full rounded-xl border border-rose-400/40 bg-rose-500/[0.08] px-5 py-2.5 text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-500/20 sm:w-auto"
            >
              {authenticated ? "Clear Saved State" : "Reset Progress"}
            </button>
          </div>
        </div>

        {/* The account reset. Only offered when there is a server-side account
            to reset — signed out, the control above already does everything. */}
        {authenticated && (
          <div className="mt-4 flex flex-col gap-3 border-t border-white/[0.06] pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-rose-400/40 bg-rose-500/15 text-rose-300">
                <TriangleAlert className="h-4 w-4" strokeWidth={1.9} />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white">
                  Start your account over
                </div>
                <p className="text-xs text-slate-500">
                  Sets your XP, level, rank, streak, skills and achievements back
                  to zero, and makes every incident unplayed. Your completed runs
                  stay recorded but stop counting. This cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3 sm:justify-end">
              {done === "account" && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  Account reset
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setDone(null);
                  setFailed(false);
                  setConfirming("account");
                }}
                className="w-full rounded-xl border border-rose-400/50 bg-rose-500/15 px-5 py-2.5 text-sm font-semibold text-rose-200 transition-colors hover:bg-rose-500/25 sm:w-auto"
              >
                Reset Everything
              </button>
            </div>
          </div>
        )}

      </SectionCard>

      {confirming && (
        <ResetProgressDialog
          variant={confirming}
          busy={busy}
          error={failed}
          onConfirm={confirming === "account" ? resetAccount : clearLocal}
          onClose={() => {
            if (busy) return;
            setConfirming(null);
            setFailed(false);
          }}
        />
      )}
    </>
  );
}
