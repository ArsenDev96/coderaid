"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Sparkles, Zap } from "lucide-react";
import {
  SKILL_POINTS_BASELINE,
  claimMissionRewards,
  type MissionResultConfig,
} from "@/lib/results";
import { ResultsHeader, ResultsMissionRecap } from "./ResultsHeader";
import { PerformanceImprovement } from "./PerformanceImprovement";
import { SkillsImproved } from "./SkillsImproved";
import { WhatYouFixed } from "./WhatYouFixed";
import { WhatYouLearned } from "./WhatYouLearned";

export function ResultsWorkspace({
  config,
  missionTitle,
  difficulty,
  nextHref,
}: {
  config: MissionResultConfig;
  missionTitle: string;
  difficulty: string;
  nextHref: string;
}) {
  // Rewards are credited to the persisted ledger exactly once; the returned
  // snapshot drives the skill before/after and stays stable across refresh.
  const [skill, setSkill] = useState({
    before: SKILL_POINTS_BASELINE,
    after: SKILL_POINTS_BASELINE + config.skillImprovement.increase,
  });

  useEffect(() => {
    const state = claimMissionRewards(config);
    setSkill({ before: state.skillBefore, after: state.skillAfter });
  }, [config]);

  return (
    <div className="flex flex-col gap-6">
      <ResultsHeader config={config} />

      <ResultsMissionRecap
        title={missionTitle}
        blurb={config.missionBlurb}
        difficulty={difficulty}
        resolved={config.status === "resolved"}
      />

      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
        <WhatYouFixed fix={config.fix} />
        <PerformanceImprovement metrics={config.metrics} />
      </div>

      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
        <WhatYouLearned lessons={config.lessons} />
        <SkillsImproved
          skill={config.skillImprovement}
          skillBefore={skill.before}
          skillAfter={skill.after}
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
              You earned
            </div>
            <div className="text-3xl font-bold text-white">
              +{config.xpEarned} XP
            </div>
          </div>
          <p className="text-sm leading-relaxed text-violet-200/80 sm:ml-auto sm:max-w-xs">
            {config.encouragement}
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
          <Link
            href={nextHref}
            className="group inline-flex items-center justify-center gap-2.5 rounded-xl border border-violet-400/40 bg-gradient-to-r from-violet-600 to-violet-500 px-8 py-3.5 text-sm font-semibold text-white shadow-neon transition-transform hover:scale-[1.02]"
          >
            Next Mission
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
