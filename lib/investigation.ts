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

export type LogLevel = "INFO" | "DEBUG" | "SQL" | "WARN" | "ERROR";

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
  tools: ["logs", "metrics", "code", "database", "trace"],

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
    trace: {
      description: "Where a single GET /api/orders request spends its time",
      hint: "Look at how many spans there are, not just how long each one is.",
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
      id: "per-query-time-fast",
      source: "database",
      title: "Each query on its own is fast",
      description:
        "The repeated order_items lookup averages 42ms. Nothing about a single query is slow — there are simply dozens of them.",
      isKeyEvidence: true,
    },
    {
      id: "repeated-spans-in-trace",
      source: "trace",
      title: "The trace is mostly repeated spans",
      description:
        "One request contains 48 near-identical order_items spans that run back to back after the initial orders query.",
      isKeyEvidence: true,
    },
    {
      id: "latency-scales-with-order-count",
      source: "metrics",
      title: "Latency tracks the number of orders returned",
      description:
        "Requests returning 8 orders complete in ~420ms; requests returning 48 orders take ~2.4s. Response time grows with the size of the result set, not with traffic.",
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
    {
      id: "database-healthy",
      source: "metrics",
      title: "The database itself is healthy",
      description:
        "Database CPU sits at 22%, connection-pool wait is 3ms and no query appears in the slow-query log.",
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
      {
        id: "m-scaling",
        label: "Latency by page size",
        value: "420ms → 2.4s",
        detail: "8 orders returned vs 48 orders returned, same endpoint",
        tone: "critical",
        evidenceId: "latency-scales-with-order-count",
      },
      {
        id: "m-db-health",
        label: "Database CPU / pool wait",
        value: "22% / 3ms",
        detail: "The database is idle enough to take far more work",
        tone: "normal",
        evidenceId: "database-healthy",
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
        evidenceId: "per-query-time-fast",
      },
      {
        id: "d-slow-log",
        label: "Queries in the slow-query log",
        value: "0",
        detail: "Nothing crossed the 500ms threshold",
      },
    ],
    queryCallout: {
      label: "Most repeated query",
      sql: "SELECT * FROM order_items WHERE order_id = $1",
    },
  },

  trace: {
    caption: "GET /api/orders — one request, 48 orders returned",
    root: { label: "GET /api/orders", ms: 2384 },
    spans: [
      { id: "t-handler", label: "orders.controller → getOrdersForUser", ms: 2380 },
      { id: "t-orders", label: "SELECT orders WHERE user_id", ms: 51 },
      {
        id: "t-items-1",
        label: "SELECT order_items WHERE order_id = 87341",
        ms: 43,
        evidenceId: "repeated-spans-in-trace",
      },
      {
        id: "t-items-2",
        label: "SELECT order_items WHERE order_id = 87342",
        ms: 41,
        evidenceId: "repeated-spans-in-trace",
      },
      {
        id: "t-items-3",
        label: "SELECT order_items WHERE order_id = 87343",
        ms: 44,
        evidenceId: "repeated-spans-in-trace",
      },
      {
        id: "t-items-rest",
        label: "… 45 more order_items spans, 42ms average",
        ms: 1890,
        evidenceId: "repeated-spans-in-trace",
      },
      { id: "t-serialize", label: "JSON serialization", ms: 18 },
    ],
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
    {
      id: "no-errors-in-logs",
      source: "logs",
      title: "No errors or retries during the slowdown",
      description:
        "Every signup in the window returned 201. Nothing failed, nothing was retried — the requests are slow, not broken, which rules out failure-driven causes.",
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
      {
        id: "s8",
        time: "10:41:23.020",
        level: "INFO",
        message:
          "signup window summary  requests=1284  status_201=1284  errors=0  retries=0",
        evidenceId: "no-errors-in-logs",
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

const EVENT_LOOP_INVESTIGATION: Investigation = {
  missionId: "event-loop-overload",
  objective:
    "Find evidence explaining why every endpoint slowed down after the reporting deploy.",
  requiredKeyClues: 3,
  tools: ["logs", "metrics", "code", "trace", "database"],

  toolCopy: {
    logs: {
      description: "Application logs for api-service around the 3.8.0 deploy",
      hint: "Select the log lines that look suspicious.",
    },
    metrics: {
      description: "Runtime, latency and resource usage across the whole API",
      hint: "Select the metrics that explain why every route got slower.",
    },
    code: {
      description: "The reporting endpoint shipped in the last deploy",
      hint: "Select the lines that decide how long the main thread is busy.",
    },
    trace: {
      description: "Where a single weekly-report request spends its time",
      hint: "Select the spans that dominate the request.",
    },
    database: {
      description: "Database activity behind the reporting query",
      hint: "Select the statistics that stand out — or rule the database out.",
    },
  },

  summary: {
    headline: { label: "Event-Loop Lag (p95)", value: "6.8s" },
    findings: [
      "API latency rose across every endpoint after the api-service 3.8.0 deploy.",
      "Database query time and heap usage both stayed flat through the incident.",
    ],
  },

  evidence: [
    {
      id: "event-loop-lag-spike",
      source: "metrics",
      title: "Event-loop lag spiked after the deploy",
      description:
        "Event-loop lag went from roughly 4ms to 6.8 seconds once api-service 3.8.0 shipped.",
      isKeyEvidence: true,
    },
    {
      id: "cpu-saturated",
      source: "metrics",
      title: "CPU usage rose sharply",
      description:
        "Application CPU climbed from about 31% to 96% and stayed there — the process is computing, not waiting.",
      isKeyEvidence: true,
    },
    {
      id: "report-generation-dominates",
      source: "trace",
      title: "Report aggregation dominates the request",
      description:
        "Aggregating the weekly report takes roughly 7.2s of a 7.4s request; everything else is milliseconds.",
      isKeyEvidence: true,
    },
    {
      id: "sync-aggregation-in-handler",
      source: "code",
      title: "The report is aggregated inside the request handler",
      description:
        "buildWeeklyReport() walks every event on the main thread before the handler responds.",
      isKeyEvidence: true,
    },
    {
      id: "unrelated-endpoints-delayed",
      source: "logs",
      title: "Unrelated endpoints are delayed too",
      description:
        "/api/health and /api/users/me respond seconds late while a weekly report is being built.",
      isKeyEvidence: true,
    },
    {
      id: "database-not-saturated",
      source: "database",
      title: "The database is not saturated",
      description:
        "The reporting query runs in ~128ms with a healthy pool, no lock waits and no slow-query increase.",
      isKeyEvidence: false,
    },
    {
      id: "memory-is-stable",
      source: "metrics",
      title: "Heap usage is stable",
      description:
        "Heap used is flat with no growth trend, and there are no out-of-memory events.",
      isKeyEvidence: false,
    },
    {
      id: "report-record-volume",
      source: "logs",
      title: "The weekly report covers 480,000 records",
      description:
        "Each report run reads roughly 480,000 analytics events from the last seven days.",
      isKeyEvidence: false,
    },
  ],

  logs: {
    service: "api-service",
    window: "Last 15 min",
    lines: [
      {
        id: "e1",
        time: "10:14:01.204",
        level: "INFO",
        message: "deploy completed  service=api-service  version=3.8.0",
      },
      {
        id: "e2",
        time: "10:14:09.112",
        level: "INFO",
        message: "request started  method=GET  path=/api/reports/weekly",
      },
      {
        id: "e3",
        time: "10:14:09.118",
        level: "INFO",
        message: "building weekly report  records=480000",
        evidenceId: "report-record-volume",
      },
      {
        id: "e4",
        time: "10:14:11.476",
        level: "DEBUG",
        message: "request received  method=GET  path=/api/health",
      },
      {
        id: "e5",
        time: "10:14:15.842",
        level: "WARN",
        message: "request timeout  path=/api/users/me  duration_ms=5031",
        evidenceId: "unrelated-endpoints-delayed",
      },
      {
        id: "e6",
        time: "10:14:16.431",
        level: "WARN",
        message: "GET /api/health 200 4955ms  (queued 4948ms)",
        evidenceId: "unrelated-endpoints-delayed",
      },
      {
        id: "e7",
        time: "10:14:16.437",
        level: "INFO",
        message: "weekly report generated  duration_ms=7319",
        evidenceId: "report-record-volume",
      },
      {
        id: "e8",
        time: "10:14:16.439",
        level: "WARN",
        message: "event_loop_lag_ms=6840",
        evidenceId: "event-loop-lag-spike",
      },
      {
        id: "e9",
        time: "10:14:16.441",
        level: "INFO",
        message: "GET /api/reports/weekly 200 7420ms",
      },
      {
        id: "e10",
        time: "10:14:16.512",
        level: "INFO",
        message: "GET /api/products 200 4812ms",
        evidenceId: "unrelated-endpoints-delayed",
      },
    ],
  },

  metrics: {
    cards: [
      {
        id: "em-lag",
        label: "Event-loop lag p95",
        value: "6.8s",
        detail: "Was ~4ms before the 3.8.0 deploy",
        tone: "critical",
        evidenceId: "event-loop-lag-spike",
      },
      {
        id: "em-cpu",
        label: "App CPU usage",
        value: "96%",
        detail: "Was 31% — the process is busy computing",
        tone: "critical",
        evidenceId: "cpu-saturated",
      },
      {
        id: "em-p95",
        label: "API p95 (all routes)",
        value: "5.2s",
        detail: "Was 240ms — health and product routes too",
        tone: "critical",
        evidenceId: "unrelated-endpoints-delayed",
      },
      {
        id: "em-db",
        label: "Database query time",
        value: "42ms",
        detail: "Unchanged across the incident",
        tone: "normal",
        evidenceId: "database-not-saturated",
      },
      {
        id: "em-heap",
        label: "Heap used",
        value: "512 MB",
        detail: "Flat — no growth trend, no OOM events",
        tone: "normal",
        evidenceId: "memory-is-stable",
      },
      {
        id: "em-timeouts",
        label: "Timeout rate",
        value: "8.4%",
        detail: "Was 0.2% — requests queue rather than fail outright",
        tone: "warning",
      },
      {
        id: "em-throughput",
        label: "Throughput",
        value: "85 req/min",
        detail: "Was 210 req/min before the deploy",
        tone: "warning",
      },
    ],
    latency: {
      caption: "API p95 across every endpoint — last 15 minutes",
      unit: "ms",
      series: [232, 241, 228, 236, 5180, 5240, 5195, 5312, 5228, 5264],
      deployAt: 4,
      deployLabel: "Deploy v3.8.0",
    },
  },

  code: {
    file: "src/modules/reports/report.controller.ts",
    language: "TypeScript",
    lines: [
      { n: 22, text: "async getWeeklyReport(req: Request, res: Response) {" },
      {
        n: 23,
        text: "  const events = await this.analyticsRepository.findRecentEvents({",
      },
      { n: 24, text: "    since: startOfWeek()," },
      { n: 25, text: "  });" },
      { n: 26, text: "" },
      {
        n: 27,
        text: "  const report = buildWeeklyReport(events);",
        evidenceId: "sync-aggregation-in-handler",
      },
      { n: 28, text: "" },
      { n: 29, text: "  return res.json(report);" },
      { n: 30, text: "}" },
      { n: 31, text: "" },
      {
        n: 32,
        text: "function buildWeeklyReport(events: AnalyticsEvent[]): ReportRow[] {",
        evidenceId: "sync-aggregation-in-handler",
      },
      { n: 33, text: "  const rows: ReportRow[] = [];" },
      { n: 34, text: "" },
      {
        n: 35,
        text: "  for (const event of events) {",
        evidenceId: "sync-aggregation-in-handler",
      },
      {
        n: 36,
        text: "    const row = rows.find((r) => r.key === bucketKey(event));",
        evidenceId: "sync-aggregation-in-handler",
      },
      {
        n: 37,
        text: "    if (row) row.add(event);",
        evidenceId: "sync-aggregation-in-handler",
      },
      {
        n: 38,
        text: "    else rows.push(newRow(event));",
        evidenceId: "sync-aggregation-in-handler",
      },
      { n: 39, text: "  }", evidenceId: "sync-aggregation-in-handler" },
      { n: 40, text: "" },
      { n: 41, text: "  return rows.sort(byTotalDesc);" },
      { n: 42, text: "}" },
    ],
  },

  database: {
    caption: "Captured from the GET /api/reports/weekly request at 10:14:09.",
    stats: [
      {
        id: "ed-query",
        label: "Analytics events query",
        value: "128ms",
        detail: "One query, fetched in a single pass",
        evidenceId: "database-not-saturated",
      },
      {
        id: "ed-pool",
        label: "Connection pool",
        value: "6 / 20 in use",
        detail: "Well below saturation",
        evidenceId: "database-not-saturated",
      },
      { id: "ed-locks", label: "Lock waits", value: "0" },
      {
        id: "ed-slow",
        label: "Slow queries",
        value: "None",
        detail: "No increase since the 3.8.0 deploy",
      },
      {
        id: "ed-rows",
        label: "Rows returned",
        value: "480,000",
        detail: "Large, but the read itself is fast",
        evidenceId: "report-record-volume",
      },
    ],
  },

  trace: {
    caption:
      "One weekly-report request, plus the health check that arrived while it was running.",
    root: { label: "GET /api/reports/weekly", ms: 7420 },
    spans: [
      { id: "et-auth", label: "auth validation", ms: 8 },
      {
        id: "et-db",
        label: "database fetch",
        ms: 128,
        evidenceId: "database-not-saturated",
      },
      {
        id: "et-aggregate",
        label: "report aggregation",
        ms: 7190,
        evidenceId: "report-generation-dominates",
      },
      { id: "et-serialize", label: "serialization", ms: 62 },
      {
        id: "et-health",
        label: "GET /api/health (queued behind the report)",
        ms: 4955,
        evidenceId: "unrelated-endpoints-delayed",
      },
    ],
  },
};

const PROMISE_CASCADE_INVESTIGATION: Investigation = {
  missionId: "promise-all-cascade",
  objective:
    "Find evidence explaining why one failing vendor wipes out an entire enrichment run.",
  requiredKeyClues: 3,
  tools: ["logs", "metrics", "code", "trace", "database"],

  toolCopy: {
    logs: {
      description: "Nightly enrichment run for the vendor catalogue",
      hint: "Select the lines that show what the run did with each vendor.",
    },
    metrics: {
      description: "Run outcomes, vendor call volume and persistence",
      hint: "Compare what succeeded with what was actually kept.",
    },
    code: {
      description: "The batch job behind the nightly enrichment",
      hint: "Select the lines that decide what happens when one call fails.",
    },
    trace: {
      description: "One enrichment run, vendor call by vendor call",
      hint: "Watch what the other calls are doing when the run fails.",
    },
    database: {
      description: "What the run persisted",
      hint: "Select the statistics that stand out.",
    },
  },

  summary: {
    headline: { label: "Vendors Enriched", value: "0 / 48" },
    findings: [
      "The 02:00 enrichment run reported a failure and persisted nothing.",
      "47 of the 48 vendor calls in that run returned 200 before it failed.",
    ],
  },

  evidence: [
    {
      id: "run-aborts-on-first-failure",
      source: "logs",
      title: "The run fails the moment one vendor does",
      description:
        "The run is marked failed 2ms after a single vendor returns 503, while 47 others had already succeeded.",
      isKeyEvidence: true,
    },
    {
      id: "successes-discarded",
      source: "metrics",
      title: "Successful vendor results are thrown away",
      description:
        "47 vendor calls returned 200 in the failed run, and zero vendor profiles were written.",
      isKeyEvidence: true,
    },
    {
      id: "promise-all-over-mapped-calls",
      source: "code",
      title: "The batch is awaited with Promise.all",
      description:
        "Every vendor call is started at once and awaited as a single unit, so the batch has one shared outcome.",
      isKeyEvidence: true,
    },
    {
      id: "calls-continue-after-abort",
      source: "trace",
      title: "In-flight calls keep running after the run fails",
      description:
        "Vendor calls complete more than a second after the run was marked failed — nothing cancelled them, their results are just unreachable.",
      isKeyEvidence: true,
    },
    {
      id: "one-vendor-503",
      source: "logs",
      title: "One vendor is returning 503",
      description:
        "The northwind vendor API has been intermittently unavailable since 01:40.",
      isKeyEvidence: false,
    },
    {
      id: "vendor-fleet-otherwise-healthy",
      source: "metrics",
      title: "The rest of the vendor fleet is healthy",
      description:
        "47 of 48 vendor endpoints are responding normally with a 2.1% overall error rate.",
      isKeyEvidence: false,
    },
    {
      id: "no-timeouts-or-throttling",
      source: "logs",
      title: "No timeouts and no rate limiting",
      description:
        "The run produced zero ETIMEDOUT errors and zero 429 responses.",
      isKeyEvidence: false,
    },
    {
      id: "nothing-persisted",
      source: "database",
      title: "The run wrote nothing at all",
      description:
        "No vendor_profiles rows were written, and no write was even attempted.",
      isKeyEvidence: false,
    },
  ],

  logs: {
    service: "enrichment-worker",
    window: "Nightly run 02:00",
    lines: [
      {
        id: "p1",
        time: "02:00:00.104",
        level: "INFO",
        message: "enrichment run started  run=r_4471  vendors=48",
      },
      {
        id: "p2",
        time: "02:00:00.612",
        level: "DEBUG",
        message: "vendor fetch ok  vendor=acme  duration_ms=486",
      },
      {
        id: "p3",
        time: "02:00:00.771",
        level: "DEBUG",
        message: "vendor fetch ok  vendor=brightline  duration_ms=642",
      },
      {
        id: "p4",
        time: "02:00:00.812",
        level: "ERROR",
        message: "vendor fetch failed  vendor=northwind  status=503",
        evidenceId: "one-vendor-503",
      },
      {
        id: "p5",
        time: "02:00:00.814",
        level: "ERROR",
        message:
          'enrichment run failed  run=r_4471  reason="Request failed with status code 503"',
        evidenceId: "run-aborts-on-first-failure",
      },
      {
        id: "p6",
        time: "02:00:01.903",
        level: "DEBUG",
        message: "vendor fetch ok  vendor=zenith  duration_ms=1791",
        evidenceId: "calls-continue-after-abort",
      },
      {
        id: "p7",
        time: "02:00:02.140",
        level: "DEBUG",
        message: "vendor fetch ok  vendor=westgate  duration_ms=2032",
        evidenceId: "calls-continue-after-abort",
      },
      {
        id: "p8",
        time: "02:00:02.144",
        level: "WARN",
        message: "run r_4471 already settled — discarding 47 vendor results",
        evidenceId: "successes-discarded",
      },
      {
        id: "p9",
        time: "02:00:02.150",
        level: "INFO",
        message: "enrichment run finished  run=r_4471  persisted=0",
        evidenceId: "nothing-persisted",
      },
      {
        id: "p10",
        time: "02:00:02.151",
        level: "INFO",
        message: "run summary  timeouts=0  rate_limited=0  retries=0",
        evidenceId: "no-timeouts-or-throttling",
      },
    ],
  },

  metrics: {
    cards: [
      {
        id: "pm-persisted",
        label: "Vendors enriched",
        value: "0 / 48",
        detail: "Nothing was kept from the last five runs",
        tone: "critical",
        evidenceId: "successes-discarded",
      },
      {
        id: "pm-calls-ok",
        label: "Vendor calls returning 200",
        value: "47 / 48",
        detail: "Measured inside the run that reported failure",
        tone: "warning",
        evidenceId: "successes-discarded",
      },
      {
        id: "pm-run-success",
        label: "Run success rate (7d)",
        value: "18%",
        detail: "Was 100% before northwind started flapping",
        tone: "critical",
        evidenceId: "run-aborts-on-first-failure",
      },
      {
        id: "pm-wasted",
        label: "Wasted vendor calls per run",
        value: "47",
        detail: "Completed, billed, and unreachable",
        tone: "warning",
        evidenceId: "calls-continue-after-abort",
      },
      {
        id: "pm-vendor-errors",
        label: "Vendor error rate",
        value: "2.1%",
        detail: "One endpoint of 48 is unhealthy",
        tone: "normal",
        evidenceId: "vendor-fleet-otherwise-healthy",
      },
      {
        id: "pm-timeouts",
        label: "Request timeouts",
        value: "0",
        detail: "No call ran out of time",
        tone: "normal",
        evidenceId: "no-timeouts-or-throttling",
      },
      {
        id: "pm-duration",
        label: "Run duration",
        value: "2.1s",
        detail: "Unchanged — the run is fast, it just keeps nothing",
        tone: "normal",
      },
    ],
    latency: {
      caption: "Vendor profiles persisted per nightly run — last 10 runs",
      unit: "vendors",
      series: [48, 48, 47, 48, 0, 0, 0, 48, 0, 0],
      deployAt: 4,
      deployLabel: "northwind starts flapping",
    },
  },

  code: {
    file: "src/jobs/enrichment.job.ts",
    language: "TypeScript",
    lines: [
      { n: 14, text: "async function runEnrichment(vendors: Vendor[]) {" },
      { n: 15, text: "  const run = await runRepository.start(vendors.length);" },
      { n: 16, text: "" },
      {
        n: 17,
        text: "  const results = await Promise.all(",
        evidenceId: "promise-all-over-mapped-calls",
      },
      {
        n: 18,
        text: "    vendors.map((vendor) => fetchVendorProfile(vendor)),",
        evidenceId: "promise-all-over-mapped-calls",
      },
      { n: 19, text: "  );", evidenceId: "promise-all-over-mapped-calls" },
      { n: 20, text: "" },
      { n: 21, text: "  await profileRepository.saveAll(results);" },
      { n: 22, text: "  return runRepository.complete(run.id, results.length);" },
      { n: 23, text: "}" },
      { n: 24, text: "" },
      { n: 25, text: "async function fetchVendorProfile(vendor: Vendor) {" },
      {
        n: 26,
        text: "  const { data } = await http.get(`/vendors/${vendor.slug}/profile`);",
      },
      { n: 27, text: "  return { vendorId: vendor.id, profile: data };" },
      { n: 28, text: "}" },
    ],
  },

  trace: {
    caption:
      "One nightly run. The run is marked failed at 814ms; 47 vendor calls are still in flight.",
    root: { label: "enrichment run r_4471", ms: 2150 },
    spans: [
      { id: "pt-acme", label: "vendor acme", ms: 486 },
      { id: "pt-brightline", label: "vendor brightline", ms: 642 },
      {
        id: "pt-northwind",
        label: "vendor northwind — 503",
        ms: 812,
        evidenceId: "one-vendor-503",
      },
      {
        id: "pt-abort",
        label: "run marked failed",
        ms: 814,
        evidenceId: "run-aborts-on-first-failure",
      },
      {
        id: "pt-zenith",
        label: "vendor zenith — completed after the run failed",
        ms: 1791,
        evidenceId: "calls-continue-after-abort",
      },
      {
        id: "pt-westgate",
        label: "vendor westgate — completed after the run failed",
        ms: 2032,
        evidenceId: "calls-continue-after-abort",
      },
    ],
  },

  database: {
    caption: "What run r_4471 left behind.",
    stats: [
      {
        id: "pd-rows",
        label: "vendor_profiles rows written",
        value: "0",
        detail: "47 vendor payloads were fetched successfully first",
        evidenceId: "nothing-persisted",
      },
      {
        id: "pd-status",
        label: "enrichment_runs status",
        value: "failed",
        detail: "One outcome for all 48 vendors",
        evidenceId: "run-aborts-on-first-failure",
      },
      {
        id: "pd-last-good",
        label: "Rows written on the last healthy run",
        value: "48",
      },
      {
        id: "pd-latency",
        label: "Write latency",
        value: "6ms",
        detail: "The database was never the constraint",
      },
      {
        id: "pd-failed-writes",
        label: "Failed writes",
        value: "0",
        detail: "No write was attempted",
        evidenceId: "nothing-persisted",
      },
    ],
  },
};

const ASYNC_MAP_INVESTIGATION: Investigation = {
  missionId: "async-map-trap",
  objective:
    "Find evidence explaining why a job reports success before any thumbnail exists.",
  requiredKeyClues: 3,
  tools: ["logs", "metrics", "code", "trace", "database"],

  toolCopy: {
    logs: {
      description: "Worker logs for the process-uploads job",
      hint: "Compare when the job finished with when the work happened.",
    },
    metrics: {
      description: "Job duration, success rate and output volume",
      hint: "Select the numbers that cannot both be true.",
    },
    code: {
      description: "The worker that processes an upload batch",
      hint: "Select the lines that decide when the job is allowed to finish.",
    },
    trace: {
      description: "One process-uploads job",
      hint: "Look at what is still running when the job span ends.",
    },
    database: {
      description: "Upload records after the job reported success",
      hint: "Select the statistics that stand out.",
    },
  },

  summary: {
    headline: { label: "Job Duration", value: "14ms" },
    findings: [
      "Every process-uploads batch reports success in under 20ms.",
      "187 of 500 uploads in the last batch still have no thumbnail.",
    ],
  },

  evidence: [
    {
      id: "impossible-fast-completion",
      source: "logs",
      title: "500 files are 'processed' in 14ms",
      description:
        "A single thumbnail takes roughly 380ms, so a 500-file batch cannot finish in 14ms.",
      isKeyEvidence: true,
    },
    {
      id: "unawaited-promise-array",
      source: "code",
      title: "The mapped async calls are never awaited",
      description:
        "The result of files.map(async …) is discarded, so the function returns before any thumbnail is written.",
      isKeyEvidence: true,
    },
    {
      id: "work-continues-after-completion",
      source: "trace",
      title: "Thumbnail work outlives the job span",
      description:
        "Thumbnail operations start inside the job and finish seconds after it reported success.",
      isKeyEvidence: true,
    },
    {
      id: "failures-invisible-to-job",
      source: "logs",
      title: "Thumbnail failures belong to no job",
      description:
        "A thumbnail error arrives after the batch was already marked successful, so nothing can attribute or retry it.",
      isKeyEvidence: true,
    },
    {
      id: "thumbnails-missing-in-storage",
      source: "database",
      title: "187 of 500 uploads have no thumbnail",
      description:
        "The batch is recorded as completed while most of its uploads were never attached.",
      isKeyEvidence: false,
    },
    {
      id: "job-success-rate-100",
      source: "metrics",
      title: "The queue reports 100% success",
      description:
        "Every batch is green, which is why the missing thumbnails went unnoticed for a week.",
      isKeyEvidence: false,
    },
    {
      id: "worker-not-overloaded",
      source: "metrics",
      title: "The worker is not under pressure",
      description:
        "CPU sits at 9% and heap is flat — the worker is idle, not struggling.",
      isKeyEvidence: false,
    },
    {
      id: "storage-writes-succeeding",
      source: "database",
      title: "Storage writes that happen do succeed",
      description:
        "Zero write errors and zero permission denials — the bucket is configured correctly.",
      isKeyEvidence: false,
    },
  ],

  logs: {
    service: "media-worker",
    window: "Last 5 min",
    lines: [
      {
        id: "a1",
        time: "09:12:04.021",
        level: "INFO",
        message: "job started  job=process-uploads  batch=b_912  files=500",
      },
      {
        id: "a2",
        time: "09:12:04.033",
        level: "DEBUG",
        message: "thumbnail pipeline invoked  files=500",
      },
      {
        id: "a3",
        time: "09:12:04.035",
        level: "INFO",
        message: "job completed  job=process-uploads  batch=b_912  duration_ms=14",
        evidenceId: "impossible-fast-completion",
      },
      {
        id: "a4",
        time: "09:12:04.038",
        level: "DEBUG",
        message: "worker idle — no jobs queued",
      },
      {
        id: "a5",
        time: "09:12:04.402",
        level: "DEBUG",
        message: "thumbnail written  file=IMG_0001.jpg  duration_ms=381",
        evidenceId: "work-continues-after-completion",
      },
      {
        id: "a6",
        time: "09:12:05.117",
        level: "DEBUG",
        message: "thumbnail written  file=IMG_0002.jpg  duration_ms=394",
        evidenceId: "work-continues-after-completion",
      },
      {
        id: "a7",
        time: "09:12:06.884",
        level: "ERROR",
        message:
          'thumbnail failed  file=IMG_0184.jpg  reason="unsupported colour profile"',
        evidenceId: "failures-invisible-to-job",
      },
      {
        id: "a8",
        time: "09:12:06.885",
        level: "WARN",
        message: "batch b_912 already reported success — error not attributed to a job",
        evidenceId: "failures-invisible-to-job",
      },
      {
        id: "a9",
        time: "09:12:12.006",
        level: "WARN",
        message: "worker recycled after idle timeout — 187 operations still pending",
        evidenceId: "thumbnails-missing-in-storage",
      },
      {
        id: "a10",
        time: "09:12:12.010",
        level: "INFO",
        message: "storage summary  writes=313  errors=0  denied=0",
        evidenceId: "storage-writes-succeeding",
      },
    ],
  },

  metrics: {
    cards: [
      {
        id: "am-duration",
        label: "Job duration",
        value: "14ms",
        detail: "500 files; one thumbnail alone takes ~380ms",
        tone: "critical",
        evidenceId: "impossible-fast-completion",
      },
      {
        id: "am-success",
        label: "Job success rate",
        value: "100%",
        detail: "Every batch reports green",
        tone: "warning",
        evidenceId: "job-success-rate-100",
      },
      {
        id: "am-output",
        label: "Thumbnails per 500-file batch",
        value: "313",
        detail: "Was 500 before release 1.9.0",
        tone: "critical",
        evidenceId: "thumbnails-missing-in-storage",
      },
      {
        id: "am-cpu",
        label: "Worker CPU",
        value: "9%",
        detail: "The worker goes idle immediately after each batch",
        tone: "normal",
        evidenceId: "worker-not-overloaded",
      },
      {
        id: "am-heap",
        label: "Worker heap",
        value: "180 MB",
        detail: "Flat across batches",
        tone: "normal",
        evidenceId: "worker-not-overloaded",
      },
      {
        id: "am-storage-errors",
        label: "Storage write errors",
        value: "0",
        detail: "Nothing is being rejected by the bucket",
        tone: "normal",
        evidenceId: "storage-writes-succeeding",
      },
    ],
    latency: {
      caption: "process-uploads duration per 500-file batch — last 10 runs",
      unit: "ms",
      series: [4120, 4380, 4210, 4290, 14, 13, 15, 14, 13, 14],
      deployAt: 4,
      deployLabel: "Release 1.9.0 (async refactor)",
    },
  },

  code: {
    file: "src/workers/upload.worker.ts",
    language: "TypeScript",
    lines: [
      { n: 31, text: "async function processUploads(batch: UploadBatch) {" },
      { n: 32, text: "  const files = await uploadRepository.pending(batch.id);" },
      { n: 33, text: "" },
      {
        n: 34,
        text: "  files.map(async (file) => {",
        evidenceId: "unawaited-promise-array",
      },
      {
        n: 35,
        text: "    const thumbnail = await imageService.createThumbnail(file);",
        evidenceId: "unawaited-promise-array",
      },
      {
        n: 36,
        text: "    await uploadRepository.attachThumbnail(file.id, thumbnail);",
        evidenceId: "unawaited-promise-array",
      },
      { n: 37, text: "  });", evidenceId: "unawaited-promise-array" },
      { n: 38, text: "" },
      { n: 39, text: "  await batchRepository.complete(batch.id);" },
      {
        n: 40,
        text: '  logger.info("job completed", { batch: batch.id, files: files.length });',
      },
      { n: 41, text: "}" },
    ],
  },

  trace: {
    caption:
      "One process-uploads job, followed to the end of its wall clock. The job span ends at 14ms.",
    root: { label: "process-uploads b_912 (wall clock)", ms: 7992 },
    spans: [
      { id: "at-read", label: "read pending uploads", ms: 12 },
      {
        id: "at-complete",
        label: "job reports success",
        ms: 14,
        evidenceId: "impossible-fast-completion",
      },
      {
        id: "at-thumb1",
        label: "thumbnail IMG_0001 — started inside the job",
        ms: 381,
        evidenceId: "work-continues-after-completion",
      },
      {
        id: "at-thumb2",
        label: "thumbnail IMG_0002 — started inside the job",
        ms: 1096,
        evidenceId: "work-continues-after-completion",
      },
      {
        id: "at-thumb-fail",
        label: "thumbnail IMG_0184 — rejected, unattributed",
        ms: 2864,
        evidenceId: "failures-invisible-to-job",
      },
      {
        id: "at-remaining",
        label: "310 further thumbnails, outside any job span",
        ms: 7992,
        evidenceId: "work-continues-after-completion",
      },
    ],
  },

  database: {
    caption: "Upload records for batch b_912, 30 seconds after the job reported success.",
    stats: [
      { id: "ad-total", label: "Uploads in batch", value: "500" },
      {
        id: "ad-thumbs",
        label: "Rows with a thumbnail",
        value: "313",
        detail: "187 uploads were never attached",
        evidenceId: "thumbnails-missing-in-storage",
      },
      {
        id: "ad-status",
        label: "Batch status",
        value: "completed",
        detail: "Recorded 14ms after the job started",
        evidenceId: "impossible-fast-completion",
      },
      {
        id: "ad-errors",
        label: "Storage write errors",
        value: "0",
        detail: "Every write that was attempted succeeded",
        evidenceId: "storage-writes-succeeding",
      },
      {
        id: "ad-denied",
        label: "Bucket permission denials",
        value: "0",
        detail: "Credentials and ACLs are correct",
        evidenceId: "storage-writes-succeeding",
      },
    ],
  },
};

const SCHEDULER_OVERLAP_INVESTIGATION: Investigation = {
  missionId: "overlapping-scheduler-runs",
  objective:
    "Find evidence explaining why the same invoices are being charged twice.",
  requiredKeyClues: 3,
  tools: ["logs", "metrics", "code", "trace", "database"],

  toolCopy: {
    logs: {
      description: "Scheduler logs for the billing sync",
      hint: "Compare when each run starts with when the previous one finishes.",
    },
    metrics: {
      description: "Run duration, concurrency and duplicate charges",
      hint: "Select the numbers that explain how two runs can coexist.",
    },
    code: {
      description: "The scheduler and the sync it drives",
      hint: "Select the lines that decide when the next run begins.",
    },
    trace: {
      description: "Three consecutive scheduler ticks",
      hint: "Select the spans that overlap.",
    },
    database: {
      description: "Charge records for the affected window",
      hint: "Select the statistics that stand out — and the ones that rule a cause out.",
    },
  },

  summary: {
    headline: { label: "Duplicate Charges (24h)", value: "38" },
    findings: [
      "Invoices are being charged twice within roughly a minute of each other.",
      "The billing sync now takes longer to run than the interval that schedules it.",
    ],
  },

  evidence: [
    {
      id: "runs-overlap",
      source: "logs",
      title: "A run starts while the previous one is still going",
      description:
        "Run s_882 begins at 03:01:00 while s_881, started at 03:00:00, is still charging invoices.",
      isKeyEvidence: true,
    },
    {
      id: "run-exceeds-interval",
      source: "metrics",
      title: "The run takes longer than its interval",
      description:
        "Sync runs now average 95 seconds against a 60-second schedule.",
      isKeyEvidence: true,
    },
    {
      id: "interval-does-not-await",
      source: "code",
      title: "The schedule is fixed to the clock, not to the previous run",
      description:
        "setInterval fires every 60 seconds regardless of whether the previous async run has finished, and each run re-reads the pending list.",
      isKeyEvidence: true,
    },
    {
      id: "same-invoice-two-runs",
      source: "database",
      title: "One invoice, charged by two different runs",
      description:
        "INV-20418 has two charge records, attributed to run s_881 and run s_882.",
      isKeyEvidence: true,
    },
    {
      id: "single-instance",
      source: "logs",
      title: "Both runs come from the same process",
      description:
        "Every overlapping run logs the same instance id, so this is not two replicas racing.",
      isKeyEvidence: false,
    },
    {
      id: "no-replica-lag",
      source: "database",
      title: "Replica lag is negligible",
      description:
        "Reads lag the primary by 40ms — the pending list is not stale data.",
      isKeyEvidence: false,
    },
    {
      id: "provider-delivers-once",
      source: "metrics",
      title: "The payment provider delivers each event once",
      description:
        "Zero duplicate webhooks from the provider — the duplication happens on our side.",
      isKeyEvidence: false,
    },
    {
      id: "invoice-volume-grew",
      source: "metrics",
      title: "Each run has more work than it used to",
      description:
        "412 invoices per run, up from 190 before the pricing migration.",
      isKeyEvidence: false,
    },
  ],

  logs: {
    service: "billing-sync",
    window: "03:00 – 03:03",
    lines: [
      {
        id: "o1",
        time: "03:00:00.008",
        level: "INFO",
        message:
          "sync run started  run=s_881  instance=billing-sync-7d9c  interval_ms=60000",
        evidenceId: "single-instance",
      },
      {
        id: "o2",
        time: "03:00:31.442",
        level: "INFO",
        message: "invoice charged  invoice=INV-20418  run=s_881",
      },
      {
        id: "o3",
        time: "03:01:00.007",
        level: "INFO",
        message: "sync run started  run=s_882  instance=billing-sync-7d9c",
        evidenceId: "runs-overlap",
      },
      {
        id: "o4",
        time: "03:01:00.009",
        level: "WARN",
        message: "previous run s_881 still in progress (60001ms elapsed)",
        evidenceId: "runs-overlap",
      },
      {
        id: "o5",
        time: "03:01:12.883",
        level: "INFO",
        message: "invoice charged  invoice=INV-20418  run=s_882",
        evidenceId: "same-invoice-two-runs",
      },
      {
        id: "o6",
        time: "03:01:35.104",
        level: "INFO",
        message: "sync run finished  run=s_881  duration_ms=95096  invoices=412",
        evidenceId: "run-exceeds-interval",
      },
      {
        id: "o7",
        time: "03:02:00.006",
        level: "INFO",
        message: "sync run started  run=s_883  instance=billing-sync-7d9c",
        evidenceId: "runs-overlap",
      },
      {
        id: "o8",
        time: "03:02:38.220",
        level: "INFO",
        message: "sync run finished  run=s_882  duration_ms=98213  invoices=412",
        evidenceId: "run-exceeds-interval",
      },
      {
        id: "o9",
        time: "03:02:38.224",
        level: "DEBUG",
        message: "provider webhook  event=charge.succeeded  delivery=1  duplicate=false",
        evidenceId: "provider-delivers-once",
      },
      {
        id: "o10",
        time: "03:02:38.301",
        level: "DEBUG",
        message: "replica lag  ms=40",
        evidenceId: "no-replica-lag",
      },
    ],
  },

  metrics: {
    cards: [
      {
        id: "om-duration",
        label: "Sync run duration",
        value: "95s",
        detail: "The interval fires every 60s",
        tone: "critical",
        evidenceId: "run-exceeds-interval",
      },
      {
        id: "om-concurrent",
        label: "Concurrent runs (peak)",
        value: "2",
        detail: "Was 1 before the pricing migration",
        tone: "critical",
        evidenceId: "runs-overlap",
      },
      {
        id: "om-duplicates",
        label: "Duplicate charges (24h)",
        value: "38",
        detail: "Same invoice, two different run ids",
        tone: "critical",
        evidenceId: "same-invoice-two-runs",
      },
      {
        id: "om-volume",
        label: "Invoices per run",
        value: "412",
        detail: "Was 190 before the pricing migration",
        tone: "warning",
        evidenceId: "invoice-volume-grew",
      },
      {
        id: "om-provider-dupes",
        label: "Provider duplicate webhooks",
        value: "0",
        detail: "Each event is delivered exactly once",
        tone: "normal",
        evidenceId: "provider-delivers-once",
      },
      {
        id: "om-replica",
        label: "Replica lag",
        value: "40ms",
        detail: "Reads are not returning stale rows",
        tone: "normal",
        evidenceId: "no-replica-lag",
      },
      {
        id: "om-instances",
        label: "Instances running the sync",
        value: "1",
        detail: "The scheduler runs on a single replica",
        tone: "normal",
        evidenceId: "single-instance",
      },
    ],
    latency: {
      caption: "Billing sync run duration — last 10 runs (interval is 60s)",
      unit: "s",
      series: [38, 41, 44, 52, 61, 74, 88, 95, 97, 95],
      deployAt: 4,
      deployLabel: "Pricing migration",
    },
  },

  code: {
    file: "src/schedulers/billing-sync.scheduler.ts",
    language: "TypeScript",
    lines: [
      { n: 8, text: "export function startBillingSync() {" },
      {
        n: 9,
        text: "  setInterval(syncInvoices, 60_000);",
        evidenceId: "interval-does-not-await",
      },
      { n: 10, text: "}" },
      { n: 11, text: "" },
      { n: 12, text: "async function syncInvoices() {" },
      { n: 13, text: "  const run = await runRepository.start();" },
      {
        n: 14,
        text: "  const invoices = await invoiceRepository.pendingCharges();",
        evidenceId: "interval-does-not-await",
      },
      { n: 15, text: "" },
      { n: 16, text: "  for (const invoice of invoices) {" },
      {
        n: 17,
        text: "    await paymentGateway.charge(invoice);",
        evidenceId: "interval-does-not-await",
      },
      {
        n: 18,
        text: "    await invoiceRepository.markCharged(invoice.id, run.id);",
        evidenceId: "interval-does-not-await",
      },
      { n: 19, text: "  }" },
      { n: 20, text: "" },
      { n: 21, text: "  return runRepository.complete(run.id, invoices.length);" },
      { n: 22, text: "}" },
    ],
  },

  trace: {
    caption:
      "Three scheduler ticks across one three-minute window. Each bar is a run's duration; ticks fire every 60s.",
    root: { label: "scheduler window 03:00 – 03:03", ms: 180000 },
    spans: [
      {
        id: "ovt-s881",
        label: "run s_881 — started 00:00",
        ms: 95096,
        evidenceId: "run-exceeds-interval",
      },
      {
        id: "ovt-s882",
        label: "run s_882 — started 01:00, while s_881 was still charging",
        ms: 98213,
        evidenceId: "runs-overlap",
      },
      {
        id: "ovt-s883",
        label: "run s_883 — started 02:00, while s_882 was still charging",
        ms: 96430,
        evidenceId: "runs-overlap",
      },
      {
        id: "ovt-charge1",
        label: "INV-20418 charged by s_881",
        ms: 240,
      },
      {
        id: "ovt-charge2",
        label: "INV-20418 charged again by s_882",
        ms: 236,
        evidenceId: "same-invoice-two-runs",
      },
    ],
  },

  database: {
    caption: "Charge records written during the 03:00 – 03:03 window.",
    stats: [
      {
        id: "od-dupes",
        label: "Invoices charged twice",
        value: "38",
        detail: "Same invoice id, two different run ids",
        evidenceId: "same-invoice-two-runs",
      },
      {
        id: "od-runs",
        label: "Distinct run ids in the window",
        value: "3",
        detail: "Three ticks, three runs, all still open at once",
        evidenceId: "runs-overlap",
      },
      {
        id: "od-lag",
        label: "Replica lag",
        value: "40ms",
        detail: "The pending list is not stale",
        evidenceId: "no-replica-lag",
      },
      { id: "od-locks", label: "Lock waits", value: "0" },
      {
        id: "od-write",
        label: "Charge write latency",
        value: "11ms",
        detail: "The database keeps up comfortably",
      },
    ],
  },
};

const REJECTION_STORM_INVESTIGATION: Investigation = {
  missionId: "unhandled-rejection-storm",
  objective:
    "Find evidence explaining why the notification service keeps exiting and losing messages.",
  requiredKeyClues: 3,
  tools: ["logs", "metrics", "code", "trace", "database"],

  toolCopy: {
    logs: {
      description: "notification-service logs across a crash and restart",
      hint: "Read what Node itself says about why the process ended.",
    },
    metrics: {
      description: "Restarts, memory, exit signals and request outcomes",
      hint: "Select the numbers that rule causes in — and the ones that rule them out.",
    },
    code: {
      description: "The notification route and the delivery listener",
      hint: "Select the lines where a promise stops being awaited.",
    },
    trace: {
      description: "One notification request, followed past its response",
      hint: "Select the spans that happen after the client has already been answered.",
    },
    database: {
      description: "Outbox state after a restart",
      hint: "Select the statistics that show the cost of each crash.",
    },
  },

  summary: {
    headline: { label: "Process Restarts (1h)", value: "41" },
    findings: [
      "The service exits with code 1 several times an hour and loses queued messages.",
      "The HTTP requests that trigger the failing work have already returned 202.",
    ],
  },

  evidence: [
    {
      id: "unhandled-rejection-crash",
      source: "logs",
      title: "Node reports an unhandled promise rejection",
      description:
        "The process logs an unhandled rejection immediately before exiting — Node 20 terminates the process for these by default.",
      isKeyEvidence: true,
    },
    {
      id: "restart-loop",
      source: "metrics",
      title: "41 restarts in an hour, one per rejection",
      description:
        "Restart count tracks unhandled-rejection count exactly, one for one.",
      isKeyEvidence: true,
    },
    {
      id: "async-listener-unawaited",
      source: "code",
      title: "An async event listener nobody awaits",
      description:
        "The delivery listener is an async function passed to emitter.on, so the promise it returns has no caller to catch it.",
      isKeyEvidence: true,
    },
    {
      id: "failure-is-off-request-path",
      source: "trace",
      title: "The failing work is detached from the request",
      description:
        "The HTTP response is sent at 18ms; the provider call that rejects runs afterwards, outside the route's try/catch.",
      isKeyEvidence: true,
    },
    {
      id: "route-already-guarded",
      source: "code",
      title: "The route handler is already wrapped in try/catch",
      description:
        "Adding error handling to the route cannot help — the rejection does not happen inside it.",
      isKeyEvidence: false,
    },
    {
      id: "memory-is-flat",
      source: "metrics",
      title: "Memory is nowhere near the limit",
      description:
        "Heap holds at 142 MB against a 512 MB container limit, with no growth trend and no OOM kill.",
      isKeyEvidence: false,
    },
    {
      id: "not-killed-by-platform",
      source: "logs",
      title: "Nothing external is killing the process",
      description:
        "The previous exit was code 1 with no signal — not SIGTERM or SIGKILL, so it is not a liveness probe or the OOM killer.",
      isKeyEvidence: false,
    },
    {
      id: "outbox-stranded-on-crash",
      source: "database",
      title: "Each crash strands queued messages",
      description:
        "214 outbox rows are left pending after a restart, and nothing re-drives them on boot.",
      isKeyEvidence: false,
    },
  ],

  logs: {
    service: "notification-service",
    window: "Last 10 min",
    lines: [
      {
        id: "u1",
        time: "14:22:07.114",
        level: "INFO",
        message: "POST /api/notifications 202 18ms  request=req_88213",
        evidenceId: "failure-is-off-request-path",
      },
      {
        id: "u2",
        time: "14:22:07.118",
        level: "DEBUG",
        message: 'delivery event emitted  channel=push  notification=n_5512',
      },
      {
        id: "u3",
        time: "14:22:08.902",
        level: "ERROR",
        message: "push provider responded 500  provider=apns  notification=n_5512",
      },
      {
        id: "u4",
        time: "14:22:08.903",
        level: "ERROR",
        message:
          "[UnhandledPromiseRejection] Error: apns delivery failed — the promise was rejected and never handled with .catch()",
        evidenceId: "unhandled-rejection-crash",
      },
      {
        id: "u5",
        time: "14:22:08.910",
        level: "DEBUG",
        message: "memory  rss=291MB  heap_used=142MB  limit=512MB",
        evidenceId: "memory-is-flat",
      },
      {
        id: "u6",
        time: "14:22:08.911",
        level: "ERROR",
        message: "process exiting  code=1",
        evidenceId: "unhandled-rejection-crash",
      },
      {
        id: "u7",
        time: "14:22:11.240",
        level: "INFO",
        message: "notification-service starting  version=2.4.1  node=v20.11.1",
      },
      {
        id: "u8",
        time: "14:22:11.241",
        level: "INFO",
        message: "previous exit  code=1  signal=none  oom_killed=false",
        evidenceId: "not-killed-by-platform",
      },
      {
        id: "u9",
        time: "14:22:11.244",
        level: "WARN",
        message: "outbox contains 214 messages left pending by the previous process",
        evidenceId: "outbox-stranded-on-crash",
      },
      {
        id: "u10",
        time: "14:22:11.246",
        level: "INFO",
        message: "ready — listening on :8080",
      },
    ],
  },

  metrics: {
    cards: [
      {
        id: "um-restarts",
        label: "Process restarts (1h)",
        value: "41",
        detail: "Was 0 before release 2.4.1",
        tone: "critical",
        evidenceId: "restart-loop",
      },
      {
        id: "um-rejections",
        label: "Unhandled rejections (1h)",
        value: "41",
        detail: "One per restart, exactly",
        tone: "critical",
        evidenceId: "unhandled-rejection-crash",
      },
      {
        id: "um-signal",
        label: "Exit signal",
        value: "none (code 1)",
        detail: "Not SIGTERM, not SIGKILL — self-inflicted",
        tone: "warning",
        evidenceId: "not-killed-by-platform",
      },
      {
        id: "um-heap",
        label: "Heap used",
        value: "142 MB",
        detail: "Flat; container limit is 512 MB",
        tone: "normal",
        evidenceId: "memory-is-flat",
      },
      {
        id: "um-5xx",
        label: "HTTP 5xx rate",
        value: "0.1%",
        detail: "Requests succeed — they return before the failure",
        tone: "normal",
        evidenceId: "failure-is-off-request-path",
      },
      {
        id: "um-provider",
        label: "APNs error rate",
        value: "3.4%",
        detail: "Elevated, but well inside what a retry should absorb",
        tone: "warning",
      },
      {
        id: "um-stranded",
        label: "Messages stranded per crash",
        value: "214",
        detail: "Enqueued, never delivered, never retried",
        tone: "critical",
        evidenceId: "outbox-stranded-on-crash",
      },
    ],
    latency: {
      caption: "Uptime between restarts — last 10 restarts",
      unit: "s",
      series: [3600, 3600, 3600, 3600, 142, 96, 74, 88, 61, 79],
      deployAt: 4,
      deployLabel: "Release 2.4.1",
    },
  },

  code: {
    file: "src/delivery/delivery.listener.ts",
    language: "TypeScript",
    lines: [
      { n: 12, text: 'router.post("/api/notifications", async (req, res, next) => {' },
      { n: 13, text: "  try {", evidenceId: "route-already-guarded" },
      { n: 14, text: "    const notification = await outbox.enqueue(req.body);" },
      { n: 15, text: '    events.emit("delivery", notification);' },
      { n: 16, text: "    return res.status(202).json({ id: notification.id });" },
      { n: 17, text: "  } catch (error) {", evidenceId: "route-already-guarded" },
      { n: 18, text: "    return next(error);", evidenceId: "route-already-guarded" },
      { n: 19, text: "  }" },
      { n: 20, text: "});" },
      { n: 21, text: "" },
      {
        n: 22,
        text: 'events.on("delivery", async (notification: Notification) => {',
        evidenceId: "async-listener-unawaited",
      },
      { n: 23, text: "  const provider = providerFor(notification.channel);" },
      {
        n: 24,
        text: "  await provider.send(notification);",
        evidenceId: "async-listener-unawaited",
      },
      {
        n: 25,
        text: "  await outbox.markDelivered(notification.id);",
        evidenceId: "async-listener-unawaited",
      },
      { n: 26, text: "});", evidenceId: "async-listener-unawaited" },
    ],
  },

  trace: {
    caption:
      "One notification request, followed past its response. The client was answered at 18ms.",
    root: { label: "notification req_88213 (wall clock)", ms: 1797 },
    spans: [
      { id: "ut-enqueue", label: "validate + enqueue to outbox", ms: 14 },
      {
        id: "ut-response",
        label: "HTTP 202 returned to the client",
        ms: 18,
        evidenceId: "failure-is-off-request-path",
      },
      {
        id: "ut-send",
        label: "detached: apns provider send — rejected",
        ms: 1784,
        evidenceId: "unhandled-rejection-crash",
      },
      {
        id: "ut-exit",
        label: "process exit code=1",
        ms: 1793,
        evidenceId: "restart-loop",
      },
    ],
  },

  database: {
    caption: "Outbox state immediately after a restart.",
    stats: [
      {
        id: "ud-pending",
        label: "Messages left pending",
        value: "214",
        detail: "Enqueued before the crash, never delivered",
        evidenceId: "outbox-stranded-on-crash",
      },
      {
        id: "ud-redrive",
        label: "Redelivery attempts on boot",
        value: "0",
        detail: "Nothing re-drives the outbox after a restart",
        evidenceId: "outbox-stranded-on-crash",
      },
      { id: "ud-delivered", label: "Messages marked delivered", value: "1,382" },
      {
        id: "ud-latency",
        label: "Outbox write latency",
        value: "5ms",
        detail: "The store keeps up",
      },
      {
        id: "ud-corrupt",
        label: "Rows lost or corrupted",
        value: "0",
        detail: "Nothing is wrong with the store itself",
      },
    ],
  },
};

const JWT_REFRESH_RACE_INVESTIGATION: Investigation = {
  missionId: "jwt-session-expiry",
  objective:
    "Find evidence explaining why a valid session is being torn down when the access token expires.",
  requiredKeyClues: 3,
  tools: ["logs", "metrics", "code", "trace", "database"],

  toolCopy: {
    logs: {
      description: "auth-service logs across one access-token expiry",
      hint: "Count the refresh attempts, and look at which token each one presents.",
    },
    metrics: {
      description: "Refresh volume, logout rate, token validation and clock offsets",
      hint: "Select the numbers that rule causes in — and the ones that rule them out.",
    },
    code: {
      description: "The browser API client and its 401 handling",
      hint: "Select the lines that decide who is allowed to refresh.",
    },
    trace: {
      description: "One dashboard load, from the first 401 to the logout",
      hint: "Select the spans that overlap when they should not.",
    },
    database: {
      description: "The refresh-token family behind this session",
      hint: "Select the statistics that show what the store actually did.",
    },
  },

  summary: {
    headline: { label: "Forced Logout Rate", value: "6.1%" },
    findings: [
      "Sessions are invalidated while the refresh token they started with was still valid.",
      "The failures cluster on pages that issue many API requests at once.",
    ],
  },

  evidence: [
    {
      id: "refresh-burst-same-token-family",
      source: "logs",
      title: "Five refresh calls in 24ms from one browser",
      description:
        "All five present tokens from the same family and carry the same device fingerprint — this is one client, not five.",
      isKeyEvidence: true,
    },
    {
      id: "one-refresh-succeeds-rest-reuse",
      source: "logs",
      title: "One refresh rotates the token; the rest are rejected as reuse",
      description:
        "The first call swaps rt_9f3 for rt_c17. The others still hold rt_9f3, so reuse detection fires and revokes the whole family.",
      isKeyEvidence: true,
    },
    {
      id: "every-401-calls-refresh",
      source: "code",
      title: "Every failed request refreshes on its own",
      description:
        "The response interceptor calls refreshSession() per 401, with nothing coordinating concurrent callers.",
      isKeyEvidence: true,
    },
    {
      id: "parallel-api-calls-one-expiry",
      source: "trace",
      title: "Parallel requests expire together, then refresh together",
      description:
        "Six dashboard calls share one access token, so they all 401 in the same millisecond and their refresh spans overlap.",
      isKeyEvidence: true,
    },
    {
      id: "logout-tracks-page-fanout",
      source: "metrics",
      title: "Logouts track how many requests a page fires at once",
      description:
        "The dashboard issues six parallel calls and produces almost all the forced logouts; single-request pages produce almost none.",
      isKeyEvidence: true,
    },
    {
      id: "expiry-is-expected",
      source: "logs",
      title: "The access token expired on schedule",
      description:
        "A 401 with token_expired after 15 minutes is the design working, not the bug. What follows it is the bug.",
      isKeyEvidence: false,
    },
    {
      id: "signing-key-unchanged",
      source: "metrics",
      title: "The signing key has not changed",
      description:
        "kid=k_2026_03 has been in use for 41 days and access-token validation succeeds 99.98% of the time.",
      isKeyEvidence: false,
    },
    {
      id: "clock-skew-within-tolerance",
      source: "metrics",
      title: "Clock offset is 12ms against a 15-minute lifetime",
      description:
        "Skew of this size cannot move an expiry boundary enough to matter, and it would not explain a reuse rejection.",
      isKeyEvidence: false,
    },
    {
      id: "account-and-store-healthy",
      source: "database",
      title: "The account is active and the token store is intact",
      description:
        "No revocation, no lockout, no orphaned or corrupted rows, and reads land in 3ms.",
      isKeyEvidence: false,
    },
  ],

  logs: {
    service: "auth-service",
    window: "Last 5 min",
    lines: [
      {
        id: "j1",
        time: "09:14:02.118",
        level: "INFO",
        message:
          "GET /api/dashboard/summary 401 token_expired  session=sess_7741  age_s=901",
        evidenceId: "expiry-is-expected",
      },
      {
        id: "j2",
        time: "09:14:02.119",
        level: "INFO",
        message: "GET /api/notifications 401 token_expired  session=sess_7741",
      },
      {
        id: "j3",
        time: "09:14:02.121",
        level: "INFO",
        message: "GET /api/billing/usage 401 token_expired  session=sess_7741",
      },
      {
        id: "j4",
        time: "09:14:02.134",
        level: "INFO",
        message:
          "POST /auth/refresh 200 rotated  family=fam_A21  old=rt_9f3  new=rt_c17  session=sess_7741",
        evidenceId: "one-refresh-succeeds-rest-reuse",
      },
      {
        id: "j5",
        time: "09:14:02.137",
        level: "WARN",
        message:
          "POST /auth/refresh 401 token_reused  family=fam_A21  presented=rt_9f3",
        evidenceId: "one-refresh-succeeds-rest-reuse",
      },
      {
        id: "j6",
        time: "09:14:02.139",
        level: "WARN",
        message:
          "POST /auth/refresh 401 token_reused  family=fam_A21  presented=rt_9f3",
      },
      {
        id: "j7",
        time: "09:14:02.141",
        level: "WARN",
        message:
          "POST /auth/refresh 401 token_reused  family=fam_A21  presented=rt_9f3",
      },
      {
        id: "j8",
        time: "09:14:02.142",
        level: "ERROR",
        message:
          "refresh-token reuse detected — revoking family fam_A21  session=sess_7741",
        evidenceId: "refresh-burst-same-token-family",
      },
      {
        id: "j9",
        time: "09:14:02.144",
        level: "DEBUG",
        message:
          "5 refresh attempts in 24ms  family=fam_A21  distinct_devices=1  distinct_user_agents=1",
        evidenceId: "refresh-burst-same-token-family",
      },
      {
        id: "j10",
        time: "09:14:02.148",
        level: "INFO",
        message:
          "session invalidated  session=sess_7741  reason=refresh_token_reuse  user=u_5512",
      },
      {
        id: "j11",
        time: "09:14:02.150",
        level: "INFO",
        message:
          "access-token validation  kid=k_2026_03  key_age_days=41  failures=0",
        evidenceId: "signing-key-unchanged",
      },
    ],
  },

  metrics: {
    cards: [
      {
        id: "jm-refresh",
        label: "Refresh calls per token expiry",
        value: "4.8",
        detail: "Was 1.0 before the parallel-dashboard release",
        tone: "critical",
        evidenceId: "refresh-burst-same-token-family",
      },
      {
        id: "jm-reuse",
        label: "Refresh 401 token_reused (1h)",
        value: "1,842",
        detail: "One success per burst; every later attempt is rejected",
        tone: "critical",
        evidenceId: "one-refresh-succeeds-rest-reuse",
      },
      {
        id: "jm-logout",
        label: "Forced logout rate",
        value: "6.1%",
        detail: "94% of them start on the dashboard",
        tone: "critical",
        evidenceId: "logout-tracks-page-fanout",
      },
      {
        id: "jm-fanout",
        label: "Parallel API calls per dashboard load",
        value: "6",
        detail: "All authorized with the same access token",
        tone: "warning",
        evidenceId: "logout-tracks-page-fanout",
      },
      {
        id: "jm-validation",
        label: "Access-token validation success",
        value: "99.98%",
        detail: "Signing key kid=k_2026_03, unchanged for 41 days",
        tone: "normal",
        evidenceId: "signing-key-unchanged",
      },
      {
        id: "jm-skew",
        label: "Max clock offset across services",
        value: "12ms",
        detail: "Access tokens live 15 minutes — skew is not the boundary",
        tone: "normal",
        evidenceId: "clock-skew-within-tolerance",
      },
      {
        id: "jm-store",
        label: "Token store latency p99",
        value: "3ms",
        detail: "No timeouts, no errors",
        tone: "normal",
        evidenceId: "account-and-store-healthy",
      },
    ],
    latency: {
      caption: "Forced logouts per 5 minutes — last 50 minutes",
      unit: "",
      series: [2, 1, 2, 1, 3, 27, 31, 29, 34, 30],
      deployAt: 5,
      deployLabel: "Release 6.1.0 — parallel dashboard",
    },
  },

  code: {
    file: "src/lib/api-client.ts",
    language: "TypeScript",
    lines: [
      { n: 28, text: "api.interceptors.response.use(undefined, async (error) => {" },
      { n: 29, text: "  if (error.response?.status !== 401) throw error;" },
      { n: 30, text: "" },
      {
        n: 31,
        text: "  // Each failed request refreshes on its own account.",
        evidenceId: "every-401-calls-refresh",
      },
      {
        n: 32,
        text: "  const session = await refreshSession();",
        evidenceId: "every-401-calls-refresh",
      },
      { n: 33, text: "" },
      { n: 34, text: "  error.config.headers.Authorization = `Bearer ${session.accessToken}`;" },
      { n: 35, text: "  return api.request(error.config);" },
      { n: 36, text: "});" },
      { n: 37, text: "" },
      { n: 38, text: "export async function refreshSession() {" },
      {
        n: 39,
        text: "  const current = tokenStore.refreshToken; // read at call time",
        evidenceId: "every-401-calls-refresh",
      },
      { n: 40, text: '  const res = await post("/auth/refresh", { refreshToken: current });' },
      {
        n: 41,
        text: "  if (!res.ok) return logout();",
        evidenceId: "every-401-calls-refresh",
      },
      { n: 42, text: "" },
      { n: 43, text: "  tokenStore.set(res.body);" },
      { n: 44, text: "  return res.body;" },
      { n: 45, text: "}" },
    ],
  },

  trace: {
    caption:
      "One dashboard load. Six calls share an access token, so they expire together.",
    root: { label: "dashboard load sess_7741 (wall clock)", ms: 312 },
    spans: [
      {
        id: "jt-a",
        label: "GET /api/dashboard/summary → 401",
        ms: 46,
        evidenceId: "parallel-api-calls-one-expiry",
      },
      { id: "jt-b", label: "GET /api/notifications → 401", ms: 44 },
      { id: "jt-c", label: "GET /api/billing/usage → 401", ms: 41 },
      {
        id: "jt-r1",
        label: "POST /auth/refresh — rotates rt_9f3 → rt_c17",
        ms: 63,
        evidenceId: "one-refresh-succeeds-rest-reuse",
      },
      {
        id: "jt-r2",
        label: "POST /auth/refresh — presents rt_9f3 → 401 reused",
        ms: 58,
        evidenceId: "parallel-api-calls-one-expiry",
      },
      {
        id: "jt-r3",
        label: "POST /auth/refresh — presents rt_9f3 → 401 reused",
        ms: 55,
      },
      {
        id: "jt-logout",
        label: "family revoked → redirect to login",
        ms: 19,
        evidenceId: "logout-tracks-page-fanout",
      },
    ],
  },

  database: {
    caption: "Refresh-token family fam_A21, immediately after the burst.",
    stats: [
      {
        id: "jd-family",
        label: "Tokens in family fam_A21",
        value: "2",
        detail: "rt_9f3 (rotated out), rt_c17 (issued)",
        evidenceId: "refresh-burst-same-token-family",
      },
      {
        id: "jd-state",
        label: "Family state",
        value: "revoked",
        detail: "Reuse detection fired on the second presentation of rt_9f3",
        evidenceId: "one-refresh-succeeds-rest-reuse",
      },
      {
        id: "jd-account",
        label: "Account status",
        value: "active",
        detail: "Not disabled, not locked, no admin revocation",
        evidenceId: "account-and-store-healthy",
      },
      {
        id: "jd-corrupt",
        label: "Corrupted or orphaned token rows",
        value: "0",
        detail: "The store holds exactly what it was asked to hold",
        evidenceId: "account-and-store-healthy",
      },
      {
        id: "jd-latency",
        label: "Token store read latency",
        value: "3ms",
        detail: "No contention, no timeouts",
      },
    ],
  },
};

const HEALTH_CHECK_INVESTIGATION: Investigation = {
  missionId: "health-check-flapping",
  objective:
    "Find evidence explaining why healthy instances keep being restarted.",
  requiredKeyClues: 3,
  tools: ["logs", "metrics", "code", "trace", "database"],

  toolCopy: {
    logs: {
      description: "orders-api logs across a probe failure and a restart",
      hint: "Read what fails first, and what the instance is still doing while it fails.",
    },
    metrics: {
      description: "Restarts, dependency latency, capacity and runtime health",
      hint: "Select the numbers that explain the restarts — and the ones that rule causes out.",
    },
    code: {
      description: "The handler behind GET /health",
      hint: "Select the lines that decide what 'alive' means here.",
    },
    trace: {
      description: "One health request, broken down by dependency",
      hint: "Select the span that decides the outcome.",
    },
    database: {
      description: "Dependency health at the moment the probe failed",
      hint: "Select the statistics that separate this service from its dependencies.",
    },
  },

  summary: {
    headline: { label: "Container Restarts (30m)", value: "37" },
    findings: [
      "Instances are restarted while they are still serving order traffic normally.",
      "The restarts began with a third-party slowdown, not with a change to this service.",
    ],
  },

  evidence: [
    {
      id: "analytics-timeout-precedes-restart",
      source: "logs",
      title: "A third-party analytics call times out first",
      description:
        "Every restart is preceded by the analytics dependency taking over five seconds inside the health request.",
      isKeyEvidence: true,
    },
    {
      id: "health-endpoint-exceeds-probe-timeout",
      source: "metrics",
      title: "The health endpoint outlives its own probe timeout",
      description:
        "GET /health takes 5.1s against a 3s probe timeout, so the liveness probe fails three times and the platform restarts the container.",
      isKeyEvidence: true,
    },
    {
      id: "liveness-probe-runs-deep-dependency-check",
      source: "code",
      title: "One endpoint answers both probes and checks everything",
      description:
        "The liveness probe hits the same handler that awaits the database, payments, messaging and analytics in sequence, with no bounded timeout.",
      isKeyEvidence: true,
    },
    {
      id: "health-span-dominated-by-analytics",
      source: "trace",
      title: "One optional dependency owns 97% of the health request",
      description:
        "The analytics call takes 5,002ms of a 5,155ms health check; every other dependency answers in under 90ms.",
      isKeyEvidence: true,
    },
    {
      id: "restarts-cascade-into-api-errors",
      source: "metrics",
      title: "Restarting healthy instances is what breaks the API",
      description:
        "Order 5xx climbs from 0.2% to 11.4% as healthy instances fall from 8 to 3 — the remaining capacity cannot absorb the load.",
      isKeyEvidence: true,
    },
    {
      id: "local-requests-still-served",
      source: "logs",
      title: "The 'unhealthy' instance is serving orders normally",
      description:
        "It answers GET /api/orders in 41ms in the same second its probe times out. The process is not stuck.",
      isKeyEvidence: false,
    },
    {
      id: "heap-and-cpu-flat",
      source: "metrics",
      title: "Memory and CPU are flat with headroom",
      description:
        "Heap holds at 214 MB against a 1 GB limit and CPU sits at 34% — no leak, no starvation, no OOM kill.",
      isKeyEvidence: false,
    },
    {
      id: "event-loop-lag-normal",
      source: "metrics",
      title: "The event loop is not blocked",
      description:
        "Loop lag p99 is 3ms throughout, so the process is idle-waiting on I/O, not spinning on CPU work.",
      isKeyEvidence: false,
    },
    {
      id: "database-healthy",
      source: "database",
      title: "The database and its pool are healthy",
      description:
        "select 1 returns in 4ms with 12 of 50 connections in use and no failovers.",
      isKeyEvidence: false,
    },
  ],

  logs: {
    service: "orders-api",
    window: "Last 20 min",
    lines: [
      {
        id: "h1",
        time: "11:02:14.006",
        level: "INFO",
        message: "GET /health start  instance=i-4f21  probe=liveness",
      },
      {
        id: "h2",
        time: "11:02:16.512",
        level: "WARN",
        message:
          "analytics.getAccountSummary slow  elapsed_ms=2506  provider=third-party",
        evidenceId: "analytics-timeout-precedes-restart",
      },
      {
        id: "h3",
        time: "11:02:19.008",
        level: "ERROR",
        message:
          "analytics dependency timed out  elapsed_ms=5002  provider=third-party",
        evidenceId: "analytics-timeout-precedes-restart",
      },
      {
        id: "h4",
        time: "11:02:19.161",
        level: "ERROR",
        message: "GET /health 503  elapsed_ms=5155  probe_timeout_ms=3000",
        evidenceId: "health-endpoint-exceeds-probe-timeout",
      },
      {
        id: "h5",
        time: "11:02:19.163",
        level: "INFO",
        message: "GET /api/orders 200 41ms  instance=i-4f21",
        evidenceId: "local-requests-still-served",
      },
      {
        id: "h6",
        time: "11:02:19.240",
        level: "WARN",
        message: "liveness probe failed 3/3  instance=i-4f21  action=restart",
        evidenceId: "health-endpoint-exceeds-probe-timeout",
      },
      {
        id: "h7",
        time: "11:02:19.241",
        level: "INFO",
        message: "SIGTERM received — container restarting  instance=i-4f21",
      },
      {
        id: "h8",
        time: "11:02:26.880",
        level: "INFO",
        message: "orders-api ready  instance=i-4f21  version=3.6.2 (unchanged)",
      },
      {
        id: "h9",
        time: "11:02:31.004",
        level: "ERROR",
        message: "GET /health 503  elapsed_ms=5151  instance=i-9c07",
        evidenceId: "restarts-cascade-into-api-errors",
      },
      {
        id: "h10",
        time: "11:02:31.220",
        level: "WARN",
        message: "capacity  healthy_instances=3/8  api_5xx_rate=11.4%",
        evidenceId: "restarts-cascade-into-api-errors",
      },
      {
        id: "h11",
        time: "11:02:31.221",
        level: "DEBUG",
        message:
          "runtime  heap_used=214MB  limit=1024MB  cpu=34%  event_loop_lag_ms=3",
        evidenceId: "heap-and-cpu-flat",
      },
    ],
  },

  metrics: {
    cards: [
      {
        id: "hm-restarts",
        label: "Container restarts (30m)",
        value: "37",
        detail: "Across 8 instances; zero the week before",
        tone: "critical",
        evidenceId: "health-endpoint-exceeds-probe-timeout",
      },
      {
        id: "hm-analytics",
        label: "Analytics provider p99",
        value: "5.0s",
        detail: "Third-party incident; was 180ms",
        tone: "critical",
        evidenceId: "analytics-timeout-precedes-restart",
      },
      {
        id: "hm-health",
        label: "GET /health p95",
        value: "5.1s",
        detail: "Liveness probe timeout is 3s",
        tone: "critical",
        evidenceId: "health-endpoint-exceeds-probe-timeout",
      },
      {
        id: "hm-5xx",
        label: "Orders API 5xx rate",
        value: "11.4%",
        detail: "Was 0.2% before instances started cycling",
        tone: "critical",
        evidenceId: "restarts-cascade-into-api-errors",
      },
      {
        id: "hm-orders",
        label: "Orders served by a 'failing' instance",
        value: "412/min",
        detail: "It answers business traffic while its probe times out",
        tone: "warning",
        evidenceId: "local-requests-still-served",
      },
      {
        id: "hm-lag",
        label: "Event-loop lag p99",
        value: "3ms",
        detail: "Waiting on I/O, not blocked on CPU",
        tone: "normal",
        evidenceId: "event-loop-lag-normal",
      },
      {
        id: "hm-heap",
        label: "Heap used",
        value: "214 MB",
        detail: "Flat against a 1 GB limit; no OOM kill recorded",
        tone: "normal",
        evidenceId: "heap-and-cpu-flat",
      },
      {
        id: "hm-cpu",
        label: "CPU utilisation",
        value: "34%",
        detail: "Headroom throughout, before and after each restart",
        tone: "normal",
        evidenceId: "heap-and-cpu-flat",
      },
    ],
    latency: {
      caption: "Healthy instances — last 30 minutes",
      unit: "",
      series: [8, 8, 8, 8, 7, 5, 4, 3, 3, 4],
      deployAt: 4,
      deployLabel: "Analytics provider degrades",
    },
  },

  code: {
    file: "src/health/health.controller.ts",
    language: "TypeScript",
    lines: [
      { n: 12, text: '@Get("/health")' },
      {
        n: 13,
        text: "// Wired as BOTH the liveness probe and the readiness probe.",
        evidenceId: "liveness-probe-runs-deep-dependency-check",
      },
      { n: 14, text: "async health() {" },
      { n: 15, text: '  await this.db.query("select 1");' },
      { n: 16, text: "  await this.payments.ping();" },
      { n: 17, text: "  await this.messaging.ping();" },
      {
        n: 18,
        text: "  await this.analytics.getAccountSummary(); // no timeout, not on the order path",
        evidenceId: "liveness-probe-runs-deep-dependency-check",
      },
      { n: 19, text: "" },
      {
        n: 20,
        text: '  return { status: "ok" };',
        evidenceId: "liveness-probe-runs-deep-dependency-check",
      },
      { n: 21, text: "}" },
    ],
  },

  trace: {
    caption:
      "One health request on i-4f21. The probe gave up at 3,000ms; the handler kept going.",
    root: { label: "GET /health i-4f21", ms: 5155 },
    spans: [
      { id: "ht-db", label: "db select 1", ms: 4 },
      { id: "ht-pay", label: "payments.ping", ms: 61 },
      { id: "ht-msg", label: "messaging.ping", ms: 88 },
      {
        id: "ht-analytics",
        label: "analytics.getAccountSummary — client timeout",
        ms: 5002,
        evidenceId: "health-span-dominated-by-analytics",
      },
    ],
  },

  database: {
    caption: "Dependency health at the instant the probe failed.",
    stats: [
      {
        id: "hd-db",
        label: "Database status",
        value: "healthy",
        detail: "select 1 in 4ms; no failovers in the window",
        evidenceId: "database-healthy",
      },
      {
        id: "hd-pool",
        label: "Connection pool in use",
        value: "12 / 50",
        detail: "Nowhere near saturation",
        evidenceId: "database-healthy",
      },
      { id: "hd-pay", label: "Payment provider ping", value: "61ms" },
      { id: "hd-msg", label: "Messaging ping", value: "88ms" },
      {
        id: "hd-analytics",
        label: "Analytics provider",
        value: "timeout (>5s)",
        detail: "Reporting only — no order request touches it",
        evidenceId: "health-span-dominated-by-analytics",
      },
    ],
  },
};

const GRACEFUL_SHUTDOWN_INVESTIGATION: Investigation = {
  missionId: "graceful-shutdown-bug",
  objective:
    "Find evidence explaining why deploys drop requests when normal traffic is fine.",
  requiredKeyClues: 3,
  tools: ["logs", "metrics", "code", "trace", "database"],

  toolCopy: {
    logs: {
      description: "checkout-api logs across one deployment",
      hint: "Measure the time between the signal arriving and the process ending.",
    },
    metrics: {
      description: "Error rates inside and outside deploy windows, plus runtime health",
      hint: "Select the numbers that tie the errors to deployments and rule other causes out.",
    },
    code: {
      description: "The process signal handler",
      hint: "Select the lines that decide what happens to work already in progress.",
    },
    trace: {
      description: "One checkout request caught by the deploy",
      hint: "Select the span where the request stopped.",
    },
    database: {
      description: "Transaction state after the deploy",
      hint: "Select the statistics that show what the interrupted requests left behind.",
    },
  },

  summary: {
    headline: { label: "502 Rate During Deploys", value: "8.7%" },
    findings: [
      "Checkout errors appear only inside deploy windows and clear the moment the rollout finishes.",
      "The process ends milliseconds after being asked to stop.",
    ],
  },

  evidence: [
    {
      id: "sigterm-to-exit-in-milliseconds",
      source: "logs",
      title: "The process exits 4ms after SIGTERM",
      description:
        "There is no drain window at all: the signal arrives, the pool closes, the process ends.",
      isKeyEvidence: true,
    },
    {
      id: "in-flight-requests-at-exit",
      source: "metrics",
      title: "23 requests were still running when it exited",
      description:
        "The process counts active requests but never waits on them — the number is logged, not honoured.",
      isKeyEvidence: true,
    },
    {
      id: "exit-called-in-signal-handler",
      source: "code",
      title: "The handler calls process.exit() directly",
      description:
        "It closes the database pool and exits. The HTTP server is never closed, and queue consumers keep prefetching until the process disappears.",
      isKeyEvidence: true,
    },
    {
      id: "request-cut-mid-transaction",
      source: "trace",
      title: "A checkout is cut between the write and the commit",
      description:
        "Payment was authorised and the order row was inserted, then the socket closed before COMMIT and the transaction rolled back.",
      isKeyEvidence: true,
    },
    {
      id: "jobs-acked-before-completion",
      source: "logs",
      title: "Jobs are acknowledged and then abandoned",
      description:
        "A consumer acknowledges a job, the process exits before the work finishes, and the broker redelivers it as attempt 2.",
      isKeyEvidence: true,
    },
    {
      id: "errors-only-during-deploys",
      source: "metrics",
      title: "The errors exist only inside deploy windows",
      description:
        "8.7% 5xx during a rollout, 0.04% at every other minute of the day — this is not a traffic or capacity problem.",
      isKeyEvidence: false,
    },
    {
      id: "resources-are-fine",
      source: "metrics",
      title: "Nothing is under resource pressure",
      description:
        "CPU sits at 29% and heap at 240 MB right up to the exit; the process was healthy when it was asked to stop.",
      isKeyEvidence: false,
    },
    {
      id: "database-steady",
      source: "database",
      title: "The database never wavered",
      description:
        "Query p99 held at 8ms with zero failovers in the deploy window — the disconnects came from the client side.",
      isKeyEvidence: false,
    },
    {
      id: "connections-closed-by-the-app",
      source: "logs",
      title: "The app closed the connections, not the balancer",
      description:
        "The upstream reset is recorded against sockets this process closed; no instance was removed from rotation first.",
      isKeyEvidence: false,
    },
  ],

  logs: {
    service: "checkout-api",
    window: "Deploy window 03:12–03:14",
    lines: [
      {
        id: "g1",
        time: "03:12:41.002",
        level: "INFO",
        message: "SIGTERM received  instance=i-2b90  rollout=5.3.0 → 5.3.1",
        evidenceId: "sigterm-to-exit-in-milliseconds",
      },
      {
        id: "g2",
        time: "03:12:41.003",
        level: "INFO",
        message: "closing database pool",
      },
      {
        id: "g3",
        time: "03:12:41.006",
        level: "INFO",
        message: "process.exit(0)  uptime_s=86214",
        evidenceId: "sigterm-to-exit-in-milliseconds",
      },
      {
        id: "g4",
        time: "03:12:41.006",
        level: "WARN",
        message: "23 requests were in flight when the process exited",
        evidenceId: "in-flight-requests-at-exit",
      },
      {
        id: "g5",
        time: "03:12:41.007",
        level: "ERROR",
        message:
          "POST /api/checkout — socket closed by this process  request=req_77120",
        evidenceId: "connections-closed-by-the-app",
      },
      {
        id: "g6",
        time: "03:12:41.009",
        level: "ERROR",
        message:
          "transaction rolled back by client disconnect  request=req_77120  order=o_9931",
      },
      {
        id: "g7",
        time: "03:12:41.014",
        level: "WARN",
        message: "queue consumer stopped mid-job  job=j_4410  acked=true  completed=false",
        evidenceId: "jobs-acked-before-completion",
      },
      {
        id: "g8",
        time: "03:12:44.880",
        level: "INFO",
        message: "checkout-api ready  version=5.3.1  instance=i-2b90",
      },
      {
        id: "g9",
        time: "03:12:45.140",
        level: "WARN",
        message: "job redelivered  job=j_4410  attempt=2  reason=ack_without_completion",
        evidenceId: "jobs-acked-before-completion",
      },
      {
        id: "g10",
        time: "03:12:45.142",
        level: "DEBUG",
        message: "rotation  instances_drained_before_signal=0  lb_removals=0",
        evidenceId: "connections-closed-by-the-app",
      },
      {
        id: "g11",
        time: "03:14:02.500",
        level: "INFO",
        message: "steady state  5xx_rate=0.04%  rollout=complete",
        evidenceId: "errors-only-during-deploys",
      },
    ],
  },

  metrics: {
    cards: [
      {
        id: "gm-502",
        label: "5xx rate during deploys",
        value: "8.7%",
        detail: "Median across the last 12 rollouts",
        tone: "critical",
        evidenceId: "errors-only-during-deploys",
      },
      {
        id: "gm-inflight",
        label: "Requests in flight at exit",
        value: "23",
        detail: "Counted, logged, and then abandoned",
        tone: "critical",
        evidenceId: "in-flight-requests-at-exit",
      },
      {
        id: "gm-drain",
        label: "SIGTERM → process exit",
        value: "4ms",
        detail: "The platform allows 30s before SIGKILL",
        tone: "critical",
        evidenceId: "sigterm-to-exit-in-milliseconds",
      },
      {
        id: "gm-retries",
        label: "Queue redeliveries per deploy",
        value: "31",
        detail: "Jobs acknowledged but never completed",
        tone: "critical",
        evidenceId: "jobs-acked-before-completion",
      },
      {
        id: "gm-outside",
        label: "5xx outside deploy windows",
        value: "0.04%",
        detail: "Steady all day, at every traffic level",
        tone: "normal",
        evidenceId: "errors-only-during-deploys",
      },
      {
        id: "gm-cpu",
        label: "CPU / heap at shutdown",
        value: "29% / 240 MB",
        detail: "The process was healthy when it was told to stop",
        tone: "normal",
        evidenceId: "resources-are-fine",
      },
      {
        id: "gm-db",
        label: "Database p99 / failovers",
        value: "8ms / 0",
        detail: "Unchanged through the deploy window",
        tone: "normal",
        evidenceId: "database-steady",
      },
      {
        id: "gm-provider",
        label: "Payment provider error rate",
        value: "0.02%",
        detail: "Healthy throughout — the failures are ours",
        tone: "normal",
      },
    ],
    latency: {
      caption: "5xx rate per minute across one deploy",
      unit: "%",
      series: [0, 0, 0.1, 0, 8.7, 6.2, 0.1, 0, 0, 0],
      deployAt: 4,
      deployLabel: "Deploy 5.3.1",
    },
  },

  code: {
    file: "src/main.ts",
    language: "TypeScript",
    lines: [
      {
        n: 41,
        text: 'process.on("SIGTERM", async () => {',
        evidenceId: "exit-called-in-signal-handler",
      },
      { n: 42, text: '  logger.info("SIGTERM received");' },
      {
        n: 43,
        text: "  await db.pool.end();",
        evidenceId: "exit-called-in-signal-handler",
      },
      {
        n: 44,
        text: "  process.exit(0);",
        evidenceId: "exit-called-in-signal-handler",
      },
      { n: 45, text: "});" },
      { n: 46, text: "" },
      {
        n: 47,
        text: "// server.close() is never called, so new connections keep arriving.",
        evidenceId: "exit-called-in-signal-handler",
      },
      {
        n: 48,
        text: "// Queue consumers keep prefetching until the process disappears.",
        evidenceId: "exit-called-in-signal-handler",
      },
    ],
  },

  trace: {
    caption: "One checkout caught by the rollout. It never reached COMMIT.",
    root: { label: "POST /api/checkout req_77120", ms: 214 },
    spans: [
      { id: "gt-validate", label: "validate cart", ms: 11 },
      { id: "gt-reserve", label: "reserve inventory", ms: 38 },
      { id: "gt-charge", label: "authorize payment (succeeded)", ms: 121 },
      { id: "gt-write", label: "insert order row", ms: 27 },
      {
        id: "gt-commit",
        label: "COMMIT — interrupted by process exit, rolled back",
        ms: 17,
        evidenceId: "request-cut-mid-transaction",
      },
    ],
  },

  database: {
    caption: "Checkout transaction state immediately after the deploy.",
    stats: [
      {
        id: "gd-rolled",
        label: "Transactions rolled back by disconnect",
        value: "23",
        detail: "One per in-flight request at exit",
        evidenceId: "request-cut-mid-transaction",
      },
      {
        id: "gd-orphan",
        label: "Inventory reservations left held",
        value: "17",
        detail: "Released only by the 15-minute sweeper",
      },
      {
        id: "gd-p99",
        label: "Query p99 during the deploy",
        value: "8ms",
        detail: "Identical to the rest of the day",
        evidenceId: "database-steady",
      },
      {
        id: "gd-failover",
        label: "Failovers in the deploy window",
        value: "0",
        detail: "The database was never unavailable",
        evidenceId: "database-steady",
      },
      {
        id: "gd-conn",
        label: "Connections closed by the client",
        value: "50",
        detail: "The application ended them; the server did not",
      },
    ],
  },
};

const RATE_LIMITER_RACE_INVESTIGATION: Investigation = {
  missionId: "rate-limiter-race",
  objective:
    "Find evidence explaining why clients are allowed far more requests than the configured limit.",
  requiredKeyClues: 3,
  tools: ["logs", "metrics", "code", "trace", "database"],

  toolCopy: {
    logs: {
      description: "public-api limiter logs for one client and one window",
      hint: "Compare the value each instance reads with the value each instance writes.",
    },
    metrics: {
      description: "Overshoot, replica count, store health and clock offsets",
      hint: "Select the numbers that show what the overshoot scales with.",
    },
    code: {
      description: "The rate-limit middleware",
      hint: "Select the lines where the counter leaves the store and comes back.",
    },
    trace: {
      description: "Three concurrent requests on three instances",
      hint: "Select the spans that read the same number.",
    },
    database: {
      description: "The shared limiter store for this client",
      hint: "Select the statistics that compare stored state with reality.",
    },
  },

  summary: {
    headline: { label: "Requests Allowed Over Limit", value: "+47%" },
    findings: [
      "147 requests were allowed in a window configured to allow 100.",
      "The overshoot was zero on a single instance and grows with every replica added.",
    ],
  },

  evidence: [
    {
      id: "same-count-read-by-several-instances",
      source: "trace",
      title: "Three instances read the same counter value",
      description:
        "i-01, i-04 and i-07 all read 97 within 1ms of each other, before any of them has written.",
      isKeyEvidence: true,
    },
    {
      id: "writes-overwrite-each-other",
      source: "logs",
      title: "Three writes, one increment",
      description:
        "All three instances write 98. Two increments are silently lost, so three requests cost the counter one.",
      isKeyEvidence: true,
    },
    {
      id: "read-modify-write-in-application-code",
      source: "code",
      title: "The counter is incremented in application code",
      description:
        "store.get(), a +1 in Node, then store.set() — three steps with no atomicity between them.",
      isKeyEvidence: true,
    },
    {
      id: "overshoot-scales-with-replicas",
      source: "metrics",
      title: "The overshoot grows with the replica count",
      description:
        "0% on one instance, 19% on three, 47% on eight — the error scales with concurrency, not with traffic.",
      isKeyEvidence: true,
    },
    {
      id: "stored-count-below-actual-volume",
      source: "database",
      title: "The stored counter is lower than the traffic it counted",
      description:
        "The window closed at 112 after 147 requests were allowed — 35 increments never landed.",
      isKeyEvidence: true,
    },
    {
      id: "store-is-healthy",
      source: "metrics",
      title: "The shared store is fast, reachable and unreplicated",
      description:
        "p99 of 2ms, zero errors, and a single primary — there are no replicas for a read to lag behind.",
      isKeyEvidence: false,
    },
    {
      id: "clock-skew-is-negligible",
      source: "metrics",
      title: "Clock offset is 9ms against a 60-second window",
      description:
        "Skew that small cannot move a window boundary enough to admit 47 extra requests.",
      isKeyEvidence: false,
    },
    {
      id: "single-client-single-key",
      source: "logs",
      title: "All the traffic resolves to one client and one key",
      description:
        "147 requests, one API key, one limiter key — the identifier is not fragmenting the count.",
      isKeyEvidence: false,
    },
    {
      id: "limiter-config-is-correct",
      source: "logs",
      title: "The limiter is configured exactly as intended",
      description:
        "limit=100, window=60s, and the key template matches the documented contract.",
      isKeyEvidence: false,
    },
  ],

  logs: {
    service: "public-api",
    window: "Last 2 min",
    lines: [
      {
        id: "r1",
        time: "15:07:33.201",
        level: "DEBUG",
        message: "rate-limit read  key=rl:client_88:1min  value=97  instance=i-01",
        evidenceId: "same-count-read-by-several-instances",
      },
      {
        id: "r2",
        time: "15:07:33.202",
        level: "DEBUG",
        message: "rate-limit read  key=rl:client_88:1min  value=97  instance=i-04",
        evidenceId: "same-count-read-by-several-instances",
      },
      {
        id: "r3",
        time: "15:07:33.202",
        level: "DEBUG",
        message: "rate-limit read  key=rl:client_88:1min  value=97  instance=i-07",
      },
      {
        id: "r4",
        time: "15:07:33.205",
        level: "INFO",
        message: "request allowed  key=rl:client_88:1min  wrote=98  instance=i-01",
        evidenceId: "writes-overwrite-each-other",
      },
      {
        id: "r5",
        time: "15:07:33.206",
        level: "INFO",
        message: "request allowed  key=rl:client_88:1min  wrote=98  instance=i-04",
        evidenceId: "writes-overwrite-each-other",
      },
      {
        id: "r6",
        time: "15:07:33.206",
        level: "INFO",
        message: "request allowed  key=rl:client_88:1min  wrote=98  instance=i-07",
      },
      {
        id: "r7",
        time: "15:07:34.000",
        level: "WARN",
        message:
          "window closed  key=rl:client_88:1min  stored=112  allowed=147  limit=100",
        evidenceId: "stored-count-below-actual-volume",
      },
      {
        id: "r8",
        time: "15:07:34.002",
        level: "INFO",
        message:
          "limiter config  limit=100  window=60s  key_template=rl:{clientId}:1min",
        evidenceId: "limiter-config-is-correct",
      },
      {
        id: "r9",
        time: "15:07:34.003",
        level: "DEBUG",
        message:
          "identity  requests=147  api_keys=1  resolved_client_ids=1  proxy_bypass=0",
        evidenceId: "single-client-single-key",
      },
      {
        id: "r10",
        time: "15:07:34.004",
        level: "DEBUG",
        message: "store  latency_p99_ms=2  errors=0  topology=single-primary",
        evidenceId: "store-is-healthy",
      },
    ],
  },

  metrics: {
    cards: [
      {
        id: "rm-over",
        label: "Requests allowed over the limit",
        value: "+47%",
        detail: "147 allowed against a configured limit of 100",
        tone: "critical",
        evidenceId: "stored-count-below-actual-volume",
      },
      {
        id: "rm-scale",
        label: "Overshoot by replica count",
        value: "1: 0% · 3: 19% · 8: 47%",
        detail: "The error tracks concurrency, not traffic volume",
        tone: "critical",
        evidenceId: "overshoot-scales-with-replicas",
      },
      {
        id: "rm-lost",
        label: "Lost increments per minute",
        value: "35",
        detail: "Writes that overwrote a concurrent write",
        tone: "critical",
        evidenceId: "writes-overwrite-each-other",
      },
      {
        id: "rm-store",
        label: "Store latency p99",
        value: "2ms",
        detail: "Zero errors, zero timeouts",
        tone: "normal",
        evidenceId: "store-is-healthy",
      },
      {
        id: "rm-api",
        label: "API latency p95",
        value: "84ms",
        detail: "Unchanged before and after scaling out",
        tone: "normal",
      },
      {
        id: "rm-cpu",
        label: "CPU / heap",
        value: "31% / 180 MB",
        detail: "Headroom on every instance",
        tone: "normal",
      },
      {
        id: "rm-skew",
        label: "Max clock offset between instances",
        value: "9ms",
        detail: "The window is 60s — skew is three orders of magnitude away",
        tone: "normal",
        evidenceId: "clock-skew-is-negligible",
      },
      {
        id: "rm-keys",
        label: "Distinct limiter keys for this client",
        value: "1",
        detail: "One API key, one template, one bucket",
        tone: "normal",
        evidenceId: "single-client-single-key",
      },
    ],
    latency: {
      caption: "Requests allowed per 1-minute window against a limit of 100",
      unit: "",
      series: [99, 100, 100, 99, 118, 131, 142, 147],
      deployAt: 4,
      deployLabel: "Scaled 1 → 8 instances",
    },
  },

  code: {
    file: "src/middleware/rate-limit.ts",
    language: "TypeScript",
    lines: [
      { n: 17, text: "export async function rateLimit(req, res, next) {" },
      { n: 18, text: "  const key = `rl:${req.clientId}:1min`;" },
      { n: 19, text: "" },
      {
        n: 20,
        text: "  const current = Number(await store.get(key)) || 0; // read",
        evidenceId: "read-modify-write-in-application-code",
      },
      {
        n: 21,
        text: "  if (current >= LIMIT) return res.status(429).end();",
        evidenceId: "read-modify-write-in-application-code",
      },
      { n: 22, text: "" },
      {
        n: 23,
        text: "  await store.set(key, current + 1, { ttl: 60 }); // modify + write",
        evidenceId: "read-modify-write-in-application-code",
      },
      { n: 24, text: "" },
      { n: 25, text: "  return next();" },
      { n: 26, text: "}" },
    ],
  },

  trace: {
    caption:
      "Three concurrent requests for client_88, landing on three different instances.",
    root: { label: "concurrent window slice (wall clock)", ms: 41 },
    spans: [
      {
        id: "rt-g01",
        label: "i-01: store.get → 97",
        ms: 3,
        evidenceId: "same-count-read-by-several-instances",
      },
      {
        id: "rt-g04",
        label: "i-04: store.get → 97",
        ms: 3,
        evidenceId: "same-count-read-by-several-instances",
      },
      { id: "rt-g07", label: "i-07: store.get → 97", ms: 3 },
      {
        id: "rt-s01",
        label: "i-01: store.set 98",
        ms: 4,
        evidenceId: "writes-overwrite-each-other",
      },
      { id: "rt-s04", label: "i-04: store.set 98 — overwrites i-01", ms: 4 },
      { id: "rt-s07", label: "i-07: store.set 98 — overwrites i-04", ms: 4 },
      { id: "rt-allow", label: "all three requests allowed", ms: 6 },
    ],
  },

  database: {
    caption: "Shared limiter store for client_88 at the end of the window.",
    stats: [
      {
        id: "rd-stored",
        label: "Stored counter at window close",
        value: "112",
        detail: "147 requests were actually allowed through",
        evidenceId: "stored-count-below-actual-volume",
      },
      {
        id: "rd-lost",
        label: "Increments lost to overwrite",
        value: "35",
        detail: "Each one is a request the limiter never counted",
        evidenceId: "writes-overwrite-each-other",
      },
      {
        id: "rd-single",
        label: "Counter drift on a single instance",
        value: "0",
        detail: "The same code is correct when nothing runs concurrently",
        evidenceId: "overshoot-scales-with-replicas",
      },
      {
        id: "rd-latency",
        label: "Store latency p99",
        value: "2ms",
        detail: "Reachable and fast throughout",
        evidenceId: "store-is-healthy",
      },
      {
        id: "rd-repl",
        label: "Replication topology",
        value: "single primary",
        detail: "No replicas, so no replica can be serving a stale read",
        evidenceId: "store-is-healthy",
      },
    ],
  },
};

const MEMORY_LEAK_INVESTIGATION: Investigation = {
  missionId: "memory-leak-worker",
  objective:
    "Find evidence explaining why the image workers keep growing until they are restarted.",
  requiredKeyClues: 3,
  tools: ["logs", "metrics", "code", "trace"],

  toolCopy: {
    logs: {
      description: "Worker pool logs across four hours of image jobs",
      hint: "Compare what happens when a job starts with what happens when it finishes.",
    },
    metrics: {
      description: "Heap, garbage collection and worker-pool counters",
      hint: "Look for a counter that only ever goes up.",
    },
    code: {
      description: "The job handler in the image worker",
      hint: "Follow every resource the handler acquires and ask where it is given back.",
    },
    trace: {
      description: "One image job from dispatch to completion",
      hint: "The job itself is fine. Ask what survives it.",
    },
  },

  summary: {
    headline: { label: "Worker Heap After 4h", value: "1.42 GB" },
    findings: [
      "Worker heap climbs steadily across every batch and never returns to its starting baseline.",
      "Jobs themselves complete successfully and the active-job count returns to zero.",
    ],
  },

  evidence: [
    {
      id: "heap-never-returns-to-baseline",
      source: "metrics",
      title: "Heap never returns to baseline",
      description:
        "Old-space usage climbs from 180MB to 1.42GB over four hours. Each garbage collection frees a little, but the floor after every collection is higher than the one before it.",
      isKeyEvidence: true,
    },
    {
      id: "listener-count-climbs-with-jobs",
      source: "metrics",
      title: "Listener count tracks jobs processed",
      description:
        "The worker's registered listener count is 8,412 after 8,400 jobs. It rises by one per job and never falls.",
      isKeyEvidence: true,
    },
    {
      id: "max-listeners-warning",
      source: "logs",
      title: "MaxListenersExceededWarning on 'progress'",
      description:
        "Node warns that 11 'progress' listeners were added to the worker and suspects a leak. The warning repeats as the count grows.",
      isKeyEvidence: true,
    },
    {
      id: "listener-added-per-job-never-removed",
      source: "code",
      title: "A progress listener is added per job and never removed",
      description:
        "processJob registers worker.on(\"progress\", onProgress) on every call. The handler closes over the whole job — including its source image buffer — and nothing ever removes it.",
      isKeyEvidence: true,
    },
    {
      id: "gc-runs-more-but-frees-less",
      source: "trace",
      title: "GC runs more often and reclaims less",
      description:
        "Major collections went from 1 every 90s to 1 every 11s, while the memory reclaimed per collection fell from 210MB to 24MB. The heap is full of objects that are still reachable.",
      isKeyEvidence: true,
    },
    {
      id: "memory-retained-with-zero-active-jobs",
      source: "logs",
      title: "Memory stays high with zero active jobs",
      description:
        "During an idle window with active_jobs=0 and an empty queue, heap usage held at 1.38GB. Nothing is in flight, yet the memory is not released.",
      isKeyEvidence: true,
    },
    {
      id: "payload-size-unchanged",
      source: "metrics",
      title: "Job payload size is unchanged",
      description:
        "Average source-image size is 2.1MB, the same as it was last week. Images did not suddenly get bigger.",
      isKeyEvidence: false,
    },
    {
      id: "queue-depth-and-concurrency-normal",
      source: "logs",
      title: "Queue depth and concurrency are normal",
      description:
        "Queue depth stays under 40 jobs and concurrency is pinned at 4. There is no backlog and no burst of simultaneous work to explain the heap.",
      isKeyEvidence: false,
    },
    {
      id: "downstream-services-healthy",
      source: "metrics",
      title: "Storage and database are healthy",
      description:
        "Object-storage latency, database latency and CPU outside garbage-collection pauses are all flat and within normal range.",
      isKeyEvidence: false,
    },
  ],

  logs: {
    service: "image-worker-3",
    window: "Last 4 hours",
    lines: [
      {
        id: "l1",
        time: "02:14:09.114",
        level: "INFO",
        message: "job start  id=img_41288  bytes=2118400  concurrency=4/4",
      },
      {
        id: "l2",
        time: "02:14:12.774",
        level: "INFO",
        message: "job done   id=img_41288  ms=3660  status=ok",
      },
      {
        id: "l3",
        time: "02:14:12.775",
        level: "DEBUG",
        message: "worker listeners after job: progress=4113  error=1  exit=1",
        evidenceId: "listener-count-climbs-with-jobs",
      },
      {
        id: "l4",
        time: "02:41:55.010",
        level: "WARN",
        message:
          "MaxListenersExceededWarning: 11 progress listeners added to [Worker]. Use emitter.setMaxListeners() to increase limit",
        evidenceId: "max-listeners-warning",
      },
      {
        id: "l5",
        time: "03:02:31.400",
        level: "DEBUG",
        message: "queue depth=31  active_jobs=4  concurrency=4",
        evidenceId: "queue-depth-and-concurrency-normal",
      },
      {
        id: "l6",
        time: "04:18:02.008",
        level: "INFO",
        message: "queue drained  active_jobs=0  pending=0",
        evidenceId: "memory-retained-with-zero-active-jobs",
      },
      {
        id: "l7",
        time: "04:18:44.512",
        level: "WARN",
        message:
          "idle 42s  active_jobs=0  heapUsed=1382MB  rss=1601MB  (baseline at boot: 180MB)",
        evidenceId: "memory-retained-with-zero-active-jobs",
      },
      {
        id: "l8",
        time: "05:47:19.221",
        level: "ERROR",
        message:
          "worker image-worker-3 exceeded memory threshold (1.42GB / 1.5GB) — recycling",
      },
      {
        id: "l9",
        time: "05:47:21.006",
        level: "INFO",
        message: "worker image-worker-3 restarted  heapUsed=181MB  jobs_lost=0",
      },
      {
        id: "l10",
        time: "05:47:21.100",
        level: "DEBUG",
        message: "restart #7 in 24h  mean uptime between restarts: 3h 12m",
      },
    ],
  },

  metrics: {
    cards: [
      {
        id: "m-heap",
        label: "Worker heap used",
        value: "1.42 GB",
        detail: "180MB at boot, climbing across every batch",
        tone: "critical",
        evidenceId: "heap-never-returns-to-baseline",
      },
      {
        id: "m-listeners",
        label: "Registered listeners",
        value: "8,412",
        detail: "8,400 jobs processed — one listener each, none removed",
        tone: "critical",
        evidenceId: "listener-count-climbs-with-jobs",
      },
      {
        id: "m-payload",
        label: "Average job payload",
        value: "2.1 MB",
        detail: "Unchanged week over week",
        tone: "normal",
        evidenceId: "payload-size-unchanged",
      },
      {
        id: "m-downstream",
        label: "Storage + DB latency",
        value: "Normal",
        detail: "No downstream pressure; CPU flat outside GC pauses",
        tone: "normal",
        evidenceId: "downstream-services-healthy",
      },
      {
        id: "m-restarts",
        label: "Worker restarts / 24h",
        value: "7",
        detail: "All triggered by the memory threshold, none by crashes",
        tone: "warning",
      },
    ],
    latency: {
      caption: "image-worker-3 old-space heap, MB — last 4 hours",
      unit: "MB",
      series: [182, 264, 371, 468, 592, 703, 848, 970, 1104, 1238, 1382, 1421],
      deployAt: 0,
      deployLabel: "Worker boot",
    },
  },

  code: {
    file: "src/workers/image-job.worker.ts",
    language: "TypeScript",
    lines: [
      { n: 28, text: "const recentJobs: ImageJob[] = [];" },
      { n: 29, text: "" },
      { n: 30, text: "async function processJob(job: ImageJob) {" },
      {
        n: 31,
        text: "  const onProgress = (value: number) => {",
        evidenceId: "listener-added-per-job-never-removed",
      },
      {
        n: 32,
        text: "    logger.debug({ jobId: job.id, sourceBuffer: job.sourceBuffer, value });",
        evidenceId: "listener-added-per-job-never-removed",
      },
      { n: 33, text: "  };" },
      { n: 34, text: "" },
      {
        n: 35,
        text: '  worker.on("progress", onProgress);',
        evidenceId: "listener-added-per-job-never-removed",
      },
      { n: 36, text: "  recentJobs.push(job);" },
      { n: 37, text: "" },
      { n: 38, text: "  const result = await worker.run(job);" },
      { n: 39, text: "  await storage.put(result.key, result.buffer);" },
      { n: 40, text: "" },
      {
        n: 41,
        text: "  // no removeListener, no finally block — the handler outlives the job",
        evidenceId: "listener-added-per-job-never-removed",
      },
      { n: 42, text: "  return result;" },
      { n: 43, text: "}" },
    ],
  },

  database: {
    caption: "Heap composition from the snapshot taken at 05:41, before recycling.",
    stats: [
      { id: "d-total", label: "Snapshot heap size", value: "1.41 GB" },
      {
        id: "d-buffers",
        label: "Retained by progress handlers",
        value: "1.19 GB",
        detail: "8,412 closures, each holding one job and its source buffer",
      },
      {
        id: "d-live",
        label: "Retained by in-flight jobs",
        value: "8.4 MB",
        detail: "4 jobs actually running",
      },
      {
        id: "d-gc",
        label: "Reclaimed per major GC",
        value: "24 MB",
        detail: "Was 210MB when the worker was fresh",
      },
    ],
  },

  trace: {
    caption: "One image job, dispatch to completion — the job itself is healthy",
    root: { label: "job img_48802", ms: 3712 },
    spans: [
      { id: "t-decode", label: "decode source image", ms: 402 },
      { id: "t-resize", label: "resize + encode variants", ms: 2810 },
      { id: "t-upload", label: "upload variants to storage", ms: 461 },
      { id: "t-ack", label: "ack job — completes successfully", ms: 6 },
      {
        id: "t-gc",
        label: "major GC during job: 1 every 11s, 24MB reclaimed",
        ms: 33,
        evidenceId: "gc-runs-more-but-frees-less",
      },
      {
        id: "t-retained",
        label: "retained after completion: 1 listener + 2.1MB buffer",
        ms: 0,
        evidenceId: "heap-never-returns-to-baseline",
      },
    ],
  },
};

const QUEUE_BACKLOG_INVESTIGATION: Investigation = {
  missionId: "worker-queue-backlog",
  objective:
    "Find evidence explaining why the notification queue keeps growing while workers stay busy.",
  requiredKeyClues: 3,
  tools: ["logs", "metrics", "code", "database", "trace"],

  toolCopy: {
    logs: {
      description: "Notification worker logs during the backlog",
      hint: "Read the job ids, not just the error messages.",
    },
    metrics: {
      description: "Queue, worker and delivery-provider counters",
      hint: "Compare how busy the workers are with how much work actually lands.",
    },
    code: {
      description: "The notification job processor",
      hint: "Follow what happens to a job that fails.",
    },
    database: {
      description: "Queue broker state and per-queue counters",
      hint: "A queue that never dead-letters anything is telling you something.",
    },
    trace: {
      description: "One notification job followed through the worker",
      hint: "Watch where the job goes after it fails.",
    },
  },

  summary: {
    headline: { label: "Queue Depth", value: "184,000" },
    findings: [
      "Queue depth is growing while workers report near-100% utilisation.",
      "Successful deliveries per minute fall every time more workers are added.",
    ],
  },

  evidence: [
    {
      id: "same-job-retried-endlessly",
      source: "logs",
      title: "One job retried thousands of times",
      description:
        "Job notif_88213 fails validation and reappears immediately, attempt after attempt. The log shows attempt=4812 for a single job id.",
      isKeyEvidence: true,
    },
    {
      id: "provider-429-rate",
      source: "metrics",
      title: "Most provider responses are 429",
      description:
        "61% of calls to the delivery provider return 429 Too Many Requests. The provider is throttling the service, and every throttled call is retried straight away.",
      isKeyEvidence: true,
    },
    {
      id: "immediate-requeue-in-catch",
      source: "code",
      title: "Failures are re-enqueued immediately",
      description:
        "The catch block re-adds the job with no attempt cap, no delay and no distinction between a transient 429 and a permanently malformed payload.",
      isKeyEvidence: true,
    },
    {
      id: "poison-job-cycle-in-trace",
      source: "trace",
      title: "A job cycles through the worker in 40ms",
      description:
        "The trace shows process → provider 429 → requeue completing in 40ms, so a single failing job can consume a worker slot dozens of times a second.",
      isKeyEvidence: true,
    },
    {
      id: "throughput-falls-as-workers-rise",
      source: "metrics",
      title: "More workers, fewer deliveries",
      description:
        "Worker count went 8 → 16 → 24. Successful deliveries per minute went 240 → 150 → 90. Adding capacity made the incident worse.",
      isKeyEvidence: true,
    },
    {
      id: "backlog-grows-with-empty-dead-letter",
      source: "database",
      title: "Backlog grows while the dead-letter queue stays empty",
      description:
        "Queue depth is 184,000 and the oldest job is 42 minutes old, yet the dead-letter queue holds 0 messages. Nothing is ever given up on.",
      isKeyEvidence: true,
    },
    {
      id: "broker-healthy",
      source: "database",
      title: "The queue broker is healthy",
      description:
        "Broker CPU is 18%, publish latency 3ms, no failovers and no dropped connections. The broker is keeping up with everything asked of it.",
      isKeyEvidence: false,
    },
    {
      id: "infrastructure-not-saturated",
      source: "metrics",
      title: "CPU, memory and database are fine",
      description:
        "Worker CPU averages 34%, heap is flat across the incident and database query latency is unchanged. Nothing is resource-starved.",
      isKeyEvidence: false,
    },
    {
      id: "arrival-rate-unchanged",
      source: "metrics",
      title: "New-job arrival rate is unchanged",
      description:
        "Notifications are being enqueued at 1,100/min, the same as the previous week. The growth is on the drain side, not the fill side.",
      isKeyEvidence: false,
    },
  ],

  logs: {
    service: "notification-worker",
    window: "Last 30 min",
    lines: [
      {
        id: "l1",
        time: "11:04:02.118",
        level: "ERROR",
        message:
          "job failed  id=notif_88213  attempt=4810  reason=InvalidRecipient: missing channel address",
        evidenceId: "same-job-retried-endlessly",
      },
      {
        id: "l2",
        time: "11:04:02.157",
        level: "INFO",
        message: "job requeued  id=notif_88213  attempt=4811  delay=0ms",
        evidenceId: "same-job-retried-endlessly",
      },
      {
        id: "l3",
        time: "11:04:02.196",
        level: "ERROR",
        message:
          "job failed  id=notif_88213  attempt=4812  reason=InvalidRecipient: missing channel address",
        evidenceId: "same-job-retried-endlessly",
      },
      {
        id: "l4",
        time: "11:04:02.244",
        level: "WARN",
        message:
          "provider response 429 Too Many Requests  retry-after=30  id=notif_91004",
        evidenceId: "provider-429-rate",
      },
      {
        id: "l5",
        time: "11:04:02.245",
        level: "INFO",
        message: "job requeued  id=notif_91004  attempt=17  delay=0ms",
        evidenceId: "provider-429-rate",
      },
      {
        id: "l6",
        time: "11:04:05.900",
        level: "WARN",
        message: "queue depth 184,012  oldest job age 42m  dead-letter 0",
      },
      {
        id: "l7",
        time: "11:04:06.001",
        level: "INFO",
        message: "worker utilisation 98%  delivered/min 90  workers=24",
        evidenceId: "throughput-falls-as-workers-rise",
      },
      {
        id: "l8",
        time: "11:04:06.010",
        level: "DEBUG",
        message: "enqueue rate 1,104/min  (7-day average 1,097/min)",
        evidenceId: "arrival-rate-unchanged",
      },
      {
        id: "l9",
        time: "11:04:07.512",
        level: "DEBUG",
        message: "worker cpu 34%  heapUsed 291MB  db p95 12ms",
        evidenceId: "infrastructure-not-saturated",
      },
      {
        id: "l10",
        time: "11:04:09.330",
        level: "INFO",
        message: "scaled workers 16 → 24  provider 429 rate 47% → 61%",
        evidenceId: "throughput-falls-as-workers-rise",
      },
    ],
  },

  metrics: {
    cards: [
      {
        id: "m-depth",
        label: "Queue depth",
        value: "184,012",
        detail: "Oldest job is 42 minutes old",
        tone: "critical",
      },
      {
        id: "m-429",
        label: "Provider 429 rate",
        value: "61%",
        detail: "Every throttled call is retried immediately",
        tone: "critical",
        evidenceId: "provider-429-rate",
      },
      {
        id: "m-throughput",
        label: "Delivered / min vs workers",
        value: "90 @ 24 workers",
        detail: "Was 240 at 8 workers — throughput fell as capacity rose",
        tone: "critical",
        evidenceId: "throughput-falls-as-workers-rise",
      },
      {
        id: "m-arrival",
        label: "Enqueue rate",
        value: "1,104/min",
        detail: "Unchanged against the 7-day average",
        tone: "normal",
        evidenceId: "arrival-rate-unchanged",
      },
      {
        id: "m-infra",
        label: "Worker CPU / heap / DB p95",
        value: "34% / 291MB / 12ms",
        detail: "Nothing is resource-starved",
        tone: "normal",
        evidenceId: "infrastructure-not-saturated",
      },
    ],
    latency: {
      caption: "Successful deliveries per minute against worker count",
      unit: "/min",
      series: [238, 241, 236, 240, 188, 152, 150, 121, 96, 90],
      deployAt: 4,
      deployLabel: "Scaled 8 → 24 workers",
    },
  },

  code: {
    file: "src/workers/notification.processor.ts",
    language: "TypeScript",
    lines: [
      { n: 44, text: "export async function processNotification(job: Job<Notification>) {" },
      { n: 45, text: "  try {" },
      { n: 46, text: "    const recipient = await resolveRecipient(job.data);" },
      { n: 47, text: "    await provider.send(recipient, job.data.template);" },
      { n: 48, text: "    metrics.delivered.inc();" },
      { n: 49, text: "  } catch (error) {" },
      {
        n: 50,
        text: "    logger.error({ id: job.id, attempt: job.attemptsMade, reason: String(error) });",
      },
      { n: 51, text: "" },
      {
        n: 52,
        text: "    // every failure goes straight back on the queue",
        evidenceId: "immediate-requeue-in-catch",
      },
      {
        n: 53,
        text: "    await queue.add(job.name, job.data);",
        evidenceId: "immediate-requeue-in-catch",
      },
      {
        n: 54,
        text: "    // no attempt cap, no backoff, no permanent/transient split",
        evidenceId: "immediate-requeue-in-catch",
      },
      { n: 55, text: "  }" },
      { n: 56, text: "}" },
    ],
  },

  database: {
    caption: "Broker state for the notifications queue, sampled at 11:04.",
    stats: [
      {
        id: "q-depth",
        label: "Ready messages",
        value: "184,012",
        detail: "Oldest job age 42m and rising",
        evidenceId: "backlog-grows-with-empty-dead-letter",
      },
      {
        id: "q-dlq",
        label: "Dead-letter messages",
        value: "0",
        detail: "No job has ever been given up on",
        evidenceId: "backlog-grows-with-empty-dead-letter",
      },
      {
        id: "q-broker-cpu",
        label: "Broker CPU / publish latency",
        value: "18% / 3ms",
        detail: "No failovers, no dropped connections",
        evidenceId: "broker-healthy",
      },
      {
        id: "q-redeliveries",
        label: "Redeliveries in the last minute",
        value: "71,400",
        detail: "Against 90 successful deliveries",
      },
    ],
  },

  trace: {
    caption: "One failing notification job, followed through a worker slot",
    root: { label: "job notif_88213 attempt 4812", ms: 40 },
    spans: [
      { id: "t-claim", label: "claim job from queue", ms: 3 },
      { id: "t-resolve", label: "resolveRecipient", ms: 8 },
      {
        id: "t-send",
        label: "provider.send → 429 Too Many Requests",
        ms: 24,
        evidenceId: "provider-429-rate",
      },
      {
        id: "t-requeue",
        label: "queue.add — immediate requeue, delay 0ms",
        ms: 5,
        evidenceId: "poison-job-cycle-in-trace",
      },
      {
        id: "t-cycle",
        label: "same job re-claimed 40ms later — cycle repeats",
        ms: 0,
        evidenceId: "poison-job-cycle-in-trace",
      },
    ],
  },
};

const CONNECTION_POOL_INVESTIGATION: Investigation = {
  missionId: "connection-pool-exhaustion",
  objective:
    "Find evidence explaining why requests wait seconds for a database connection while the database itself is idle.",
  requiredKeyClues: 3,
  tools: ["logs", "metrics", "code", "database", "trace"],

  toolCopy: {
    logs: {
      description: "API logs with pool checkout and release events",
      hint: "Every checkout should have a matching release. Check whether it does.",
    },
    metrics: {
      description: "Connection-pool counters and request latency",
      hint: "Separate the time spent waiting for a connection from the time spent using one.",
    },
    code: {
      description: "The order-detail handler that checks out a connection",
      hint: "Follow every path out of the function, not just the successful one.",
    },
    database: {
      description: "Database-side health during the incident",
      hint: "Ask whether the database is actually being asked to do more work.",
    },
    trace: {
      description: "One slow GET /api/orders/:id request",
      hint: "Compare the acquire span with the query span.",
    },
  },

  summary: {
    headline: { label: "Pool Acquire Wait (p95)", value: "4.8s" },
    findings: [
      "The connection pool sits at its maximum with no idle connections.",
      "Query execution time is unchanged — requests are waiting to start, not running slowly.",
    ],
  },

  evidence: [
    {
      id: "acquire-timeouts",
      source: "logs",
      title: "Requests time out acquiring a connection",
      description:
        "TimeoutError: pool acquire timed out after 10000ms appears repeatedly, all from the same handler, once traffic rises.",
      isKeyEvidence: true,
    },
    {
      id: "checkout-without-matching-release",
      source: "logs",
      title: "Checkouts with no matching release",
      description:
        "Connection conn_41 is checked out, the handler logs a NotFoundError, and no release event for conn_41 ever follows. 20 connection ids show the same pattern.",
      isKeyEvidence: true,
    },
    {
      id: "pool-saturated-idle-zero",
      source: "metrics",
      title: "Pool pinned at maximum with zero idle",
      description:
        "Active connections hold at 20 of 20 and idle connections sit at 0 for the whole incident, with 34 requests queued for a connection.",
      isKeyEvidence: true,
    },
    {
      id: "early-return-skips-release",
      source: "code",
      title: "An error path returns before release()",
      description:
        "The handler acquires a connection, then throws NotFoundError when the order is missing. release() is only reached on the successful path, so the connection is never returned to the pool.",
      isKeyEvidence: true,
    },
    {
      id: "wait-dominates-request",
      source: "trace",
      title: "Waiting for a connection dominates the request",
      description:
        "A 4.9s request spends 4,820ms acquiring a connection and 14ms executing its query. The work is fast; getting permission to start it is not.",
      isKeyEvidence: true,
    },
    {
      id: "query-execution-healthy",
      source: "database",
      title: "Query execution is still fast",
      description:
        "Mean query duration is 12ms, unchanged from before the incident, and the slow-query log is empty. The database is not doing anything slowly.",
      isKeyEvidence: true,
    },
    {
      id: "no-lock-contention",
      source: "database",
      title: "No lock waits or long transactions",
      description:
        "Zero lock-wait events, no transaction older than 40ms, and no blocked sessions. Nothing on the database side is holding anything up.",
      isKeyEvidence: false,
    },
    {
      id: "database-cpu-and-replication-healthy",
      source: "metrics",
      title: "Database CPU and replication are healthy",
      description:
        "Database CPU is 28%, replica lag is 40ms and network round-trip to the database is 0.8ms — all normal.",
      isKeyEvidence: false,
    },
    {
      id: "notfound-rate-is-ordinary",
      source: "logs",
      title: "404s are ordinary traffic",
      description:
        "The rate of missing-order lookups is 2.1% of requests, the same as last week. The error path is not new — only its consequence is.",
      isKeyEvidence: false,
    },
  ],

  logs: {
    service: "orders-api",
    window: "Last 20 min",
    lines: [
      {
        id: "l1",
        time: "09:41:02.004",
        level: "DEBUG",
        message: "pool checkout  conn=conn_41  handler=getOrderDetail  active=17/20",
        evidenceId: "checkout-without-matching-release",
      },
      {
        id: "l2",
        time: "09:41:02.019",
        level: "WARN",
        message:
          "NotFoundError: order 55120 not found  handler=getOrderDetail  conn=conn_41",
        evidenceId: "checkout-without-matching-release",
      },
      {
        id: "l3",
        time: "09:41:02.020",
        level: "DEBUG",
        message: "pool checkout  conn=conn_42  handler=getOrderDetail  active=18/20",
      },
      {
        id: "l4",
        time: "09:41:02.061",
        level: "DEBUG",
        message: "pool release   conn=conn_42  held_ms=41",
      },
      {
        id: "l5",
        time: "09:41:04.400",
        level: "WARN",
        message:
          "pool state  active=20/20  idle=0  queued=34  (no release for conn_41 in 2.4s)",
        evidenceId: "checkout-without-matching-release",
      },
      {
        id: "l6",
        time: "09:41:12.118",
        level: "ERROR",
        message:
          "TimeoutError: pool acquire timed out after 10000ms  handler=listOrders",
        evidenceId: "acquire-timeouts",
      },
      {
        id: "l7",
        time: "09:41:12.119",
        level: "ERROR",
        message:
          "TimeoutError: pool acquire timed out after 10000ms  handler=getOrderDetail",
        evidenceId: "acquire-timeouts",
      },
      {
        id: "l8",
        time: "09:41:15.222",
        level: "INFO",
        message: "GET /api/orders/91002 200 4902ms  (query 14ms)",
      },
      {
        id: "l9",
        time: "09:41:16.010",
        level: "DEBUG",
        message: "missing-order lookups 2.1% of requests (7-day average 2.0%)",
        evidenceId: "notfound-rate-is-ordinary",
      },
      {
        id: "l10",
        time: "09:41:18.771",
        level: "WARN",
        message: "leaked connections since boot: 20  reclaimed: 0",
      },
    ],
  },

  metrics: {
    cards: [
      {
        id: "m-pool",
        label: "Pool active / idle",
        value: "20 / 0",
        detail: "Pinned at max, 34 requests queued for a connection",
        tone: "critical",
        evidenceId: "pool-saturated-idle-zero",
      },
      {
        id: "m-wait",
        label: "Acquire wait (p95)",
        value: "4.8s",
        detail: "Was 2ms before the incident",
        tone: "critical",
      },
      {
        id: "m-query",
        label: "Query execution (p95)",
        value: "18ms",
        detail: "Unchanged — the queries themselves are fine",
        tone: "normal",
      },
      {
        id: "m-db",
        label: "DB CPU / replica lag / RTT",
        value: "28% / 40ms / 0.8ms",
        detail: "Every database-side signal is normal",
        tone: "normal",
        evidenceId: "database-cpu-and-replication-healthy",
      },
      {
        id: "m-timeouts",
        label: "Acquire timeouts / min",
        value: "63",
        detail: "All raised before any SQL was sent",
        tone: "warning",
      },
    ],
    latency: {
      caption: "Request latency vs query execution time, ms — last 20 minutes",
      unit: "ms",
      series: [102, 118, 96, 340, 1180, 2410, 3620, 4480, 4902, 4870],
      deployAt: 3,
      deployLabel: "Traffic ramp",
    },
  },

  code: {
    file: "src/routes/order-detail.route.ts",
    language: "TypeScript",
    lines: [
      { n: 61, text: "router.get(\"/orders/:id\", async (req, res) => {" },
      { n: 62, text: "  const connection = await pool.getConnection();" },
      { n: 63, text: "" },
      { n: 64, text: "  const order = await orderRepository.findById(req.params.id);" },
      {
        n: 65,
        text: "  if (!order) {",
        evidenceId: "early-return-skips-release",
      },
      {
        n: 66,
        text: "    throw new NotFoundError(`order ${req.params.id} not found`);",
        evidenceId: "early-return-skips-release",
      },
      {
        n: 67,
        text: "  }",
        evidenceId: "early-return-skips-release",
      },
      { n: 68, text: "" },
      { n: 69, text: "  const items = await connection.query(ITEMS_SQL, [order.id]);" },
      { n: 70, text: "  const invoice = await billingApi.fetchInvoice(order.id);" },
      { n: 71, text: "" },
      {
        n: 72,
        text: "  connection.release(); // only reached when nothing threw",
        evidenceId: "early-return-skips-release",
      },
      { n: 73, text: "  res.json({ ...order, items, invoice });" },
      { n: 74, text: "});" },
    ],
  },

  database: {
    caption: "Database-side health for the same 20-minute window.",
    stats: [
      {
        id: "db-query",
        label: "Mean query duration",
        value: "12ms",
        detail: "Unchanged; the slow-query log is empty",
        evidenceId: "query-execution-healthy",
      },
      {
        id: "db-locks",
        label: "Lock-wait events",
        value: "0",
        detail: "No transaction older than 40ms, no blocked sessions",
        evidenceId: "no-lock-contention",
      },
      {
        id: "db-sessions",
        label: "Server-side sessions",
        value: "20",
        detail: "Open and idle-in-session — held by the API, not working",
      },
      {
        id: "db-throughput",
        label: "Queries per second",
        value: "310",
        detail: "Down from 1,240 — the database is being asked to do less",
      },
    ],
  },

  trace: {
    caption: "GET /api/orders/91002 — 4.9s total",
    root: { label: "GET /api/orders/:id", ms: 4902 },
    spans: [
      {
        id: "t-acquire",
        label: "pool.getConnection — waiting for a free connection",
        ms: 4820,
        evidenceId: "wait-dominates-request",
      },
      {
        id: "t-query",
        label: "SELECT order_items WHERE order_id = $1",
        ms: 14,
        evidenceId: "wait-dominates-request",
      },
      { id: "t-billing", label: "billingApi.fetchInvoice", ms: 52 },
      { id: "t-serialize", label: "JSON serialization", ms: 9 },
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
  "event-loop-overload": EVENT_LOOP_INVESTIGATION,
  "promise-all-cascade": PROMISE_CASCADE_INVESTIGATION,
  "async-map-trap": ASYNC_MAP_INVESTIGATION,
  "overlapping-scheduler-runs": SCHEDULER_OVERLAP_INVESTIGATION,
  "unhandled-rejection-storm": REJECTION_STORM_INVESTIGATION,
  "jwt-session-expiry": JWT_REFRESH_RACE_INVESTIGATION,
  "health-check-flapping": HEALTH_CHECK_INVESTIGATION,
  "graceful-shutdown-bug": GRACEFUL_SHUTDOWN_INVESTIGATION,
  "rate-limiter-race": RATE_LIMITER_RACE_INVESTIGATION,
  "memory-leak-worker": MEMORY_LEAK_INVESTIGATION,
  "worker-queue-backlog": QUEUE_BACKLOG_INVESTIGATION,
  "connection-pool-exhaustion": CONNECTION_POOL_INVESTIGATION,
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
  ERROR: "border-rose-400/30 bg-rose-500/10 text-rose-300",
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
