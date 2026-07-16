import {
  Database,
  FileText,
  GitBranch,
  LineChart,
  Code2,
  type LucideIcon,
} from "lucide-react";

/* -------------------------------- Types --------------------------------- */

export type InvestigationToolId =
  | "logs"
  | "metrics"
  | "code"
  | "database"
  | "trace";

export type InvestigationTool = {
  id: InvestigationToolId;
  label: string;
  icon: LucideIcon;
};

/**
 * Per-tool copy. Lives on the mission rather than the tool registry because the
 * wording is scenario-specific: "the orders endpoint" means nothing on a signup
 * mission. Hints must not give the root cause away before the diagnosis.
 */
export type ToolCopy = { description: string; hint: string };

export type EvidenceItem = {
  id: string;
  source: InvestigationToolId;
  title: string;
  description: string;
  /** Key evidence moves the player toward the diagnosis; the rest is context. */
  isKeyEvidence: boolean;
};

export type InvestigationState = {
  activeTool: InvestigationToolId;
  collectedEvidenceIds: string[];
};

export type LogLevel = "INFO" | "DEBUG" | "SQL" | "WARN";

export type LogLine = {
  id: string;
  time: string;
  level: LogLevel;
  message: string;
  /** Selecting this line and marking it collects the evidence. */
  evidenceId?: string;
};

export type MetricCard = {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: "critical" | "warning" | "normal";
  evidenceId?: string;
};

export type CodeLine = {
  n: number;
  text: string;
  evidenceId?: string;
};

export type DatabaseStat = {
  id: string;
  label: string;
  value: string;
  detail?: string;
  evidenceId?: string;
};

/** One span of a request trace. Bar widths are derived from `ms` / root `ms`. */
export type TraceSpan = {
  id: string;
  label: string;
  ms: number;
  evidenceId?: string;
};

export type Investigation = {
  missionId: string;
  /** Short reminder of what the player is looking for. */
  objective: string;
  /** Key clues needed before the diagnosis unlocks. */
  requiredKeyClues: number;
  /** Tools this mission exposes, in tab order. Content must exist for each. */
  tools: InvestigationToolId[];
  toolCopy: Partial<Record<InvestigationToolId, ToolCopy>>;
  evidence: EvidenceItem[];
  /** Headline + neutral findings reused by the dashboard's "next action" card. */
  summary: {
    headline: { label: string; value: string };
    findings: string[];
  };
  logs: {
    service: string;
    window: string;
    lines: LogLine[];
  };
  metrics: {
    cards: MetricCard[];
    latency: {
      caption: string;
      unit: string;
      /** Response time samples, oldest → newest. */
      series: number[];
      /** Index in `series` where the release landed. */
      deployAt: number;
      /** Marker label, e.g. "Deploy v2.8.1". */
      deployLabel: string;
    };
  };
  code: {
    file: string;
    language: string;
    lines: CodeLine[];
  };
  database: {
    caption: string;
    stats: DatabaseStat[];
    /** Optional callout — only N+1-style scenarios have a query worth pinning. */
    queryCallout?: { label: string; sql: string };
  };
  /** Only missions whose `tools` include "trace". */
  trace?: {
    caption: string;
    root: { label: string; ms: number };
    spans: TraceSpan[];
  };
};

/* -------------------------------- Tools --------------------------------- */

/** Registry of every tool the workspace can render. Missions pick a subset. */
export const INVESTIGATION_TOOLS: InvestigationTool[] = [
  { id: "logs", label: "Logs", icon: FileText },
  { id: "metrics", label: "Metrics", icon: LineChart },
  { id: "code", label: "Code", icon: Code2 },
  { id: "database", label: "Database", icon: Database },
  { id: "trace", label: "Trace", icon: GitBranch },
];

const DEFAULT_TOOL_COPY: Record<InvestigationToolId, ToolCopy> = {
  logs: {
    description: "Application logs for the affected endpoint",
    hint: "Select the log lines that look suspicious.",
  },
  metrics: {
    description: "Latency, errors, and resource usage",
    hint: "Select the metrics that stand out.",
  },
  code: {
    description: "The request handler behind this endpoint",
    hint: "Select the lines that stand out.",
  },
  database: {
    description: "Database activity behind a single request",
    hint: "Select the statistics that stand out.",
  },
  trace: {
    description: "Where a single request spends its time",
    hint: "Select the spans that stand out.",
  },
};

/* ------------------------------- Content -------------------------------- */

const SLOW_API_INVESTIGATION: Investigation = {
  missionId: "slow-api-incident",
  objective:
    "Find evidence explaining why the orders endpoint became slow.",
  requiredKeyClues: 3,
  tools: ["logs", "metrics", "code", "database"],

  toolCopy: {
    logs: {
      description: "Application logs for the orders endpoint",
      hint: "Select the log lines that look suspicious.",
    },
    metrics: {
      description: "Latency, errors, and resource usage",
      hint: "Select the metrics that explain the slowdown.",
    },
    code: {
      description: "The request handler shipped in the last deploy",
      hint: "Select the lines responsible for the extra database work.",
    },
    database: {
      description: "Query activity behind a single request",
      hint: "Select the query statistics that stand out.",
    },
  },

  summary: {
    headline: { label: "Average Response Time", value: "2.4s" },
    findings: [
      "High response times detected in the order service.",
      "The same order_items query repeats for every order returned.",
    ],
  },

  evidence: [
    {
      id: "latency-spike",
      source: "metrics",
      title: "Orders API latency increased",
      description:
        "Average response time increased from 180ms to approximately 2.4s after the deployment.",
      isKeyEvidence: true,
    },
    {
      id: "repeated-item-queries",
      source: "logs",
      title: "Repeated order item queries",
      description:
        "The same order_items query pattern runs once for every returned order.",
      isKeyEvidence: true,
    },
    {
      id: "query-inside-loop",
      source: "code",
      title: "Database request inside loop",
      description: "The service loads order items separately for each order.",
      isKeyEvidence: true,
    },
    {
      id: "query-count-scales",
      source: "database",
      title: "Query count tracks the number of orders",
      description:
        "One request returning 48 orders executed 49 SQL queries against the database.",
      isKeyEvidence: true,
    },
    {
      id: "normal-cpu",
      source: "metrics",
      title: "Application CPU remains normal",
      description:
        "CPU usage did not increase significantly during the slowdown.",
      isKeyEvidence: false,
    },
  ],

  logs: {
    service: "orders-service",
    window: "Last 15 min",
    lines: [
      {
        id: "l1",
        time: "14:32:07.001",
        level: "INFO",
        message: "GET /api/orders?page=1&limit=20  userId=123  start",
      },
      {
        id: "l2",
        time: "14:32:07.004",
        level: "SQL",
        message: "SELECT * FROM orders WHERE user_id = $1  [123]",
      },
      {
        id: "l3",
        time: "14:32:07.061",
        level: "SQL",
        message: "SELECT * FROM order_items WHERE order_id = $1  [87341]",
        evidenceId: "repeated-item-queries",
      },
      {
        id: "l4",
        time: "14:32:07.104",
        level: "SQL",
        message: "SELECT * FROM order_items WHERE order_id = $1  [87342]",
        evidenceId: "repeated-item-queries",
      },
      {
        id: "l5",
        time: "14:32:07.149",
        level: "SQL",
        message: "SELECT * FROM order_items WHERE order_id = $1  [87343]",
        evidenceId: "repeated-item-queries",
      },
      {
        id: "l6",
        time: "14:32:07.193",
        level: "DEBUG",
        message: "… 45 more order_items lookups in this request",
        evidenceId: "repeated-item-queries",
      },
      {
        id: "l7",
        time: "14:32:09.381",
        level: "WARN",
        message: "High API response time: 2384ms  (threshold: 1000ms)",
      },
      {
        id: "l8",
        time: "14:32:09.385",
        level: "INFO",
        message: "GET /api/orders 200 2384ms",
      },
      {
        id: "l9",
        time: "14:32:11.002",
        level: "INFO",
        message: "GET /api/orders?page=2&limit=20  userId=451  start",
      },
      {
        id: "l10",
        time: "14:32:13.413",
        level: "INFO",
        message: "GET /api/orders 200 2411ms",
      },
    ],
  },

  metrics: {
    cards: [
      {
        id: "m-latency",
        label: "Avg response time",
        value: "2.4s",
        detail: "Was 180ms before the v2.8.1 deploy",
        tone: "critical",
        evidenceId: "latency-spike",
      },
      {
        id: "m-errors",
        label: "Error rate",
        value: "0.4%",
        detail: "Unchanged — requests succeed, they are just slow",
        tone: "normal",
      },
      {
        id: "m-cpu",
        label: "App CPU usage",
        value: "34%",
        detail: "Flat across the slowdown",
        tone: "normal",
        evidenceId: "normal-cpu",
      },
      {
        id: "m-queries",
        label: "DB queries / request",
        value: "49",
        detail: "Was 2 before the deploy",
        tone: "warning",
      },
    ],
    latency: {
      caption: "Orders endpoint response time — last 15 minutes",
      unit: "ms",
      series: [172, 181, 168, 190, 176, 2280, 2384, 2298, 2411, 2352],
      deployAt: 5,
      deployLabel: "Deploy v2.8.1",
    },
  },

  code: {
    file: "src/services/order.service.js",
    language: "JavaScript",
    lines: [
      { n: 12, text: "async function getOrdersForUser(userId) {" },
      { n: 13, text: "  const orders = await orderRepository.find({" },
      { n: 14, text: "    where: { userId }," },
      { n: 15, text: "  });" },
      { n: 16, text: "" },
      {
        n: 17,
        text: "  for (const order of orders) {",
        evidenceId: "query-inside-loop",
      },
      {
        n: 18,
        text: "    order.items = await orderItemRepository.find({",
        evidenceId: "query-inside-loop",
      },
      {
        n: 19,
        text: "      where: { orderId: order.id },",
        evidenceId: "query-inside-loop",
      },
      { n: 20, text: "    });", evidenceId: "query-inside-loop" },
      { n: 21, text: "  }", evidenceId: "query-inside-loop" },
      { n: 22, text: "" },
      { n: 23, text: "  return orders;" },
      { n: 24, text: "}" },
    ],
  },

  database: {
    caption: "Captured from the GET /api/orders request at 14:32:07.",
    stats: [
      { id: "d-requests", label: "Requests sampled", value: "1" },
      { id: "d-orders", label: "Orders returned", value: "48" },
      {
        id: "d-queries",
        label: "SQL queries executed",
        value: "49",
        detail: "1 orders query + 48 follow-up queries",
        evidenceId: "query-count-scales",
      },
      {
        id: "d-avg",
        label: "Average query time",
        value: "42ms",
        detail: "Each query on its own is fast",
      },
    ],
    queryCallout: {
      label: "Most repeated query",
      sql: "SELECT * FROM order_items WHERE order_id = $1",
    },
  },
};

const SIGNUP_LATENCY_INVESTIGATION: Investigation = {
  missionId: "user-signup-latency-spike",
  objective: "Find evidence explaining why signups became slow.",
  requiredKeyClues: 3,
  tools: ["logs", "metrics", "code", "database", "trace"],

  toolCopy: {
    logs: {
      description: "Application logs for the signup endpoint",
      hint: "Select the log lines that look suspicious.",
    },
    metrics: {
      description: "Signup latency, dependencies, and resource usage",
      hint: "Select the metrics that explain the slowdown.",
    },
    code: {
      description: "The registration service behind POST /api/signup",
      hint: "Select the lines that shape how long the request takes.",
    },
    database: {
      description: "Database activity behind a single signup",
      hint: "Select the statistics that stand out.",
    },
    trace: {
      description: "Where a single signup request spends its time",
      hint: "Select the spans that dominate the request.",
    },
  },

  summary: {
    headline: { label: "Signup p95", value: "3.2s" },
    findings: [
      "Signup p95 climbed from roughly 420ms to 3.2s after the last release.",
      "The database insert and password hashing both stayed fast.",
    ],
  },

  evidence: [
    {
      id: "signup-latency-spike",
      source: "metrics",
      title: "Signup latency increased",
      description:
        "Signup p95 increased from approximately 420ms to 3.2 seconds.",
      isKeyEvidence: true,
    },
    {
      id: "email-provider-latency",
      source: "trace",
      title: "Welcome email dominates request time",
      description:
        "The welcome-email operation takes approximately 2.7 seconds inside the signup request.",
      isKeyEvidence: true,
    },
    {
      id: "awaited-email-operation",
      source: "code",
      title: "Email operation blocks the HTTP response",
      description:
        "The registration service awaits welcome-email delivery before returning the user response.",
      isKeyEvidence: true,
    },
    {
      id: "response-waits-for-email",
      source: "logs",
      title: "The response is logged after the email finishes",
      description:
        "The signup request only completes once the welcome email has been sent.",
      isKeyEvidence: true,
    },
    {
      id: "database-is-healthy",
      source: "database",
      title: "Database insert is fast",
      description:
        "The user insert completes in approximately 31ms with no slow queries or lock waits.",
      isKeyEvidence: false,
    },
    {
      id: "cpu-is-normal",
      source: "metrics",
      title: "Application CPU remains normal",
      description: "CPU usage remains stable during signup latency spikes.",
      isKeyEvidence: false,
    },
  ],

  logs: {
    service: "auth-service",
    window: "Last 15 min",
    lines: [
      {
        id: "s1",
        time: "10:41:20.102",
        level: "INFO",
        message: "POST /api/signup started",
      },
      {
        id: "s2",
        time: "10:41:20.145",
        level: "INFO",
        message: "Validating signup payload",
      },
      {
        id: "s3",
        time: "10:41:20.302",
        level: "INFO",
        message: "Password hash completed in 154ms",
      },
      {
        id: "s4",
        time: "10:41:20.338",
        level: "INFO",
        message: "User record inserted in 31ms",
        evidenceId: "database-is-healthy",
      },
      {
        id: "s5",
        time: "10:41:20.341",
        level: "INFO",
        message: "Sending welcome email",
        evidenceId: "response-waits-for-email",
      },
      {
        id: "s6",
        time: "10:41:23.012",
        level: "INFO",
        message: "Welcome email sent in 2671ms",
        evidenceId: "response-waits-for-email",
      },
      {
        id: "s7",
        time: "10:41:23.018",
        level: "INFO",
        message: "POST /api/signup completed in 2916ms",
        evidenceId: "response-waits-for-email",
      },
    ],
  },

  metrics: {
    cards: [
      {
        id: "sm-p95",
        label: "Signup API p95",
        value: "3.2s",
        detail: "Was 420ms before the 4.2.0 release",
        tone: "critical",
        evidenceId: "signup-latency-spike",
      },
      {
        id: "sm-email",
        label: "Email provider latency",
        value: "2.7s",
        detail: "Measured at the provider's API boundary",
        tone: "warning",
        evidenceId: "email-provider-latency",
      },
      {
        id: "sm-insert",
        label: "Database insert time",
        value: "31ms",
        detail: "Unchanged across the spike",
        tone: "normal",
        evidenceId: "database-is-healthy",
      },
      {
        id: "sm-hash",
        label: "Password hashing time",
        value: "154ms",
        detail: "Expected for the configured cost factor",
        tone: "normal",
      },
      {
        id: "sm-cpu",
        label: "App CPU usage",
        value: "38%",
        detail: "Flat across the slowdown",
        tone: "normal",
        evidenceId: "cpu-is-normal",
      },
      {
        id: "sm-errors",
        label: "Error rate",
        value: "0.3%",
        detail: "Unchanged — signups succeed, they are just slow",
        tone: "normal",
      },
    ],
    latency: {
      caption: "Signup endpoint p95 — last 15 minutes",
      unit: "ms",
      series: [412, 428, 405, 431, 419, 3140, 3208, 3172, 3241, 3186],
      deployAt: 5,
      deployLabel: "Release 4.2.0",
    },
  },

  code: {
    file: "src/modules/auth/registration.service.ts",
    language: "TypeScript",
    lines: [
      { n: 18, text: "async registerUser(input: RegisterUserDto) {" },
      {
        n: 19,
        text: "  const passwordHash = await this.passwordService.hash(input.password);",
      },
      { n: 20, text: "" },
      { n: 21, text: "  const user = await this.userRepository.create({" },
      { n: 22, text: "    ...input," },
      { n: 23, text: "    password: passwordHash," },
      { n: 24, text: "  });" },
      { n: 25, text: "" },
      {
        n: 26,
        text: "  await this.emailService.sendWelcomeEmail(user.email);",
        evidenceId: "awaited-email-operation",
      },
      { n: 27, text: "" },
      { n: 28, text: "  return user;" },
      { n: 29, text: "}" },
    ],
  },

  database: {
    caption: "Captured from the POST /api/signup request at 10:41:20.",
    stats: [
      {
        id: "sd-insert",
        label: "INSERT INTO users",
        value: "31ms",
        detail: "Execution time for the signup insert",
        evidenceId: "database-is-healthy",
      },
      {
        id: "sd-connections",
        label: "Database connections",
        value: "Healthy",
        detail: "Pool well below saturation",
      },
      { id: "sd-locks", label: "Lock waits", value: "0" },
      { id: "sd-slow", label: "Slow queries", value: "None" },
      { id: "sd-rows", label: "Rows inserted", value: "1" },
    ],
  },

  trace: {
    caption: "One signup request, broken down by span.",
    root: { label: "POST /api/signup", ms: 2916 },
    spans: [
      { id: "st-validate", label: "validate payload", ms: 12 },
      { id: "st-hash", label: "hash password", ms: 154 },
      {
        id: "st-insert",
        label: "insert user",
        ms: 31,
        evidenceId: "database-is-healthy",
      },
      {
        id: "st-email",
        label: "send welcome email",
        ms: 2671,
        evidenceId: "email-provider-latency",
      },
    ],
  },
};

/* ------------------------------- Registry ------------------------------- */

/**
 * Investigation content is hand-authored per mission: unlike a briefing it
 * cannot be derived from the mission model, because it needs real logs, code
 * and traces. The route looks a mission up by slug — missions without an entry
 * fall back to the "not authored yet" state.
 */
export const investigationConfigs: Record<string, Investigation> = {
  "slow-api-incident": SLOW_API_INVESTIGATION,
  "user-signup-latency-spike": SIGNUP_LATENCY_INVESTIGATION,
};

/* ------------------------------- Helpers -------------------------------- */

export function getInvestigation(missionId: string): Investigation | undefined {
  return investigationConfigs[missionId];
}

export const INVESTIGATABLE_MISSION_IDS = Object.keys(investigationConfigs);

/** The tools a mission exposes, in registry order, with resolved copy. */
export function toolsFor(
  investigation: Investigation,
): (InvestigationTool & ToolCopy)[] {
  return investigation.tools
    .map((id) => INVESTIGATION_TOOLS.find((t) => t.id === id))
    .filter((t): t is InvestigationTool => Boolean(t))
    .map((tool) => ({
      ...tool,
      ...DEFAULT_TOOL_COPY[tool.id],
      ...investigation.toolCopy[tool.id],
    }));
}

export function keyEvidence(investigation: Investigation): EvidenceItem[] {
  return investigation.evidence.filter((e) => e.isKeyEvidence);
}

export function findEvidence(
  investigation: Investigation,
  id: string,
): EvidenceItem | undefined {
  return investigation.evidence.find((e) => e.id === id);
}

/* ------------------------- Persistence (localStorage) ------------------- */

export function investigationStorageKey(missionId: string): string {
  return `coderaid:${missionId}:investigation`;
}

/**
 * Restores a mission's progress. `allowedTools` is the mission's own tool list,
 * so a tab saved on one mission can never restore on another that lacks it.
 */
export function loadInvestigationState(
  missionId: string,
  allowedTools: InvestigationToolId[],
): InvestigationState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(investigationStorageKey(missionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<InvestigationState>;
    const ids = Array.isArray(parsed.collectedEvidenceIds)
      ? parsed.collectedEvidenceIds.filter(
          (id): id is string => typeof id === "string",
        )
      : [];
    const tool = allowedTools.includes(parsed.activeTool as InvestigationToolId)
      ? (parsed.activeTool as InvestigationToolId)
      : allowedTools[0];
    return { activeTool: tool, collectedEvidenceIds: ids };
  } catch {
    return null;
  }
}

export function saveInvestigationState(
  missionId: string,
  state: InvestigationState,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      investigationStorageKey(missionId),
      JSON.stringify(state),
    );
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

/* ------------------------------- Styling -------------------------------- */

export const LOG_LEVEL_BADGE: Record<LogLevel, string> = {
  INFO: "border-electric-400/30 bg-electric-500/10 text-electric-300",
  DEBUG: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  SQL: "border-violet-400/30 bg-violet-500/10 text-violet-300",
  WARN: "border-amber-400/30 bg-amber-500/10 text-amber-300",
};

export const METRIC_TONE: Record<MetricCard["tone"], string> = {
  critical: "text-rose-300",
  warning: "text-amber-300",
  normal: "text-emerald-300",
};

export const EVIDENCE_SOURCE_META: Record<
  InvestigationToolId,
  { label: string; icon: LucideIcon; cls: string }
> = {
  logs: {
    label: "Logs",
    icon: FileText,
    cls: "border-electric-400/25 bg-electric-500/10 text-electric-300",
  },
  metrics: {
    label: "Metrics",
    icon: LineChart,
    cls: "border-amber-400/25 bg-amber-500/10 text-amber-300",
  },
  code: {
    label: "Code",
    icon: Code2,
    cls: "border-violet-400/25 bg-violet-500/10 text-violet-300",
  },
  database: {
    label: "Database",
    icon: Database,
    cls: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
  },
  trace: {
    label: "Trace",
    icon: GitBranch,
    cls: "border-rose-400/25 bg-rose-500/10 text-rose-300",
  },
};
