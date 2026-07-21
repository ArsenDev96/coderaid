import "server-only";

import { getMission, type Difficulty } from "@/lib/missions";
import { levelFromXp } from "@/lib/progress";
import { SKILL_DEFS, type SkillCategoryId } from "@/lib/skills";
import { createAdminClient } from "@/lib/supabase/admin";
import type { StandingsRow } from "@/lib/leaderboards";

/**
 * The leaderboard, built from the same runs everything else derives from.
 *
 * There is no standings table and no stored rank. A rank is a fact about a
 * moment, and storing one would be a second source of truth that starts
 * disagreeing with the runs the instant anybody plays — the same reason there
 * is no `total_xp` column. So this reads `best_runs`, groups it, and ranks.
 *
 * **Only what a player earned is exposed.** The projection below is the whole
 * window onto another player: a display name, an avatar, and figures derived
 * from their runs. No email — there is no email column, deliberately — and no
 * run detail, so the board cannot leak which answers anyone chose.
 *
 * RLS still forbids one player reading another's rows directly. This runs with
 * the service-role key inside an authenticated route handler, which keeps the
 * endpoint the single controlled window rather than opening the tables.
 */

/** Only the columns the board needs. */
type RunRow = {
  player_id: string;
  mission_id: string;
  xp_earned: number;
  resolved: boolean;
  skill_xp: Record<string, number> | null;
  completed_on: string;
};

type PlayerRow = { id: string; display_name: string; avatar_id: string | null };

/** Which skill category a skill id belongs to, resolved once. */
const CATEGORY_OF = new Map(SKILL_DEFS.map((s) => [s.id, s.category]));

function daysAgo(days: number, now: Date): string {
  return new Date(now.getTime() - days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * The player's strongest skill category — what the category filter means by
 * "focus". Derived from where their skill XP actually went rather than from
 * anything they told us about themselves.
 */
function focusOf(skillXp: Record<string, number>): SkillCategoryId {
  const totals = new Map<SkillCategoryId, number>();
  for (const [skillId, amount] of Object.entries(skillXp)) {
    const category = CATEGORY_OF.get(skillId);
    if (!category) continue;
    totals.set(category, (totals.get(category) ?? 0) + amount);
  }
  const best = [...totals.entries()].sort((a, b) => b[1] - a[1])[0];
  return best?.[0] ?? "runtime";
}

/**
 * The difficulty this player mostly clears — what the difficulty filter means.
 * Ties break toward the harder band, so someone splitting their time evenly
 * between Easy and Hard reads as a Hard player, which is the more informative
 * of the two.
 */
const DIFFICULTY_ORDER: Difficulty[] = ["Easy", "Medium", "Hard", "Expert"];

function difficultyOf(missionIds: string[]): Difficulty {
  const counts = new Map<Difficulty, number>();
  for (const id of missionIds) {
    const difficulty = getMission(id)?.difficulty;
    if (!difficulty) continue;
    counts.set(difficulty, (counts.get(difficulty) ?? 0) + 1);
  }
  let best: Difficulty = "Medium";
  let bestCount = -1;
  for (const difficulty of DIFFICULTY_ORDER) {
    const count = counts.get(difficulty) ?? 0;
    if (count >= bestCount && count > 0) {
      best = difficulty;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Every ranked player, with their period figures.
 *
 * Reads the whole `best_runs` table. That is honest at this size — one row per
 * player per completed mission, so a thousand players is a few thousand rows —
 * and the day it isn't, the fix is a materialised view refreshed on write
 * rather than a stored rank.
 *
 * Players with no completed run are omitted: an unplayed account has no
 * standing, and padding the board with zero rows would make the population
 * figure a lie in the other direction.
 */
export async function standings(now: Date = new Date()): Promise<StandingsRow[]> {
  const db = createAdminClient();

  const [runs, players] = await Promise.all([
    db
      .from("best_runs")
      .select("player_id,mission_id,xp_earned,resolved,skill_xp,completed_on"),
    db.from("players").select("id,display_name,avatar_id"),
  ]);

  if (runs.error || players.error) throw new Error("standings_read_failed");

  const profiles = new Map(
    ((players.data ?? []) as PlayerRow[]).map((p) => [p.id, p]),
  );

  const weekCutoff = daysAgo(6, now);
  const monthCutoff = daysAgo(29, now);

  type Accumulator = {
    xp: { week: number; month: number; all: number };
    missions: { week: number; month: number; all: number };
    resolved: number;
    total: number;
    skillXp: Record<string, number>;
    missionIds: string[];
  };

  const byPlayer = new Map<string, Accumulator>();

  for (const run of (runs.data ?? []) as RunRow[]) {
    let acc = byPlayer.get(run.player_id);
    if (!acc) {
      acc = {
        xp: { week: 0, month: 0, all: 0 },
        missions: { week: 0, month: 0, all: 0 },
        resolved: 0,
        total: 0,
        skillXp: {},
        missionIds: [],
      };
      byPlayer.set(run.player_id, acc);
    }

    acc.xp.all += run.xp_earned;
    acc.missions.all += 1;
    // Period figures count when the run was completed, in the player's own
    // calendar days — the same unit the streak uses.
    if (run.completed_on >= monthCutoff) {
      acc.xp.month += run.xp_earned;
      acc.missions.month += 1;
    }
    if (run.completed_on >= weekCutoff) {
      acc.xp.week += run.xp_earned;
      acc.missions.week += 1;
    }

    acc.total += 1;
    if (run.resolved) acc.resolved += 1;
    acc.missionIds.push(run.mission_id);
    for (const [skillId, amount] of Object.entries(run.skill_xp ?? {})) {
      if (typeof amount !== "number" || !Number.isFinite(amount)) continue;
      acc.skillXp[skillId] = (acc.skillXp[skillId] ?? 0) + amount;
    }
  }

  const rows: StandingsRow[] = [];
  for (const [playerId, acc] of byPlayer) {
    const profile = profiles.get(playerId);
    // A run whose player row has gone is a deleted account mid-cascade. Skip
    // it rather than inventing a name for someone who isn't there.
    if (!profile) continue;

    rows.push({
      id: playerId,
      username: profile.display_name,
      avatar: profile.avatar_id ?? undefined,
      level: levelFromXp(acc.xp.all),
      successRate:
        acc.total === 0 ? 0 : Math.round((acc.resolved / acc.total) * 100),
      focus: focusOf(acc.skillXp),
      difficulty: difficultyOf(acc.missionIds),
      xp: acc.xp,
      missions: acc.missions,
    });
  }

  return rows;
}
