import { BarChart3, Clock, Zap } from "lucide-react";
import { estimatedRange, type Mission } from "@/lib/missions";

function MetaCard({
  icon,
  tone,
  label,
  value,
  valueTone = "text-white",
}: {
  icon: React.ReactNode;
  tone: string;
  label: string;
  value: string;
  valueTone?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${tone}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {label}
        </div>
        <div className={`mt-0.5 truncate text-lg font-bold ${valueTone}`}>
          {value}
        </div>
      </div>
    </div>
  );
}

export function MissionMetadata({ mission }: { mission: Mission }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetaCard
          icon={<BarChart3 className="h-5 w-5 text-amber-300" />}
          tone="border-amber-400/25 bg-amber-500/10"
          label="Difficulty"
          value={mission.difficulty}
          valueTone="text-amber-300"
        />
        <MetaCard
          icon={<Clock className="h-5 w-5 text-violet-300" />}
          tone="border-violet-400/25 bg-violet-500/10"
          label="Estimated Time"
          value={estimatedRange(mission.minutes)}
        />
      </div>

      <MetaCard
        icon={<Zap className="h-5 w-5 text-violet-300" fill="currentColor" />}
        tone="border-violet-400/25 bg-violet-500/10"
        label="Reward"
        value={`+${mission.xp} XP`}
      />
    </div>
  );
}
