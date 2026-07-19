"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  ListChecks,
  Search,
  Target,
} from "lucide-react";
import { recommendedMission } from "@/lib/availability";
import { useProgress } from "@/components/progress/ProgressProvider";
import { nextActionFor, RESPONSE_SERIES } from "@/lib/dashboard";
import type { Mission } from "@/lib/missions";
import { useMissionResume } from "@/components/missions/map/useMissionResume";

const TONE: Record<string, string> = {
  comment: "text-slate-500",
  warn: "text-rose-200",
};

/**
 * The mission is resolved from `recommendedMission()`, never a hardcoded id, so
 * this card can only ever point at a Node.js incident that is playable end to
 * end. When nothing is playable it degrades to an explanatory empty state
 * rather than a dead CTA.
 */
export function NextAction() {
  const { view } = useProgress();
  const mission = recommendedMission(view);
  if (!mission) return <NoMissionAvailable />;
  return <NextActionCard mission={mission} />;
}

function NextActionCard({ mission }: { mission: Mission }) {
  const a = nextActionFor(mission);
  // Saved stage, read after mount by the shared resume hook — same logic the
  // mission map uses, so the dashboard and the map never disagree.
  const resume = useMissionResume(mission.id);
  const pct = Math.round((resume.step / resume.totalSteps) * 100);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-400/50 bg-base-900/60 p-5 shadow-neon sm:p-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: briefing */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-violet-300">
            <Target className="h-4 w-4" strokeWidth={2.2} />
            <span className="text-xs font-semibold uppercase tracking-[0.16em]">
              {resume.started
                ? "Continue Your Node.js Mission"
                : "Start Your Node.js Mission"}
            </span>
          </div>

          <h2 className="mt-3 text-3xl font-bold leading-[1.15] tracking-tight text-white sm:text-4xl">
            {a.title}
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-400">
            {a.description}
          </p>

          {/* Step progress */}
          <div className="mt-5 max-w-md">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-white">
                Step {resume.step} of {resume.totalSteps}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">{resume.stage}</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-electric-400"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Findings */}
          <div className="mt-5 max-w-md rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
            <div className="flex gap-2.5">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-violet-400/30 bg-violet-500/10 text-violet-300">
                <Search className="h-3 w-3" />
              </span>
              <div className="min-w-0">
                <div className="text-xs font-medium text-slate-300">
                  {resume.started
                    ? "What you've found so far:"
                    : "What the incident report says:"}
                </div>
                <ul className="mt-1 space-y-0.5">
                  {a.findings.map((f) => (
                    <li key={f} className="text-xs leading-relaxed text-slate-400">
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href={resume.href}
              className="group inline-flex items-center justify-center gap-2 rounded-xl border border-violet-400/40 bg-gradient-to-r from-violet-600 to-violet-500 px-6 py-3.5 text-sm font-semibold text-white shadow-neon transition-transform hover:scale-[1.02]"
            >
              {resume.started ? "Continue Mission" : "Start Mission"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href={a.briefingHref}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-6 py-3.5 text-sm font-semibold text-slate-200 transition-colors hover:border-white/25 hover:text-white"
            >
              <ListChecks className="h-4 w-4" />
              View Mission
            </Link>
          </div>
        </div>

        {/* Right: evidence panel */}
        <div className="min-w-0 rounded-xl border border-white/[0.07] bg-base-950/50 p-4">
          <span
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-wide ${a.severityCls}`}
          >
            <AlertTriangle className="h-3.5 w-3.5" /> {a.severity}
          </span>

          {/* Headline metric + sparkline */}
          <div className="mt-4 flex items-end justify-between gap-4">
            <div className="shrink-0">
              <div className="text-xs text-slate-400">{a.headline.label}</div>
              <div className="mt-0.5 text-3xl font-bold text-rose-400">
                {a.headline.value}
              </div>
            </div>
            <svg
              viewBox="0 0 240 40"
              preserveAspectRatio="none"
              className="h-12 min-w-0 flex-1"
              aria-hidden
            >
              <defs>
                <linearGradient id="na-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon points={`0,40 ${RESPONSE_SERIES} 240,40`} fill="url(#na-fill)" />
              <polyline
                points={RESPONSE_SERIES}
                fill="none"
                stroke="#f43f5e"
                strokeWidth="1.4"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>

          {/* Code preview */}
          <div className="mt-4">
            <div className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Suspicious Code Preview
            </div>
            <div className="mt-2 font-mono text-[0.68rem] leading-[1.6]">
              {a.code.map((line) => (
                <div
                  key={line.n}
                  className={`flex items-start gap-3 ${
                    line.tone === "warn" ? "rounded bg-rose-500/[0.08]" : ""
                  }`}
                >
                  <span className="w-3 shrink-0 select-none text-right text-slate-600">
                    {line.n}
                  </span>
                  <span
                    className={`min-w-0 flex-1 whitespace-pre-wrap break-words ${
                      line.tone ? TONE[line.tone] : "text-slate-300"
                    }`}
                  >
                    {line.content}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer meta */}
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/[0.07] pt-4">
            <div className="flex items-center gap-2.5">
              <Search className="h-5 w-5 shrink-0 text-slate-500" />
              <div className="min-w-0">
                <div className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Clues Found
                </div>
                <div className="text-base font-bold text-white">
                  <span className="text-violet-300">{resume.cluesFound}</span> /{" "}
                  {resume.cluesTotal}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2.5 border-l border-white/[0.07] pl-3">
              <Clock className="h-5 w-5 shrink-0 text-slate-500" />
              <div className="min-w-0">
                <div className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Est. Time Left
                </div>
                <div className="text-base font-bold text-white">
                  {resume.timeLeftLabel}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Shown when no Node.js mission is playable — a real message, not a dead CTA. */
function NoMissionAvailable() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-400/50 bg-base-900/60 p-5 shadow-neon sm:p-6">
      <div className="flex items-center gap-2 text-violet-300">
        <Target className="h-4 w-4" strokeWidth={2.2} />
        <span className="text-xs font-semibold uppercase tracking-[0.16em]">
          Continue Your Node.js Mission
        </span>
      </div>

      <h2 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
        No Node.js mission is ready right now
      </h2>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-400">
        More Node.js incidents are currently being prepared. Browse the mission
        list to see what&apos;s coming next.
      </p>

      <div className="mt-5">
        <Link
          href="/missions"
          className="group inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-6 py-3.5 text-sm font-semibold text-slate-200 transition-colors hover:border-white/25 hover:text-white"
        >
          <ListChecks className="h-4 w-4" />
          Browse Missions
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
