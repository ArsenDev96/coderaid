"use client";

import { useState } from "react";
import { Check, Loader2, Upload } from "lucide-react";
import { PLAYABLE_MISSION_IDS } from "@/lib/availability";
import { claimLocalLedger } from "@/lib/ledger-client";
import { getMission } from "@/lib/missions";
import { completedMissionIds } from "@/lib/progress";
import { resetMissionProgress } from "@/lib/settings";
import { useProgress } from "./ProgressProvider";

/**
 * The one-time offer to import progress earned before accounts existed.
 *
 * Shown only to a signed-in player who actually has a pre-account ledger and
 * has never claimed — everyone else never learns this existed, which is right:
 * it is a migration artefact, not a feature.
 *
 * It says what will happen in the terms the player cares about (how many
 * missions, how much XP) and imports on request rather than silently. Silently
 * adopting a browser's word for someone's history would be the one place this
 * app took a client's claim about progress at face value without saying so.
 */
export function ClaimProgressBanner() {
  const { claimable, adopt } = useProgress();
  const [state, setState] = useState<"idle" | "working" | "done" | "failed">("idle");

  // The confirmation is checked first on purpose: a successful import clears
  // `claimable`, so testing that first would unmount this component in the same
  // render that succeeded and the player would never see it happen.
  if (state === "done") {
    return (
      <div
        role="status"
        className="flex items-center gap-2.5 rounded-xl border border-emerald-400/25 bg-emerald-500/[0.08] px-4 py-3 text-sm text-emerald-100"
      >
        <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} />
        Your earlier progress is now on your account.
      </div>
    );
  }

  if (!claimable) return null;

  /**
   * What will actually be imported — not what the local ledger contains.
   *
   * The server drops anything that isn't a real, playable mission, so counting
   * raw entries would promise more than the import can deliver. A ledger
   * carrying a renamed or removed mission id should not advertise it.
   */
  const importable = completedMissionIds(claimable).filter(
    (id) => PLAYABLE_MISSION_IDS.includes(id) && getMission(id),
  );
  const missions = importable.length;
  const xp = importable.reduce(
    (sum, id) =>
      sum + Math.round(((getMission(id)?.xp ?? 0) * (claimable.missions[id]?.score ?? 0)) / 100),
    0,
  );

  // Nothing survives the filter, so there is nothing to offer.
  if (missions === 0) return null;

  async function claim() {
    if (!claimable) return;
    setState("working");
    const result = await claimLocalLedger(claimable);

    if (result.status !== "ok") {
      setState("failed");
      return;
    }

    // The local ledger has served its purpose. Clearing it means there is
    // exactly one place progress lives from here on, and no stale copy to
    // reappear if the player ever signs out.
    resetMissionProgress();
    adopt(result.ledger, true);
    setState("done");
  }

  return (
    <div className="rounded-2xl border border-violet-400/25 bg-violet-500/[0.08] p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span
            aria-hidden
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-violet-400/30 bg-violet-500/10 text-violet-200"
          >
            <Upload className="h-4 w-4" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white">
              Bring your earlier progress with you
            </h3>
            <p className="mt-1 max-w-lg text-xs leading-relaxed text-slate-300">
              This browser has{" "}
              <strong className="font-semibold text-white">
                {missions} completed {missions === 1 ? "incident" : "incidents"}
              </strong>{" "}
              worth {xp} XP from before you had an account. Adding
              them to your account keeps your level, skills and streak. You can
              only do this once, and replaying a mission later can still improve
              its score.
            </p>
            {state === "failed" && (
              <p role="alert" className="mt-2 text-xs font-medium text-rose-300">
                That didn&apos;t go through. Your local progress is untouched —
                try again.
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={claim}
          disabled={state === "working"}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-violet-400/40 bg-gradient-to-r from-violet-600 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100"
        >
          {state === "working" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.2} />
              Importing…
            </>
          ) : (
            "Import progress"
          )}
        </button>
      </div>
    </div>
  );
}
