import { Sparkles, Trophy, ShieldCheck } from "lucide-react";

const POINTS = [
  {
    icon: Sparkles,
    accent: "border-violet-400/25 bg-violet-500/10 text-violet-300",
    title: "Earn XP by completing missions",
    detail: "Harder missions give more XP.",
  },
  {
    icon: Trophy,
    accent: "border-amber-400/25 bg-amber-500/10 text-amber-300",
    title: "Climb the ranks",
    detail: "Compete with developers worldwide.",
  },
  {
    icon: ShieldCheck,
    accent: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
    title: "New season every month",
    detail: "Fresh start. New champions.",
  },
];

/** Short orientation panel — how the ranking you're looking at is earned. */
export function LeaderboardAbout() {
  return (
    <section className="surface p-5">
      <h2 className="text-sm font-semibold text-white">About Leaderboards</h2>
      <ul className="mt-4 flex flex-col gap-4">
        {POINTS.map((p) => {
          const Icon = p.icon;
          return (
            <li key={p.title} className="flex items-start gap-3">
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${p.accent}`}
              >
                <Icon className="h-4 w-4" strokeWidth={1.9} />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white">{p.title}</div>
                <div className="text-xs text-slate-400">{p.detail}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
