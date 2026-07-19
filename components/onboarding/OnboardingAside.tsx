import { Activity, Crosshair, GraduationCap, TerminalSquare } from "lucide-react";

const HIGHLIGHTS = [
  {
    title: "Debug for Real",
    description:
      "Work realistic Node.js incidents: logs, metrics, traces, and stack dumps.",
    icon: GraduationCap,
  },
  {
    title: "Async Under Pressure",
    description:
      "Event loop stalls, promise cascades, background jobs, and runtime performance.",
    icon: Activity,
  },
  {
    title: "Interview Ready",
    description:
      "Practise the backend reasoning practical Node.js interviews ask for.",
    icon: TerminalSquare,
  },
];

export function OnboardingAside() {
  return (
    <div className="flex flex-col">
      <h1 className="text-4xl font-bold uppercase leading-[1.05] tracking-tight text-white sm:text-5xl">
        Debug Node.js
        <br />
        <span className="text-gradient">Like It&apos;s Production</span>
      </h1>
      <p className="mt-5 max-w-md text-base leading-relaxed text-slate-400">
        Set up your profile and take on your first Node.js incident.{" "}
        <span className="text-slate-200">
          Real logs. Real root causes. Real backend practice.
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
            <div className="text-slate-500">$ coderaid init --node</div>
            <div className="text-emerald-400/80">✓ service logs attached</div>
            <div className="text-electric-400/80">→ awaiting first incident…</div>
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
