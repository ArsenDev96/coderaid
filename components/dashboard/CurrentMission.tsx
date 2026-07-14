import {
  AlertTriangle,
  ArrowRight,
  Braces,
  Database,
  Hexagon,
  Server,
} from "lucide-react";
import { CURRENT_MISSION } from "@/lib/dashboard";

const TAG_ICON: Record<string, typeof Braces> = {
  JavaScript: Braces,
  "Node.js": Hexagon,
  PostgreSQL: Database,
};

const TAG_STYLE: Record<string, string> = {
  JavaScript: "border-amber-400/25 bg-amber-500/10 text-amber-300",
  "Node.js": "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
  PostgreSQL: "border-electric-400/25 bg-electric-500/10 text-electric-300",
};

export function CurrentMission() {
  const m = CURRENT_MISSION;
  const pct = Math.round((m.progressDone / m.progressTotal) * 100);

  return (
    <div className="surface relative overflow-hidden p-5 sm:p-6">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_auto]">
        {/* Left */}
        <div className="min-w-0">
          <div className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-violet-300">
            Current Mission
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <h2 className="text-2xl font-bold text-white">{m.title}</h2>
            <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[0.64rem] font-semibold text-rose-300">
              <AlertTriangle className="h-3 w-3" /> {m.severity}
            </span>
          </div>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-400">
            {m.description}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {m.tags.map((tag) => {
              const Icon = TAG_ICON[tag] ?? Braces;
              return (
                <span
                  key={tag}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${
                    TAG_STYLE[tag] ?? "border-white/10 bg-white/[0.03] text-slate-300"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" /> {tag}
                </span>
              );
            })}
          </div>

          <div className="mt-6">
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="text-slate-400">Mission Progress</span>
              <span className="font-mono text-slate-300">
                {m.progressDone} / {m.progressTotal} steps
              </span>
            </div>
            <div className="h-2 w-full max-w-md overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-electric-400 to-violet-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right: illustration + CTA */}
        <div className="flex flex-col items-center justify-between gap-5 lg:w-64">
          <div className="relative grid h-36 w-full place-items-center overflow-hidden rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-950/30 to-base-900">
            <div
              aria-hidden
              className="absolute inset-0 bg-grid-fade opacity-40 [background-size:18px_18px]"
            />
            <div className="relative flex items-end gap-1.5">
              <Server className="h-16 w-16 text-slate-700" strokeWidth={1} />
              <span className="absolute -right-4 -top-2 grid h-9 w-9 place-items-center rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-400 shadow-[0_0_22px_-4px_rgba(244,63,94,0.7)]">
                <AlertTriangle className="h-5 w-5 animate-pulse-soft" />
              </span>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-violet-400/40 bg-gradient-to-r from-violet-600 to-electric-500 px-5 py-3 text-sm font-semibold text-white shadow-neon transition-transform hover:scale-[1.02]"
          >
            Continue Mission
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
