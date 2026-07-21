import { coerceLedger, type Ledger } from "./progress";

/**
 * The client half of the ledger: ask the server what the player has earned.
 *
 * Nothing here computes progress. XP, level, rank, streak, skills and
 * achievements are all derived in Postgres from the runs the player actually
 * finished, and this module can only fetch that result — which is the whole
 * point of moving the ledger off `localStorage`. The wire shape is `Ledger`
 * unchanged, so every consumer of `useProgress()` is untouched.
 *
 * `unauthenticated` is deliberately its own outcome rather than an empty
 * ledger. A signed-out player may still have local progress from before the
 * migration, and showing them zero would read as a reset rather than a prompt
 * to sign in.
 */

export type LedgerResult =
  | {
      status: "ok";
      ledger: Ledger;
      /** Whether a pre-account local ledger has already been imported. */
      claimed: boolean;
    }
  | { status: "unauthenticated" }
  | { status: "failed" };

async function readLedger(response: Response): Promise<LedgerResult> {
  if (response.status === 401) return { status: "unauthenticated" };
  if (!response.ok) return { status: "failed" };
  try {
    const { ledger, claimed } = (await response.json()) as {
      ledger: unknown;
      claimed?: boolean;
    };
    // An absent flag reads as "already claimed", so a server that didn't answer
    // the question never causes the import prompt to appear speculatively.
    return { status: "ok", ledger: coerceLedger(ledger), claimed: claimed !== false };
  } catch {
    return { status: "failed" };
  }
}

/** The player's ledger as the server has it. */
export async function fetchLedger(): Promise<LedgerResult> {
  try {
    return await readLedger(await fetch("/api/ledger", { cache: "no-store" }));
  } catch {
    return { status: "failed" };
  }
}

/**
 * Hands the pre-account local ledger over, once.
 *
 * The server decides what any of it is worth: it recomputes XP and skill
 * awards from the catalogue and drops anything that isn't a real playable
 * mission, so this is a request to consider a history, not an assertion of one.
 */
export async function claimLocalLedger(ledger: Ledger): Promise<LedgerResult> {
  try {
    const response = await fetch("/api/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ledger }),
    });
    if (response.status === 401) return { status: "unauthenticated" };
    // 409 means someone already claimed — the outcome the player wanted, just
    // not caused by this request. Reading the ledger back is the right answer.
    if (response.status === 409) return await fetchLedger();
    if (!response.ok) return { status: "failed" };

    const { ledger: fresh } = (await response.json()) as { ledger?: unknown };
    return fresh
      ? { status: "ok", ledger: coerceLedger(fresh), claimed: true }
      : await fetchLedger();
  } catch {
    return { status: "failed" };
  }
}

/**
 * Records that the player is here today and returns the resulting ledger.
 *
 * The local date is sent because the streak is counted in local days; the
 * server bounds it to ±1 day of its own, so this states a timezone rather than
 * a fact about progress.
 */
export async function recordActivity(today: string): Promise<LedgerResult> {
  try {
    return await readLedger(
      await fetch("/api/ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ today }),
        cache: "no-store",
      }),
    );
  } catch {
    return { status: "failed" };
  }
}
