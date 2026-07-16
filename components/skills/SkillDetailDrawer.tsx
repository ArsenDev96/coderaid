"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, CircleCheckBig, Sparkles, X } from "lucide-react";
import {
  completedMissions,
  levelLabel,
  recommendedMission,
  type Skill,
} from "@/lib/skills";
import { DIFFICULTY_BADGE } from "@/lib/missions";

export function SkillDetailDrawer({
  skill,
  onClose,
}: {
  skill: Skill;
  onClose: () => void;
}) {
  const Icon = skill.icon;
  const done = completedMissions(skill);
  const recommended = recommendedMission(skill);
  const practiceHref = recommended
    ? `/missions/${recommended.id}/briefing`
    : "/missions";

  // Close on Escape, per the dialog interaction pattern.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Bottom sheet on mobile, right slide-over on desktop */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${skill.name} details`}
        className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-2xl border border-white/10 bg-base-950/95 p-5 backdrop-blur-xl sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-full sm:max-w-md sm:rounded-none sm:rounded-l-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl border ${skill.accent}`}
            >
              <Icon className="h-6 w-6" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white">{skill.name}</h2>
              <p className="text-xs text-slate-500">
                Level {skill.level} · {levelLabel(skill.level)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.02] text-slate-400 transition-colors hover:border-white/20 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* What it covers */}
        <div className="mt-5">
          <h3 className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
            What this covers
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            {skill.description}
          </p>
        </div>

        {/* Progress to next level */}
        <div className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-400">Progress to next level</span>
            <span className="font-mono text-slate-300">
              {skill.currentXp} / {skill.nextLevelXp} XP
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-electric-400"
              style={{ width: `${skill.progress}%` }}
            />
          </div>
        </div>

        {/* Recently completed related missions */}
        <div className="mt-5">
          <h3 className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Completed missions
          </h3>
          {done.length > 0 ? (
            <ul className="mt-2.5 flex flex-col gap-2">
              {done.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/missions/${m.id}/briefing`}
                    className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-sm text-slate-200 transition-colors hover:border-white/15"
                  >
                    <CircleCheckBig className="h-4 w-4 shrink-0 text-emerald-400" strokeWidth={2.2} />
                    <span className="min-w-0 flex-1 truncate">{m.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              No related missions completed yet.
            </p>
          )}
        </div>

        {/* Recommended mission */}
        {recommended && recommended.status !== "completed" && (
          <div className="mt-5 rounded-xl border border-violet-400/25 bg-violet-500/[0.06] p-4">
            <div className="flex items-center gap-2 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-violet-300">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2.2} />
              Recommended to improve
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-sm font-semibold text-white">
                {recommended.title}
              </span>
              <span
                className={`shrink-0 rounded-md border px-2 py-0.5 text-[0.6rem] font-medium ${DIFFICULTY_BADGE[recommended.difficulty]}`}
              >
                {recommended.difficulty}
              </span>
            </div>
          </div>
        )}

        {/* Practice */}
        <Link
          href={practiceHref}
          className="group mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-violet-400/40 bg-gradient-to-r from-violet-600 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-neon transition-transform hover:scale-[1.02]"
        >
          Practice {skill.name}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
