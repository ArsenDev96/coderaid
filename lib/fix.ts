import {
  Database,
  Hash,
  Layers,
  Network,
  Zap,
  type LucideIcon,
} from "lucide-react";

/* -------------------------------- Types --------------------------------- */

export type FixIconId = "async" | "database" | "hash" | "server" | "pool";

/**
 * Icons are referenced by key, not by component: the config crosses the
 * server→client boundary as props, and a function can't be serialized.
 */
export const FIX_ICONS: Record<FixIconId, LucideIcon> = {
  async: Zap,
  database: Database,
  hash: Hash,
  server: Layers,
  pool: Network,
};

export type FixOption = {
  id: string;
  title: string;
  description: string;
  icon: FixIconId;
  /** Whether this option actually addresses the confirmed root cause. */
  resolvesRootCause: boolean;
  /** Why it does — or doesn't — resolve the root cause. Shown once selected. */
  explanation: string[];
  codeExample?: string;
};

export type MissionFixConfig = {
  missionId: string;
  /** One-line restatement of the diagnosis this fix stage builds on. */
  confirmedRootCause: string;
  /** The question posed above the options. */
  prompt: string;
  options: FixOption[];
  /** Nudges toward the reasoning, never names the fix. */
  hint: string;
  correctFixId: string;
};

export type FixState = {
  fixId: string | null;
  applied: boolean;
};

/* ------------------------------- Content -------------------------------- */

const SIGNUP_LATENCY_FIX: MissionFixConfig = {
  missionId: "user-signup-latency-spike",
  confirmedRootCause:
    "The signup request waits for welcome-email delivery before returning the HTTP response.",
  prompt: "Choose the best fix",

  options: [
    {
      id: "async-welcome-email",
      title: "Send welcome email asynchronously",
      description:
        "Move email sending to a background job/queue so the signup request can return immediately.",
      icon: "async",
      resolvesRootCause: true,
      explanation: [
        "Eliminates the ~2.7s email provider latency from the critical signup path.",
        "Returns the HTTP response immediately after the user is created.",
        "Email delivery will be handled reliably in the background.",
        "Improves user experience and reduces server request time.",
      ],
      codeExample: `const user = await userRepository.create(input);

// Enqueue the welcome email instead of awaiting it
await emailQueue.add("welcome-email", {
  userId: user.id,
  email: user.email,
});

return user;`,
    },
    {
      id: "optimize-database-insert",
      title: "Optimize database insert",
      description:
        "Add indexes and optimize the user insert query to reduce database write latency.",
      icon: "database",
      resolvesRootCause: false,
      explanation: [
        "The insert already completes in ~31ms — it is not what makes signup slow.",
        "Extra indexes add write overhead and would not help here.",
        "The ~2.7s spent awaiting the welcome email would still remain.",
      ],
      codeExample: `await db.query(
  "CREATE INDEX idx_users_email ON users(email)"
);
// Insert is already ~31ms; this mainly speeds up reads
await userRepository.create(input);`,
    },
    {
      id: "faster-password-hashing",
      title: "Use a faster password-hashing algorithm",
      description:
        "Switch to a lighter hashing algorithm to reduce CPU time during signup.",
      icon: "hash",
      resolvesRootCause: false,
      explanation: [
        "Password hashing is only ~154ms — a small part of the request.",
        "Weakening the hash trades away security for little latency benefit.",
        "The email operation would still block the response for ~2.7s.",
      ],
      codeExample: `// Lower the bcrypt cost factor
const hash = await bcrypt.hash(password, 8);
// Saves ~100ms, but the email still blocks the request`,
    },
    {
      id: "increase-server-resources",
      title: "Increase server resources",
      description:
        "Scale up CPU and memory to handle more signup requests concurrently.",
      icon: "server",
      resolvesRootCause: false,
      explanation: [
        "CPU usage is normal — the request is waiting, not computing.",
        "More hardware raises throughput but not this request's duration.",
        "Each signup would still wait ~2.7s on the email provider.",
      ],
      codeExample: `# Scale the service vertically
resources:
  cpu: "2000m"
  memory: "2Gi"
# The request still waits ~2.7s on the email provider`,
    },
    {
      id: "increase-connection-pool",
      title: "Increase database connection pool size",
      description:
        "Expand the connection pool to avoid waiting for available connections.",
      icon: "pool",
      resolvesRootCause: false,
      explanation: [
        "The pool is healthy with zero lock waits — connections are not the bottleneck.",
        "A larger pool adds database load without addressing the delay.",
        "The awaited welcome email would still dominate the request.",
      ],
      codeExample: `pool: { max: 50 }
// Pool is healthy with 0 waits; connections aren't the issue`,
    },
  ],

  hint: "Choose the fix that removes the slow operation from the critical HTTP request path.",

  correctFixId: "async-welcome-email",
};

/* ------------------------------- Registry ------------------------------- */

/**
 * Fix content is hand-authored per mission — the options and their reasoning
 * only make sense against that mission's confirmed root cause. The route looks a
 * mission up by slug; missions without an entry fall back to the reserved-route
 * state, exactly like the earlier stages.
 */
export const fixConfigs: Record<string, MissionFixConfig> = {
  "user-signup-latency-spike": SIGNUP_LATENCY_FIX,
};

export function getFix(missionId: string): MissionFixConfig | undefined {
  return fixConfigs[missionId];
}

export const FIXABLE_MISSION_IDS = Object.keys(fixConfigs);

/* ------------------------- Persistence (localStorage) ------------------- */

export function fixStorageKey(missionId: string): string {
  return `coderaid:${missionId}:fix`;
}

/**
 * Restores a mission's fix selection. The id is validated against the mission's
 * own options, so an id left over from edited content can never resurrect.
 */
export function loadFixState(config: MissionFixConfig): FixState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(fixStorageKey(config.missionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FixState>;

    const fixId = config.options.some((o) => o.id === parsed.fixId)
      ? (parsed.fixId as string)
      : null;

    return {
      fixId,
      // "Applied" can't outlive the selection that earned it.
      applied: parsed.applied === true && Boolean(fixId),
    };
  } catch {
    return null;
  }
}

export function saveFixState(missionId: string, state: FixState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(fixStorageKey(missionId), JSON.stringify(state));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}
