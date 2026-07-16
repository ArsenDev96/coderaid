/* -------------------------------- Types --------------------------------- */

export type MissionResultMetric = {
  id: string;
  label: string;
  before: string;
  after: string;
  /** Featured metrics render a small before/after sparkline. */
  spark?: { before: number[]; after: number[]; yMax: number };
};

export type MissionResultConfig = {
  missionId: string;
  score: number;
  xpEarned: number;
  timeTaken: string;
  stepsCompleted: number;
  totalSteps: number;
  status: "resolved" | "failed";
  /** One-line completion headline. */
  summary: string;
  /** Short recap shown beside the mission title. */
  missionBlurb: string;
  fix: {
    problem: string;
    solution: string;
    code: string;
    note: string;
  };
  metrics: MissionResultMetric[];
  lessons: string[];
  skillImprovement: {
    skill: string;
    increase: number;
    description: string;
  };
  encouragement: string;
  /** Overrides the derived "next available mission". */
  nextMissionId?: string;
};

export type ResultsState = {
  claimed: boolean;
  /** Snapshot captured at claim time so the display is stable across refresh. */
  skillBefore: number;
  skillAfter: number;
};

/* ------------------------------- Content -------------------------------- */

const SIGNUP_LATENCY_RESULT: MissionResultConfig = {
  missionId: "user-signup-latency-spike",
  score: 92,
  xpEarned: 140,
  timeTaken: "14m 32s",
  stepsCompleted: 5,
  totalSteps: 5,
  status: "resolved",
  summary:
    "You successfully resolved the issue and improved the system performance.",
  missionBlurb:
    "New user registrations were taking several seconds to complete. You identified the root cause, implemented the correct fix, and restored normal response times.",

  fix: {
    problem:
      "The signup request was waiting for the welcome email to be sent before returning the response.",
    solution:
      "You moved email delivery to a background queue so the request can return immediately after the user is created.",
    code: `const user = await userRepository.create(input);

await emailQueue.add("welcome-email", {
  userId: user.id,
  email: user.email,
});`,
    note: "Welcome emails are now delivered asynchronously.",
  },

  metrics: [
    {
      id: "p95",
      label: "Signup API P95",
      before: "3.2s",
      after: "412ms",
      spark: {
        before: [3.0, 3.15, 3.05, 3.2, 3.1, 3.18, 3.08, 3.2],
        after: [1.0, 0.6, 0.5, 0.46, 0.44, 0.43, 0.42, 0.41],
        yMax: 4,
      },
    },
    {
      id: "avg",
      label: "Signup API Avg",
      before: "2.0s",
      after: "298ms",
    },
    {
      id: "error-rate",
      label: "Error Rate",
      before: "0.03%",
      after: "0.02%",
    },
    {
      id: "throughput",
      label: "Throughput",
      before: "110 req/min",
      after: "152 req/min",
    },
  ],

  lessons: [
    "Identify performance bottlenecks using logs, metrics, and traces",
    "Understand the impact of synchronous work inside HTTP request paths",
    "Move slow external operations to background jobs",
    "Verify fixes with before-and-after measurements",
  ],

  skillImprovement: {
    skill: "Backend Performance",
    increase: 1,
    description:
      "You improved your ability to find and fix performance issues in backend systems.",
  },

  encouragement: "Keep going! You're building real incident response skills.",
};

/* ------------------------------- Registry ------------------------------- */

/**
 * Results content is authored per mission — the score, lessons and skill reward
 * belong to that mission's scenario. The route looks a mission up by slug;
 * missions without an entry fall back to the reserved-route state.
 */
export const resultsConfigs: Record<string, MissionResultConfig> = {
  "user-signup-latency-spike": SIGNUP_LATENCY_RESULT,
};

export function getResult(missionId: string): MissionResultConfig | undefined {
  return resultsConfigs[missionId];
}

export const RESULT_MISSION_IDS = Object.keys(resultsConfigs);

/* ------------------------- Player progress (ledger) --------------------- */

/**
 * Total skill points before any mission rewards. Mission skill increases
 * accumulate on top of this, so "24 → 25" stays correct as missions are cleared.
 */
export const SKILL_POINTS_BASELINE = 24;

const PLAYER_PROGRESS_KEY = "coderaid:player:progress";

type PlayerProgress = {
  xpFromMissions: number;
  skillPoints: number;
  claimedMissions: string[];
};

function defaultProgress(): PlayerProgress {
  return {
    xpFromMissions: 0,
    skillPoints: SKILL_POINTS_BASELINE,
    claimedMissions: [],
  };
}

function loadProgress(): PlayerProgress {
  if (typeof window === "undefined") return defaultProgress();
  try {
    const raw = window.localStorage.getItem(PLAYER_PROGRESS_KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw) as Partial<PlayerProgress>;
    return {
      xpFromMissions:
        typeof parsed.xpFromMissions === "number" ? parsed.xpFromMissions : 0,
      skillPoints:
        typeof parsed.skillPoints === "number"
          ? parsed.skillPoints
          : SKILL_POINTS_BASELINE,
      claimedMissions: Array.isArray(parsed.claimedMissions)
        ? parsed.claimedMissions.filter((id): id is string => typeof id === "string")
        : [],
    };
  } catch {
    return defaultProgress();
  }
}

export function resultsStorageKey(missionId: string): string {
  return `coderaid:${missionId}:results`;
}

/**
 * Credits the mission's XP and skill points exactly once, then returns the
 * before/after skill totals to display. Idempotent: the global ledger's claimed
 * set and the per-mission snapshot both guard against a refresh re-applying the
 * reward.
 */
export function claimMissionRewards(config: MissionResultConfig): ResultsState {
  if (typeof window === "undefined") {
    return {
      claimed: false,
      skillBefore: SKILL_POINTS_BASELINE,
      skillAfter: SKILL_POINTS_BASELINE + config.skillImprovement.increase,
    };
  }

  // Already claimed on a previous visit — return the stored snapshot untouched.
  try {
    const existing = window.localStorage.getItem(resultsStorageKey(config.missionId));
    if (existing) {
      const parsed = JSON.parse(existing) as Partial<ResultsState>;
      if (parsed.claimed) {
        return {
          claimed: true,
          skillBefore: parsed.skillBefore ?? SKILL_POINTS_BASELINE,
          skillAfter:
            parsed.skillAfter ??
            SKILL_POINTS_BASELINE + config.skillImprovement.increase,
        };
      }
    }
  } catch {
    /* fall through and re-derive */
  }

  const progress = loadProgress();
  const increase = config.skillImprovement.increase;

  let skillBefore: number;
  let skillAfter: number;

  if (progress.claimedMissions.includes(config.missionId)) {
    // Ledger already counted it (per-mission snapshot was lost) — don't re-add.
    skillAfter = progress.skillPoints;
    skillBefore = skillAfter - increase;
  } else {
    skillBefore = progress.skillPoints;
    skillAfter = skillBefore + increase;
    progress.skillPoints = skillAfter;
    progress.xpFromMissions += config.xpEarned;
    progress.claimedMissions.push(config.missionId);
    try {
      window.localStorage.setItem(PLAYER_PROGRESS_KEY, JSON.stringify(progress));
    } catch {
      /* ignore quota / privacy-mode errors */
    }
  }

  const state: ResultsState = { claimed: true, skillBefore, skillAfter };
  try {
    window.localStorage.setItem(
      resultsStorageKey(config.missionId),
      JSON.stringify(state),
    );
  } catch {
    /* ignore quota / privacy-mode errors */
  }
  return state;
}
