import { EVIDENCE_SOURCE_META, type EvidenceItem } from "@/lib/investigation";

/**
 * One collected finding in the evidence rail.
 *
 * Every card is rendered identically. It used to stamp a violet **Key** badge
 * on items whose `isKeyEvidence` flag was set, which turned the rail into an
 * answer key: mark a row, and the badge told you whether it was one of the
 * findings the mission is built around before you had reasoned about it at all.
 * Nothing here now varies with what the mission considers correct — the only
 * thing that distinguishes two cards is which tool they came from.
 */
export function EvidenceCard({ item }: { item: EvidenceItem }) {
  const source = EVIDENCE_SOURCE_META[item.source];
  const Icon = source.icon;

  return (
    <li className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
      <div className="flex items-start gap-3">
        <span
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-md border ${source.cls}`}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
        </span>

        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold leading-snug text-slate-100">
            {item.title}
          </h4>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            {item.description}
          </p>
          <p className="mt-1.5 text-[0.6rem] font-medium uppercase tracking-[0.1em] text-slate-600">
            From {source.label}
          </p>
        </div>
      </div>
    </li>
  );
}
