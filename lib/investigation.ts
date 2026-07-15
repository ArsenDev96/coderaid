import {
  Database,
  FileText,
  LineChart,
  Code2,
  type LucideIcon,
} from "lucide-react";

/* -------------------------------- Types --------------------------------- */

export type InvestigationToolId = "logs" | "metrics" | "code" | "database";

export type InvestigationTool = {
  id: InvestigationToolId;
  label: string;
  description: string;
  icon: LucideIcon;
};

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

export type Investigation = {
  missionId: string;
  /** Short reminder of what the player is looking for. */
  objective: string;
  /** Key clues needed before the diagnosis unlocks. */
  requiredKeyClues: number;
  evidence: EvidenceItem[];
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
      /** Index in `series` where the deployment landed. */
      deployAt: number;
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
    repeatedQuery: string;
  };
};

/* -------------------------------- Tools --------------------------------- */

export const INVESTIGATION_TOOLS: InvestigationTool[] = [
  {
    id: "logs",
    label: "Logs",
    description: "Application logs for the orders endpoint",
    icon: FileText,
  },
  {
    id: "metrics",
    label: "Metrics",
    description: "Latency, errors, and resource usage",
    icon: LineChart,
  },
  {
    id: "code",
    label: "Code",
    description: "The request handler shipped in the last deploy",
    icon: Code2,
  },
  {
    id: "database",
    label: "Database",
    description: "Query activity behind a single request",
    icon: Database,
  },
];

/* ------------------------------- Content -------------------------------- */

const SLOW_API_INVESTIGATION: Investigation = {
  missionId: "slow-api-incident",
  objective:
    "Find evidence explaining why the orders endpoint became slow.",
  requiredKeyClues: 3,

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
    repeatedQuery: "SELECT * FROM order_items WHERE order_id = $1",
  },
};

const INVESTIGATIONS: Investigation[] = [SLOW_API_INVESTIGATION];

/* ------------------------------- Helpers -------------------------------- */

/**
 * Investigation content is hand-authored per mission: unlike a briefing it
 * cannot be derived from the mission model, because it needs real logs, code
 * and query traces. Missions without it keep the placeholder route.
 */
export function getInvestigation(missionId: string): Investigation | undefined {
  return INVESTIGATIONS.find((i) => i.missionId === missionId);
}

export const INVESTIGATABLE_MISSION_IDS = INVESTIGATIONS.map((i) => i.missionId);

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

export function loadInvestigationState(
  missionId: string,
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
    const tool = INVESTIGATION_TOOLS.some((t) => t.id === parsed.activeTool)
      ? (parsed.activeTool as InvestigationToolId)
      : "logs";
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
};
