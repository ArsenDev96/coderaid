import { AlertTriangle, MonitorDot, Search, Server } from "lucide-react";

/**
 * Decorative incident scene (server rack + alert + monitor + magnifier).
 * Purely visual — hidden from assistive tech.
 */
export function BriefingIllustration() {
  return (
    <div
      aria-hidden
      className="relative grid h-44 w-full place-items-center overflow-hidden rounded-2xl border border-white/[0.06] bg-base-950/40"
    >
      <div className="absolute inset-0 bg-grid-fade opacity-40 [background-size:20px_20px] [mask-image:radial-gradient(70%_70%_at_50%_50%,black,transparent)]" />
      <div className="absolute inset-0 bg-radial-glow opacity-70" />

      <div className="relative flex items-center gap-3">
        <Server className="h-20 w-20 text-violet-400/60" strokeWidth={1} />

        <span className="grid h-11 w-11 place-items-center rounded-xl border border-violet-400/50 bg-violet-500/10 text-violet-200 shadow-neon">
          <AlertTriangle className="h-6 w-6 animate-pulse-soft" />
        </span>

        <div className="relative">
          <MonitorDot className="h-24 w-24 text-violet-400/50" strokeWidth={0.9} />
          <Search
            className="absolute -bottom-1 -right-2 h-10 w-10 text-violet-300 drop-shadow-[0_0_12px_rgba(139,92,246,0.6)]"
            strokeWidth={1.4}
          />
        </div>
      </div>
    </div>
  );
}
