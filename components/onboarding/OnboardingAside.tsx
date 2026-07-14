import { Crosshair, GraduationCap, TerminalSquare, Trophy } from "lucide-react";

const HIGHLIGHTS = [
  {
    title: "Learn by Doing",
    description: "Solve real-world incidents and level up your skills.",
    icon: GraduationCap,
  },
  {
    title: "Rank Up",
    description: "Complete missions, earn XP, and unlock new ranks.",
    icon: Trophy,
  },
  {
    title: "Build Your Career",
    description: "From Junior Engineer to Software Architect.",
    icon: TerminalSquare,
  },
];

export function OnboardingAside() {
  return (
    <div className="flex flex-col">
      <h1 className="text-4xl font-bold uppercase leading-[1.05] tracking-tight text-white sm:text-5xl">
        Your Journey
        <br />
        <span className="text-gradient">Starts Now</span>
      </h1>
      <p className="mt-5 max-w-md text-base leading-relaxed text-slate-400">
        Create your engineer profile and join the raid.{" "}
        <span className="text-slate-200">
          Real incidents. Real skills. Real growth.
        </span>
      </p>

      {/* Decorative workspace / target visual */}
      <div className="relative mt-8 hidden overflow-hidden rounded-2xl border border-white/[0.07] bg-base-900/60 p-6 sm:block">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-grid-fade opacity-40 [background-size:26px_26px] [mask-image:radial-gradient(60%_60%_at_50%_50%,black,transparent)]"
        />
        <div className="relative flex items-center gap-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-600/30 to-electric-500/20 shadow-neon">
            <Crosshair className="h-8 w-8 animate-pulse-soft text-violet-300" strokeWidth={1.6} />
          </span>
          <div className="min-w-0 font-mono text-xs leading-relaxed text-slate-400">
            <div className="text-slate-500">$ coderaid init --engineer</div>
            <div className="text-emerald-400/80">✓ workspace provisioned</div>
            <div className="text-electric-400/80">→ awaiting first mission…</div>
          </div>
        </div>
      </div>

      {/* Highlight cards */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {HIGHLIGHTS.map((h) => {
          const Icon = h.icon;
          return (
            <div key={h.title} className="surface p-4">
              <span className="grid h-9 w-9 place-items-center rounded-lg border border-violet-500/25 bg-violet-500/10 text-violet-300">
                <Icon className="h-5 w-5" strokeWidth={1.9} />
              </span>
              <h3 className="mt-3 text-xs font-semibold uppercase tracking-wide text-white">
                {h.title}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                {h.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
