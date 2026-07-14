import { LEGEND } from "@/lib/missions";

export function MissionLegend() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-white/[0.06] pt-5">
      {LEGEND.map((item) => {
        const Icon = item.icon;
        return (
          <span
            key={item.label}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400"
          >
            <Icon className={`h-3.5 w-3.5 ${item.className}`} fill="currentColor" />
            {item.label}
          </span>
        );
      })}
    </div>
  );
}
