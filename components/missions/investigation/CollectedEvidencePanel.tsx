import { Search } from "lucide-react";
import type { EvidenceItem } from "@/lib/investigation";
import { EvidenceCard } from "./EvidenceCard";

export function CollectedEvidencePanel({
  items,
  keyCollected,
  keyRequired,
}: {
  items: EvidenceItem[];
  keyCollected: number;
  keyRequired: number;
}) {
  return (
    <section
      aria-labelledby="collected-evidence-heading"
      className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3
          id="collected-evidence-heading"
          className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-violet-300"
        >
          Collected Evidence
        </h3>
        <span
          className="shrink-0 font-mono text-xs text-slate-500"
          aria-label={`${keyCollected} of ${keyRequired} key clues collected`}
        >
          {keyCollected}/{keyRequired} key
        </span>
      </div>

      {items.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-white/[0.08] p-6 text-center">
          <Search
            aria-hidden
            className="mx-auto h-6 w-6 text-slate-600"
            strokeWidth={1.8}
          />
          <p className="mt-2.5 text-xs leading-relaxed text-slate-500">
            Nothing collected yet. Inspect a tool, select what looks suspicious,
            and mark it as evidence.
          </p>
        </div>
      ) : (
        <ul
          aria-live="polite"
          className="mt-4 flex flex-col gap-2.5"
        >
          {items.map((item) => (
            <EvidenceCard key={item.id} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}
