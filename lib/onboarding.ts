import {
  Bot,
  Braces,
  Bug,
  MessagesSquare,
  Server,
  User,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export const NAME_MAX = 20;
export const STORAGE_KEY = "coderaid:profile";

export type ProfileDraft = {
  name: string;
  avatarId: string;
  slogan: string;
  pathId: string;
  experienceId: string;
  step: number; // 0-based active step
  completed: boolean;
};

export const DEFAULT_DRAFT: ProfileDraft = {
  name: "",
  avatarId: "nova",
  slogan: "I debug before I guess",
  pathId: "fundamentals",
  experienceId: "beginner",
  step: 0,
  completed: false,
};

export const STEPS = [
  "Your Identity",
  "Learning Goal",
  "Experience Level",
  "Confirm",
] as const;

export type Avatar = {
  id: string;
  label: string;
  icon: LucideIcon;
  gradient: string; // tailwind gradient classes
};

export const AVATARS: Avatar[] = [
  {
    id: "nova",
    label: "Nova",
    icon: User,
    gradient: "from-violet-600/40 to-indigo-500/20",
  },
  {
    id: "ada",
    label: "Ada",
    icon: UserRound,
    gradient: "from-emerald-500/40 to-teal-500/20",
  },
  {
    id: "lin",
    label: "Lin",
    icon: User,
    gradient: "from-electric-500/40 to-sky-500/20",
  },
  {
    id: "rae",
    label: "Rae",
    icon: UserRound,
    gradient: "from-fuchsia-500/40 to-violet-500/20",
  },
  {
    id: "unit",
    label: "Unit-07",
    icon: Bot,
    gradient: "from-slate-500/40 to-electric-500/20",
  },
];

export const SLOGANS: string[] = [
  "I debug before I guess",
  "Async problems fear me",
  "Logs tell the truth",
  "Ship, observe, improve",
  "Find the root cause",
];

export type LearningGoal = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  focus: string;
};

export const PATHS: LearningGoal[] = [
  {
    id: "fundamentals",
    title: "Node.js Fundamentals",
    description:
      "Build confidence with async JavaScript, the event loop, promises, and errors.",
    icon: Braces,
    focus: "Async JavaScript · Event loop",
  },
  {
    id: "apis",
    title: "Backend APIs",
    description:
      "Practice debugging APIs, authentication, validation, and request performance.",
    icon: Server,
    focus: "APIs · Auth · Validation",
  },
  {
    id: "debugging",
    title: "Production Debugging",
    description:
      "Investigate realistic logs, metrics, traces, memory, and worker failures.",
    icon: Bug,
    focus: "Logs · Metrics · Traces",
  },
  {
    id: "interview",
    title: "Node.js Interview Prep",
    description:
      "Prepare for practical Node.js and backend interview scenarios.",
    icon: MessagesSquare,
    focus: "Interview scenarios",
  },
];

export type ExperienceLevel = {
  id: string;
  title: string;
  description: string;
  /**
   * Experience is not a rank — it only tunes which Node.js incidents we
   * recommend first and how much guidance each one carries.
   */
  personalization: string;
};

export const EXPERIENCE_LEVELS: ExperienceLevel[] = [
  {
    id: "beginner",
    title: "Beginner",
    description: "I'm new to Node.js and backend debugging.",
    personalization: "We'll start you on the gentlest incidents.",
  },
  {
    id: "junior",
    title: "Junior",
    description: "I've built Node.js services and want more practice.",
    personalization: "We'll recommend incidents with a bit more moving parts.",
  },
  {
    id: "mid",
    title: "Mid-Level+",
    description: "I ship Node.js backends and want a sharper edge.",
    personalization: "We'll point you at the messier production incidents.",
  },
];

/* ------------------------- Recommended first mission -------------------- */

export type RecommendedMission = { id: string; title: string };

const RECOMMENDED_BY_EXPERIENCE: Record<string, RecommendedMission> = {
  beginner: { id: "event-loop-overload", title: "Event Loop Overload" },
  junior: {
    id: "promise-all-cascade",
    title: "Promise.all Failure Cascade",
  },
  mid: {
    id: "user-signup-latency-spike",
    title: "User Signup Latency Spike",
  },
};

/**
 * A small static suggestion — not personalization. Unknown ids (including
 * experience levels saved by older builds) fall back to the beginner mission.
 */
export function recommendedStartingMission(
  experienceId: string,
): RecommendedMission {
  return (
    RECOMMENDED_BY_EXPERIENCE[experienceId] ??
    RECOMMENDED_BY_EXPERIENCE.beginner
  );
}

// ---- localStorage helpers (guarded for SSR) ----

export function loadDraft(): ProfileDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ProfileDraft>;
    return { ...DEFAULT_DRAFT, ...parsed };
  } catch {
    return null;
  }
}

export function saveDraft(draft: ProfileDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}
