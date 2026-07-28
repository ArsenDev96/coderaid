"use client";

import { History } from "lucide-react";

/**
 * Says out loud that evidence on screen was collected on a previous visit.
 *
 * Restoring an unfinished investigation is the right behaviour — losing an
 * hour's reading because a tab closed would be worse. Restoring it *silently*
 * is not: the player opens the mission, sees rows already marked Collected, and
 * has no way to tell whether they did that, whether the game did it for them,
 * or whether those rows are the answer. The notice names the restore and gives
 * the way out.
 *
 * Deliberately secondary — a bordered strip above the workspace, not a modal.
 * It reports a fact and offers an action; it does not block the mission.
 */
export function RestoredProgressNotice({
  count,
  onRestart,
}: {
  /** The real number of restored items, never a placeholder. */
  count: number;
  onRestart: () => void;
}) {
  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="flex items-start gap-2.5 text-xs leading-relaxed text-slate-400">
        <History
          aria-hidden
          className="mt-px h-4 w-4 shrink-0 text-slate-500"
          strokeWidth={2}
        />
        <span>
          Investigation progress restored — {count}{" "}
          {count === 1 ? "evidence item" : "evidence items"} already collected.
        </span>
      </p>

      <button
        type="button"
        onClick={onRestart}
        className="shrink-0 self-start rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-white/20 hover:text-white sm:self-auto"
      >
        Restart Investigation
      </button>
    </div>
  );
}
