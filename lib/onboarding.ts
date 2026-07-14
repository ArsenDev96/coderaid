import {
  Bot,
  Braces,
  Bug,
  Database,
  GitBranch,
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
  slogan: "Code. Debug. Deploy. Repeat.",
  pathId: "backend",
  experienceId: "intern",
  step: 0,
  completed: false,
};

export const STEPS = [
  "Your Identity",
  "Choose Path",
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
  "Code. Debug. Deploy. Repeat.",
  "Ship it. Fix it. Own it.",
  "Root cause or bust.",
  "Turning incidents into XP.",
  "Always on call, always leveling up.",
];

export type EngineerPath = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  focus: string;
};

export const PATHS: EngineerPath[] = [
  {
    id: "backend",
    title: "Backend Engineering",
    description: "APIs, services, and async workloads on Node.js.",
    icon: Braces,
    focus: "JavaScript · Node.js",
  },
  {
    id: "data",
    title: "Data & SQL",
    description: "Query performance, schema design, and N+1 hunting.",
    icon: Database,
    focus: "SQL · Databases",
  },
  {
    id: "reliability",
    title: "Debugging & Incidents",
    description: "Read traces, chase root causes, resolve production fires.",
    icon: Bug,
    focus: "Debugging · Observability",
  },
  {
    id: "architecture",
    title: "System Design",
    description: "Scale services and design resilient architectures.",
    icon: GitBranch,
    focus: "Architecture · Scale",
  },
];

export type ExperienceLevel = {
  id: string;
  title: string;
  description: string;
  startingRank: string;
};

export const EXPERIENCE_LEVELS: ExperienceLevel[] = [
  {
    id: "intern",
    title: "New to backend",
    description: "I'm just getting started with servers, APIs, and databases.",
    startingRank: "Intern Engineer",
  },
  {
    id: "junior",
    title: "Some experience",
    description: "I'm comfortable with Node.js and basic SQL.",
    startingRank: "Junior Backend Engineer",
  },
  {
    id: "mid",
    title: "Experienced",
    description: "I ship backend code and want to sharpen my edge.",
    startingRank: "Mid-Level Engineer",
  },
];

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
