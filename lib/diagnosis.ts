import {
  Activity,
  Database,
  Hash,
  Mail,
  Network,
  type LucideIcon,
} from "lucide-react";
import type { InvestigationToolId } from "./investigation";

/* -------------------------------- Types --------------------------------- */

export type RootCauseIconId =
  | "database"
  | "hash"
  | "mail"
  | "activity"
  | "network";

/**
 * Icons are referenced by key, not by component: the config crosses the
 * server→client boundary as props, and a function can't be serialized.
 */
export const ROOT_CAUSE_ICONS: Record<RootCauseIconId, LucideIcon> = {
  database: Database,
  hash: Hash,
  mail: Mail,
  activity: Activity,
  network: Network,
};

export type RootCauseOption = {
  id: string;
  title: string;
  description: string;
  icon: RootCauseIconId;
};

/**
 * A finding carried over from the investigation. `id` matches the investigation
 * evidence id where the two describe the same thing, so the stages line up.
 */
export type DiagnosisEvidenceOption = {
  id: string;
  source: InvestigationToolId;
  title: string;
  description: string;
};

export type MissionDiagnosisConfig = {
  missionId: string;
  /** The question posed above the two columns. */
  prompt: string;
  rootCauses: RootCauseOption[];
  evidence: DiagnosisEvidenceOption[];
  minimumEvidenceRequired: number;
  /** Nudges toward the reasoning, never names the cause. */
  hint: string;
  correctRootCauseId: string;
  correctEvidenceIds: string[];
};

export type DiagnosisState = {
  rootCauseId: string | null;
  evidenceIds: string[];
  confirmed: boolean;
};

/* ------------------------------- Content -------------------------------- */

const SIGNUP_LATENCY_DIAGNOSIS: MissionDiagnosisConfig = {
  missionId: "user-signup-latency-spike",
  prompt: "What is the root cause?",
  minimumEvidenceRequired: 2,

  rootCauses: [
    {
      id: "slow-database-insert",
      title: "Slow database insert",
      description: "The user insert query is taking too long to complete.",
      icon: "database",
    },
    {
      id: "expensive-password-hashing",
      title: "Expensive password hashing",
      description: "Password hashing is CPU intensive and causes delays.",
      icon: "hash",
    },
    {
      id: "synchronous-welcome-email",
      title: "Synchronous welcome email",
      description:
        "The request waits for the welcome email to be sent before responding.",
      icon: "mail",
    },
    {
      id: "high-cpu-usage",
      title: "High CPU usage",
      description: "The server CPU is maxed out during signup requests.",
      icon: "activity",
    },
    {
      id: "connection-pool-exhaustion",
      title: "Database connection pool exhaustion",
      description: "No available connections cause requests to wait.",
      icon: "network",
    },
  ],

  evidence: [
    {
      id: "email-provider-latency",
      source: "trace",
      title: "Welcome email takes ~2.7s",
      description:
        "The trace shows the welcome-email step took ~2671ms, which dominates the request.",
    },
    {
      id: "awaited-email-operation",
      source: "code",
      title: "Email is awaited in request",
      description:
        "The code awaits sendWelcomeEmail() before returning the response to the client.",
    },
    {
      id: "database-is-healthy",
      source: "database",
      title: "Database insert is fast",
      description:
        "User insert takes only ~31ms. The database is not the bottleneck.",
    },
    {
      id: "cpu-is-normal",
      source: "metrics",
      title: "CPU usage is normal",
      description: "CPU remains stable during the latency spike.",
    },
    {
      id: "no-errors-in-logs",
      source: "logs",
      title: "No errors in logs",
      description: "No errors or retries are found during signup requests.",
    },
  ],

  hint: "Compare which operation takes most of the request time and whether the HTTP response waits for it.",

  correctRootCauseId: "synchronous-welcome-email",
  correctEvidenceIds: [
    "email-provider-latency",
    "awaited-email-operation",
    "database-is-healthy",
  ],
};

/* ------------------------------- Registry ------------------------------- */

/**
 * Diagnosis content is hand-authored per mission — the plausible-but-wrong root
 * causes only make sense against that mission's scenario. The route looks a
 * mission up by slug; missions without an entry fall back to the reserved-route
 * state, exactly like the investigation stage.
 */
export const diagnosisConfigs: Record<string, MissionDiagnosisConfig> = {
  "user-signup-latency-spike": SIGNUP_LATENCY_DIAGNOSIS,
};

export function getDiagnosis(
  missionId: string,
): MissionDiagnosisConfig | undefined {
  return diagnosisConfigs[missionId];
}

export const DIAGNOSABLE_MISSION_IDS = Object.keys(diagnosisConfigs);

/** Confirmation gate: one root cause plus enough supporting evidence. */
export function canConfirm(
  config: MissionDiagnosisConfig,
  state: Pick<DiagnosisState, "rootCauseId" | "evidenceIds">,
): boolean {
  return (
    Boolean(state.rootCauseId) &&
    state.evidenceIds.length >= config.minimumEvidenceRequired
  );
}

/* ------------------------- Persistence (localStorage) ------------------- */

export function diagnosisStorageKey(missionId: string): string {
  return `coderaid:${missionId}:diagnosis`;
}

/**
 * Restores a mission's diagnosis. Selections are validated against the mission's
 * own config, so ids left over from edited content can never resurrect.
 */
export function loadDiagnosisState(
  config: MissionDiagnosisConfig,
): DiagnosisState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(
      diagnosisStorageKey(config.missionId),
    );
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DiagnosisState>;

    const rootCauseId = config.rootCauses.some((c) => c.id === parsed.rootCauseId)
      ? (parsed.rootCauseId as string)
      : null;
    const evidenceIds = Array.isArray(parsed.evidenceIds)
      ? parsed.evidenceIds.filter((id) =>
          config.evidence.some((e) => e.id === id),
        )
      : [];

    return {
      rootCauseId,
      evidenceIds,
      // A confirmed flag can't outlive the selections that earned it.
      confirmed:
        parsed.confirmed === true && canConfirm(config, { rootCauseId, evidenceIds }),
    };
  } catch {
    return null;
  }
}

export function saveDiagnosisState(
  missionId: string,
  state: DiagnosisState,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      diagnosisStorageKey(missionId),
      JSON.stringify(state),
    );
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}
