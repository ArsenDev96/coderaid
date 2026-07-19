import Link from "next/link";
import { Crosshair } from "lucide-react";

type LogoProps = {
  href?: string;
  withTagline?: boolean;
  /** Overrides the default tagline copy when `withTagline` is set. */
  tagline?: string;
  size?: "sm" | "md";
};

/**
 * CodeRaid brand mark — a crosshair badge plus the "CODERAID" wordmark and an
 * optional "NODE.JS DEBUGGING SIMULATOR" tagline. Shared across marketing and
 * in-app surfaces so the brand stays consistent.
 */
export function Logo({
  href = "/",
  withTagline = false,
  tagline = "Node.js Debugging Simulator",
  size = "md",
}: LogoProps) {
  const badge = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const icon = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  const inner = (
    <>
      <span
        className={`relative grid ${badge} shrink-0 place-items-center rounded-lg border border-violet-500/40 bg-gradient-to-br from-violet-600/30 to-electric-500/20 shadow-neon`}
      >
        <Crosshair className={`${icon} text-violet-300`} strokeWidth={2} />
        {/* corner ticks */}
        <span className="pointer-events-none absolute inset-1 rounded-[3px] border border-violet-400/20" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-lg font-bold uppercase tracking-wide text-white">
          Code<span className="text-gradient">Raid</span>
        </span>
        {withTagline && (
          <span className="mt-1 text-[0.58rem] font-medium uppercase tracking-[0.22em] text-slate-500">
            {tagline}
          </span>
        )}
      </span>
    </>
  );

  return (
    <Link href={href} className="flex items-center gap-2.5" aria-label="CodeRaid home">
      {inner}
    </Link>
  );
}
