import { Star } from "lucide-react";
import { EVIDENCE_SOURCE_META, type EvidenceItem } from "@/lib/investigation";

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
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-semibold leading-snug text-slate-100">
              {item.title}
            </h4>
            {item.isKeyEvidence && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-violet-400/30 bg-violet-500/10 px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.1em] text-violet-200">
                <Star className="h-2.5 w-2.5" strokeWidth={2.5} />
                Key
              </span>
            )}
          </div>
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
