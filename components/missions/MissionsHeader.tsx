import Link from "next/link";
import { LayoutList, Map } from "lucide-react";
import { overallProgress } from "@/lib/missions";

/**
 * Shared header for both mission views. The List/Map switch is real navigation
 * (each view is its own route), so the toggle is two links with the active one
 * marked via `aria-current`.
 */
export function MissionsHeader({ active }: { active: "list" | "map" }) {
  const { done, total, pct } = overallProgress();

  return (
    <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Missions
        </h1>
        <p className="mt-1.5 text-sm text-slate-400 sm:text-base">
          Choose your next engineering challenge.
        </p>
      </div>

      {/* View switch */}
      <nav
        aria-label="Mission view"
        className="inline-flex shrink-0 rounded-xl border border-white/10 bg-white/[0.02] p-1"
      >
        <ToggleLink
          href="/missions"
          active={active === "list"}
          icon={<LayoutList className="h-4 w-4" />}
          label="List View"
        />
        <ToggleLink
          href="/missions/map"
          active={active === "map"}
          icon={<Map className="h-4 w-4" />}
          label="Map View"
        />
      </nav>

      {/* Progress summary */}
      <div className="min-w-0 lg:w-64">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-slate-300">
            {done} of {total} missions completed
          </span>
          <span className="shrink-0 font-semibold text-emerald-300">{pct}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-electric-400 transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function ToggleLink({
  href,
  active,
  icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-violet-500/15 text-white shadow-neon"
          : "text-slate-400 hover:text-white"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
