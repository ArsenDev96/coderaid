/* -------------------------------- Types --------------------------------- */

export type MissionResultMetric = {
  id: string;
  label: string;
  before: string;
  after: string;
  /** Featured metrics render a small before/after sparkline. */
  spark?: { before: number[]; after: number[]; yMax: number };
};

/**
 * Authored results *narrative* for a mission.
 *
 * Deliberately carries no score, time, step count or status: those describe a
 * run, not a mission, and are produced by the grading engine from what the
 * player actually did. What is authored here is the story — what the incident
 * was, what the correct fix changed, and what there was to learn.
 */
export type MissionResultConfig = {
  missionId: string;
  /** Copy for a run that resolved the incident. */
  resolved: ResultNarrative;
  /** Copy for a run that did not. Reuses the resolved metrics as a target. */
  unresolved: ResultNarrative;
  fix: {
    problem: string;
    solution: string;
    code: string;
    note: string;
  };
  /** Before/after impact of the *correct* fix. Only shown once resolved. */
  metrics: MissionResultMetric[];
  lessons: string[];
  skillImprovement: {
    /** Stable skill id from `lib/skills.ts` — not a display name. */
    skillId: string;
    description: string;
  };
  /** Overrides the derived "next available mission". */
  nextMissionId?: string;
};

export type ResultNarrative = {
  /** One-line completion headline. */
  summary: string;
  /** Short recap shown beside the mission title. */
  missionBlurb: string;
  encouragement: string;
};

/* ------------------------------- Content -------------------------------- */

const SIGNUP_LATENCY_RESULT: MissionResultConfig = {
  missionId: "user-signup-latency-spike",

  resolved: {
    summary:
      "You resolved the incident and restored signup performance.",
    missionBlurb:
      "New user registrations were taking several seconds to complete. You identified the root cause, implemented the correct fix, and restored normal response times.",
    encouragement: "Keep going! You're building real incident response skills.",
  },

  unresolved: {
    summary: "The incident is still open — signup latency has not recovered.",
    missionBlurb:
      "New user registrations were taking several seconds to complete. The change you applied didn't remove the slow operation from the request path, so the latency is unchanged.",
    encouragement:
      "Re-read the trace: the step that dominates the request is the one to move off it. You can run this incident again.",
  },

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
    skillId: "request-performance",
    description:
      "You improved your ability to find and fix performance issues in backend systems.",
  },
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

/* ------------------------------ Claiming -------------------------------- */

/**
 * Per-mission claim marker. The ledger itself is idempotent, but this keeps the
 * results screen from re-running the credit path on every refresh.
 */
export type ResultsState = {
  claimed: boolean;
  /** The graded score that was credited, for a stable display across refresh. */
  score: number;
};

export function resultsStorageKey(missionId: string): string {
  return `coderaid:${missionId}:results`;
}

export function loadResultsState(missionId: string): ResultsState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(resultsStorageKey(missionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ResultsState>;
    if (parsed.claimed !== true) return null;
    return {
      claimed: true,
      score: typeof parsed.score === "number" ? parsed.score : 0,
    };
  } catch {
    return null;
  }
}

export function saveResultsState(missionId: string, state: ResultsState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      resultsStorageKey(missionId),
      JSON.stringify(state),
    );
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

/** The narrative half of the results screen, chosen by the run's verdict. */
export function narrativeFor(
  config: MissionResultConfig,
  resolved: boolean,
): ResultNarrative {
  return resolved ? config.resolved : config.unresolved;
}

