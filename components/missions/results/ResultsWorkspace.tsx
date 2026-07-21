"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Sparkles, Zap } from "lucide-react";
import { useProgress } from "@/components/progress/ProgressProvider";
import { canStart, nextMissionId } from "@/lib/availability";
import { loadCredit, loadGrade } from "@/lib/grade-submission";
import { type MissionGrade } from "@/lib/grading";
import { MISSION_FLOW, getMission, type Mission } from "@/lib/missions";
import { skillLevelFromXp } from "@/lib/progress";
import { loadResultsState, narrativeFor, saveResultsState, type MissionResultConfig } from "@/lib/results";
import { completeStage } from "@/lib/run";
import { getSkill } from "@/lib/skills";
import { ResultsHeader, ResultsMissionRecap, ScoreBreakdown } from "./ResultsHeader";
import { PerformanceImprovement } from "./PerformanceImprovement";
import { SkillsImproved, type SkillGain } from "./SkillsImproved";
import { WhatYouFixed } from "./WhatYouFixed";
import { WhatYouLearned } from "./WhatYouLearned";

/**
 * The results screen.
 *
 * Everything shown here comes from the grade the **server** produced when the
 * player ran verification: it read their diagnosis, evidence and fix against
 * answers the browser never sees, recorded the run, and returned the breakdown.
 * This screen only renders that verdict — it cannot compute a score, and it no
 * longer credits anything either.
 *
 * Crediting used to happen here, against the `localStorage` ledger. It doesn't
 * any more: the run was recorded in Postgres at the moment of verification, and
 * the XP and skill gains shown below were **measured** by the server by
 * diffing the ledger around that insert. So a replay that didn't beat the
 * previous attempt honestly shows +0 without this screen knowing the rule that
 * made it so, and a refresh cannot farm XP because there is nothing here to
 * repeat.
 *
 * It reads after mount because the grade is cached client-side. Until then the
 * screen renders nothing rather than a placeholder score — a fake 0 flashing
 * before the real number would be worse than a moment of blank.
 */
export function ResultsWorkspace({
  mission,
  config,
}: {
  mission: Mission;
  config: MissionResultConfig;
}) {
  const { ledger, view, hydrated } = useProgress();
  const [grade, setGrade] = useState<MissionGrade | null>(null);
  const [gains, setGains] = useState<SkillGain[]>([]);
  const [xpAdded, setXpAdded] = useState(0);
  /** No graded run to show — the player never completed verification. */
  const [ungraded, setUngraded] = useState(false);
  const read = useRef(false);

  useEffect(() => {
    if (!hydrated || read.current) return;
    read.current = true;

    // Reaching this screen is itself the last stage of the flow.
    completeStage(mission.id, "Complete");

    // The grade was computed and recorded by the server when the player ran
    // verification. This screen renders it — it no longer knows the answers, so
    // it cannot compute one, which is exactly the property we want.
    const result = loadGrade(mission.id);
    if (!result) {
      setUngraded(true);
      return;
    }
    setGrade(result);
    setXpAdded(loadCredit(mission.id)?.xpAdded ?? 0);
    saveResultsState(mission.id, { claimed: true, score: result.score });
  }, [hydrated, mission.id]);

  /**
   * Skill gains, from the server's measurement plus the live ledger.
   *
   * `levelAfter` is where the skill stands now; `levelBefore` is that total
   * minus what this run added. Both come from figures the server derived, so
   * the "Level 3 → Level 4" line is a fact rather than a client prediction.
   */
  useEffect(() => {
    if (!grade) return;
    const credit = loadCredit(mission.id);
    if (!credit) return;

    setGains(
      Object.entries(credit.skillXpAdded)
        .map(([id, xp]) => {
          const skill = getSkill(id, ledger);
          if (!skill) return null;
          return {
            skill,
            xp,
            levelBefore: skillLevelFromXp((ledger.skillXp[id] ?? 0) - xp),
            levelAfter: skill.level,
          };
        })
        .filter((g): g is SkillGain => g !== null)
        .sort((a, b) => b.xp - a.xp),
    );
  }, [grade, ledger, mission.id]);

  // Next mission: an authored override wins, but only if it's actually
  // playable — otherwise the derived next one, then the catalogue.
  const { nextHref, hasNext } = useMemo(() => {
    const override = config.nextMissionId
      ? getMission(config.nextMissionId)
      : undefined;
    const nextId =
      override && canStart(override, view)
        ? override.id
        : nextMissionId(mission.id, view);
    return {
      nextHref: nextId ? `/missions/${nextId}/briefing` : "/missions",
      hasNext: Boolean(nextId),
    };
  }, [config.nextMissionId, mission.id, view]);

  if (ungraded) {
    // Reachable by typing the URL, or by signing out between verification and
    // here. There is no honest score to show, so it sends them back to earn one
    // rather than rendering a zero they didn't score.
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h2 className="text-xl font-semibold text-white">
          This run hasn&apos;t been graded yet
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Scores are recorded when you run verification. Head back and run it to
          see how you did.
        </p>
        <Link
          href={`/missions/${mission.id}/verification`}
          className="mt-6 inline-flex items-center gap-2 rounded-xl border border-violet-400/40 bg-gradient-to-r from-violet-600 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-neon transition-transform hover:scale-[1.02]"
        >
          Go to Verification
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  if (!grade) {
    return (
      <div className="py-20 text-center text-sm text-slate-500">
        Loading your results…
      </div>
    );
  }

  const narrative = narrativeFor(config, grade.resolved);

  return (
    <div className="flex flex-col gap-6">
      <ResultsHeader grade={grade} summary={narrative.summary} />

      <ResultsMissionRecap
        title={mission.title}
        blurb={narrative.missionBlurb}
        difficulty={mission.difficulty}
        resolved={grade.resolved}
      />

      <ScoreBreakdown grade={grade} />

      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
        <WhatYouFixed fix={config.fix} resolved={grade.resolved} />
        {/* Impact is the correct fix's impact — only real once it was applied. */}
        <PerformanceImprovement
          metrics={config.metrics}
          resolved={grade.resolved}
        />
      </div>

      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
        <WhatYouLearned lessons={config.lessons} />
        <SkillsImproved
          gains={gains}
          description={config.skillImprovement.description}
        />
      </div>

      {/* XP banner */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-400/30 bg-gradient-to-r from-violet-700/30 to-violet-900/20 p-5 sm:p-6">
        <Sparkles
          aria-hidden
          className="pointer-events-none absolute -right-2 top-4 h-16 w-16 text-violet-500/20"
          strokeWidth={1}
        />
        <div className="relative flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:gap-6 sm:text-left">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-violet-400/40 bg-violet-500/15 shadow-neon">
            <Zap className="h-8 w-8 text-violet-200" fill="currentColor" strokeWidth={1.5} />
          </span>
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
              {xpAdded > 0 ? "You earned" : "Already credited"}
            </div>
            <div className="text-3xl font-bold text-white">
              +{xpAdded > 0 ? xpAdded : grade.xpEarned} XP
            </div>
            {xpAdded === 0 && (
              <div className="mt-1 text-xs text-violet-200/70">
                A replay only adds XP when it beats your best score.
              </div>
            )}
          </div>
          <p className="text-sm leading-relaxed text-violet-200/80 sm:ml-auto sm:max-w-xs">
            {narrative.encouragement}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="max-lg:sticky max-lg:bottom-3 max-lg:z-20">
        <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-base-900/90 p-4 backdrop-blur sm:flex-row sm:justify-center sm:gap-4 sm:border-transparent sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <Link
            href="/missions"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-8 py-3.5 text-sm font-semibold text-slate-200 transition-colors hover:border-white/25 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Missions
          </Link>
          {/* An unresolved incident is worth another attempt before moving on. */}
          {!grade.resolved && (
            <Link
              href={`/missions/${mission.id}/briefing`}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/10 px-8 py-3.5 text-sm font-semibold text-amber-200 transition-colors hover:border-amber-400/60"
            >
              Run It Again
            </Link>
          )}
          <Link
            href={nextHref}
            className="group inline-flex items-center justify-center gap-2.5 rounded-xl border border-violet-400/40 bg-gradient-to-r from-violet-600 to-violet-500 px-8 py-3.5 text-sm font-semibold text-white shadow-neon transition-transform hover:scale-[1.02]"
          >
            {hasNext ? "Next Mission" : "All Missions"}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      {!hasNext && (
        <p className="text-center text-xs text-slate-500">
          More Node.js incidents are currently being prepared.
        </p>
      )}
    </div>
  );
}

/** Re-exported so the flow's stage count has a single definition. */
export const RESULTS_TOTAL_STEPS = MISSION_FLOW.length;
