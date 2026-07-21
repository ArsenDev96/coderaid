import "server-only";

import { achievementSources, getAchievements, unlockedIds } from "@/lib/achievements";
import { EMPTY_LEDGER, type Ledger, type MissionRecord } from "@/lib/progress";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The player's ledger, derived from Postgres.
 *
 * `lib/progress.ts` still defines what a `Ledger` *is* and every consumer still
 * reads that shape — this module only changes where the numbers come from. The
 * organising rule from the schema holds: the runs are the evidence and every
 * figure is derived from them, so there is no `total_xp` column to disagree
 * with the rows behind it.
 *
 * Three sources, because three different things are true:
 *   - `best_runs`             what the player has achieved (best run per mission)
 *   - `player_active_days`    when they showed up, which is what a streak counts
 *   - `player_achievements`   when a threshold was first crossed
 *
 * Reads use the service-role client and scope every query by `player_id` from
 * the verified session. RLS would also allow a player to read their own rows,
 * but going through one client keeps the "route handlers own the data" rule
 * whole rather than splitting it by operation.
 */

/** One row of `best_runs` — the columns the ledger is built from. */
type BestRunRow = {
  mission_id: string;
  score: number;
  xp_earned: number;
  resolved: boolean;
  skill_xp: Record<string, number> | null;
  duration_ms: number;
  hints_used: number;
  completed_at: string;
  completed_on: string;
  attempts: number;
};

/**
 * Builds the ledger for a player. Returns `EMPTY_LEDGER` for someone with no
 * history — the same genuinely-valid zero state a new player has, so nothing
 * downstream needs a "loading" branch it didn't already have.
 */
export async function ledgerFor(playerId: string): Promise<Ledger> {
  const db = createAdminClient();

  const [runs, days, achievements] = await Promise.all([
    db
      .from("best_runs")
      .select(
        "mission_id,score,xp_earned,resolved,skill_xp,duration_ms,hints_used,completed_at,completed_on,attempts",
      )
      .eq("player_id", playerId),
    db.from("player_active_days").select("day").eq("player_id", playerId),
    db
      .from("player_achievements")
      .select("achievement_id,unlocked_at")
      .eq("player_id", playerId),
  ]);

  // A failed read must not read as "this player has nothing" — that would look
  // exactly like a reset. Callers surface it instead.
  if (runs.error || days.error || achievements.error) {
    throw new Error("ledger_read_failed");
  }

  const missions: Record<string, MissionRecord> = {};
  const skillXp: Record<string, number> = {};

  for (const row of (runs.data ?? []) as BestRunRow[]) {
    missions[row.mission_id] = {
      missionId: row.mission_id,
      completedAt: row.completed_at,
      completedOn: row.completed_on,
      score: row.score,
      xpEarned: row.xp_earned,
      durationMs: row.duration_ms,
      hintsUsed: row.hints_used,
      resolved: row.resolved,
      attempts: row.attempts,
    };

    // Skill XP sums the *best* run per mission, which is what makes a replay
    // an upgrade rather than a second award. The client's old top-up
    // arithmetic existed only to reach this same total incrementally.
    for (const [skillId, amount] of Object.entries(row.skill_xp ?? {})) {
      if (typeof amount !== "number" || !Number.isFinite(amount)) continue;
      skillXp[skillId] = (skillXp[skillId] ?? 0) + Math.round(amount);
    }
  }

  return {
    version: 2,
    totalXp: Object.values(missions).reduce((sum, m) => sum + m.xpEarned, 0),
    skillXp,
    missions,
    activeDays: (days.data ?? [])
      .map((d) => d.day as string)
      .sort(),
    achievements: Object.fromEntries(
      (achievements.data ?? []).map((a) => [
        a.achievement_id as string,
        a.unlocked_at as string,
      ]),
    ),
  };
}

/**
 * Stamps any achievement that has just become unlocked, server-side.
 *
 * Derivation is pure and lives in `lib/achievements.ts`; what the server adds
 * is that the *browser no longer asserts an unlock*. It is called after the two
 * things that can move a threshold — recording a run and recording an active
 * day — rather than on read, so a GET stays a GET.
 *
 * `ignoreDuplicates` makes it idempotent: an id already stamped keeps its
 * original time, so "unlocked 3 days ago" never drifts forward.
 */
export async function syncAchievements(
  playerId: string,
  ledger: Ledger,
): Promise<void> {
  const unlocked = unlockedIds(
    getAchievements(achievementSources(ledger), ledger.achievements),
  );
  const fresh = unlocked.filter((id) => !(id in ledger.achievements));
  if (fresh.length === 0) return;

  await createAdminClient()
    .from("player_achievements")
    .upsert(
      fresh.map((achievement_id) => ({ player_id: playerId, achievement_id })),
      { onConflict: "player_id,achievement_id", ignoreDuplicates: true },
    );
}

/**
 * Whether this player has already imported a pre-account local ledger.
 *
 * Sent with the ledger so the browser knows whether to offer the claim at all.
 * It is only ever a prompt: the endpoint re-checks, and a partial unique index
 * makes the answer binding regardless of what the client believes.
 */
export async function hasClaimed(playerId: string): Promise<boolean> {
  const { data, error } = await createAdminClient()
    .from("players")
    .select("claimed_at")
    .eq("id", playerId)
    .single();

  // Fail closed. If the column is missing because the migration hasn't been
  // applied, or the read simply failed, the honest answer is "don't offer an
  // import" — offering one that cannot succeed is worse than not offering it.
  if (error || !data) return true;
  return Boolean(data.claimed_at);
}

/** The zero ledger, for callers that need a valid one without a round trip. */
export { EMPTY_LEDGER };
