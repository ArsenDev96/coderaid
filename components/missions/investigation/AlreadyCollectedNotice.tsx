import { Link2 } from "lucide-react";

/**
 * Explains the rows on this tool that are marked "Already held".
 *
 * Findings are collected once and belong to the whole mission, so one finding
 * legitimately appears in Logs, in Metrics and in Trace. The rows the player
 * marked carry a green tick; the other rows carrying that finding are shown in
 * a quieter state instead — never a tick, because a checkmark nobody placed
 * reads as the game having answered for them.
 *
 * This names that state where it happens, and only when it happens. In a tool
 * where every collected row was marked right here, there is nothing to explain
 * and the notice does not render. Compare {@link RestoredProgressNotice}, which
 * does the same job for progress restored from a previous visit.
 */
export function AlreadyCollectedNotice({
  rowCount,
  findingCount,
}: {
  /** Rows held from elsewhere — what the player can count on screen. */
  rowCount: number;
  /** Distinct findings behind those rows. Never more than `rowCount`. */
  findingCount: number;
}) {
  if (rowCount < 1) return null;

  return (
    <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
      <Link2
        aria-hidden
        className="mt-px h-4 w-4 shrink-0 text-slate-500"
        strokeWidth={2}
      />
      <p className="text-xs leading-relaxed text-slate-400">
        {rowCount === 1 ? "1 row here belongs" : `${rowCount} rows here belong`}{" "}
        to {findingCount === 1 ? "a finding" : `${findingCount} findings`} you
        already collected in another tool. {rowCount === 1 ? "It is" : "They are"}{" "}
        marked <span className="text-slate-300">Already held</span> rather than
        collected — you have not missed anything, and there is nothing to mark.
      </p>
    </div>
  );
}
