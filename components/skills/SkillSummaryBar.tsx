"use client";

import { Target, TrendingUp, Trophy } from "lucide-react";
import { useProgress } from "@/components/progress/ProgressProvider";
import { skillsSummary } from "@/lib/skills";

/** One card, a few compact stats — not a wall of statistic tiles. */
export function SkillSummaryBar() {
  const { ledger } = useProgress();
  const s = skillsSummary(ledger);
  const circumference = 2 * Math.PI * 26;
  const dash = (s.overall / 100) * circumference;

  return (
    <div className="surface grid grid-cols-1 gap-6 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
      {/* Overall ring */}
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 64 64" className="h-16 w-16 shrink-0 -rotate-90" aria-hidden>
          <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
          <circle
            cx="32"
            cy="32"
            r="26"
            fill="none"
            stroke="#a78bfa"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
          />
          <text
            x="32"
            y="32"
            transform="rotate(90 32 32)"
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-white text-[0.95rem] font-bold"
          >
            {s.overall}%
          </text>
        </svg>
        <div className="min-w-0">
          <div className="text-xs text-slate-400">Overall Skills</div>
          <div className="text-lg font-bold text-violet-300">{s.overallLabel}</div>
          <div className="text-xs text-slate-500">
            {s.mastered} of {s.total} skills mastered
          </div>
        </div>
      </div>

      {/* Skills the player has actually put XP into */}
      <Stat
        icon={<TrendingUp className="h-5 w-5 text-emerald-300" />}
        tone="border-emerald-400/25 bg-emerald-500/10"
        label="Skills Started"
        value={`${s.started} of ${s.total}`}
        valueClass="text-emerald-300"
        sub="have earned XP"
      />

      {/* Top category */}
      <Stat
        icon={<Trophy className="h-5 w-5 text-electric-300" />}
        tone="border-electric-400/25 bg-electric-500/10"
        label="Top Category"
        value={s.topCategory.name}
        valueClass="text-electric-300"
        sub={`${s.topAverage}% average`}
      />

      {/* Focus area */}
      <Stat
        icon={<Target className="h-5 w-5 text-amber-300" />}
        tone="border-amber-400/25 bg-amber-500/10"
        label="Focus Area"
        value={s.focusCategory.name}
        valueClass="text-amber-300"
        sub="Recommended for you"
      />
    </div>
  );
}

function Stat({
  icon,
  tone,
  label,
  value,
  valueClass,
  sub,
}: {
  icon: React.ReactNode;
  tone: string;
  label: string;
  value: string;
  valueClass: string;
  sub: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${tone}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-xs text-slate-400">{label}</div>
        <div className={`truncate text-base font-bold ${valueClass}`}>{value}</div>
        <div className="text-xs text-slate-500">{sub}</div>
      </div>
    </div>
  );
}
