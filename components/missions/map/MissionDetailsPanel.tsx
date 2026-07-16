"use client";

import Link from "next/link";
import {
  ArrowRight,
  CircleDot,
  Clock,
  FileText,
  Layers,
  ListChecks,
  Lock,
  Wrench,
  X,
} from "lucide-react";
import {
  CHAPTERS,
  chapterState,
  estimatedRange,
  resolveBriefing,
  type Mission,
} from "@/lib/missions";
import { useMissionResume } from "./useMissionResume";

const PRIMARY =
  "group inline-flex w-full items-center justify-center gap-2 rounded-xl border border-violet-400/40 bg-gradient-to-r from-violet-600 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-neon transition-transform hover:scale-[1.02]";
const SECONDARY =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-white/25 hover:text-white";

function MetaRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="flex items-center gap-2 text-sm text-slate-400">
        <span className="text-slate-500">{icon}</span>
        {label}
      </span>
      <span className="min-w-0 text-right text-sm font-medium text-slate-200">
        {children}
      </span>
    </div>
  );
}

export function MissionDetailsPanel({
  mission,
  onClose,
}: {
  mission: Mission;
  onClose?: () => void;
}) {
  const briefing = resolveBriefing(mission);
  const chapter = CHAPTERS.find((c) => c.id === mission.chapterId);
  const resume = useMissionResume(mission.id);
  const briefingHref = `/missions/${mission.id}/briefing`;

  const locked = mission.status === "locked";
  const stepValue =
    mission.status === "current"
      ? `${resume.step} of ${resume.totalSteps}`
      : mission.status === "completed"
        ? `${resume.totalSteps} of ${resume.totalSteps}`
        : locked
          ? "Locked"
          : `Not started`;

  const primary =
    mission.status === "current"
      ? { label: "Continue Mission", href: resume.href }
      : mission.status === "completed"
        ? { label: "Replay Mission", href: briefingHref }
        : { label: "Start Mission", href: briefingHref };

  return (
    <div className="surface flex flex-col p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
          Mission Details
        </h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close mission details"
            className="grid h-7 w-7 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.02] text-slate-400 transition-colors hover:border-white/20 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <span className="mt-4 inline-flex w-fit rounded-md border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-amber-300">
        {mission.difficulty}
      </span>

      <h3 className="mt-2.5 text-xl font-bold leading-tight text-white">
        {mission.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">
        {mission.description}
      </p>

      {/* Locked missions say why, so the state never relies on the icon alone. */}
      {locked && (
        <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-500/[0.05] p-3 text-xs leading-relaxed text-amber-200/90">
          <Lock className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2.2} />
          {chapter && chapterState(mission.chapterId) === "locked"
            ? `Complete the previous chapter to unlock ${chapter.name}.`
            : `Complete the earlier missions in ${chapter?.name ?? "this chapter"} to unlock this mission.`}
        </p>
      )}

      {/* Metadata */}
      <dl className="mt-4 divide-y divide-white/[0.06] border-y border-white/[0.06]">
        <MetaRow icon={<Layers className="h-4 w-4" />} label="Chapter">
          {chapter ? `${chapter.id}. ${chapter.name}` : mission.chapterId}
        </MetaRow>
        <MetaRow icon={<CircleDot className="h-4 w-4" />} label="Step">
          {stepValue}
        </MetaRow>
        <MetaRow icon={<Clock className="h-4 w-4" />} label="Estimated Time">
          {estimatedRange(mission.minutes)}
        </MetaRow>
      </dl>

      {/* Technologies */}
      <div className="mt-4">
        <div className="flex items-center gap-2 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
          <Wrench className="h-3.5 w-3.5" strokeWidth={2.2} />
          Technologies
        </div>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {mission.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-slate-300"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Objectives */}
      <div className="mt-4">
        <div className="flex items-center gap-2 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
          <ListChecks className="h-3.5 w-3.5" strokeWidth={2.2} />
          Objectives
        </div>
        <ul className="mt-3 space-y-2.5">
          {briefing.steps.map((step) => (
            <li key={step} className="flex items-start gap-2.5 text-sm">
              <CircleDot
                aria-hidden
                className="mt-0.5 h-4 w-4 shrink-0 text-violet-400/70"
                strokeWidth={2}
              />
              <span className="text-slate-300">{step}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="mt-6 space-y-2.5">
        {locked ? (
          <span className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-slate-500">
            <Lock className="h-4 w-4" /> Mission Locked
          </span>
        ) : (
          <Link href={primary.href} className={PRIMARY}>
            {primary.label}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
        <Link href={briefingHref} className={SECONDARY}>
          <FileText className="h-4 w-4" />
          View Mission Briefing
        </Link>
      </div>
    </div>
  );
}
