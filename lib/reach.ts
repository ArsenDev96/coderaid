import { PLAYABLE_MISSION_IDS } from "./availability";
import { CAREER_RANKS } from "./data";
import { perfectSkillRewardFor } from "./grading";
import { NODE_MISSIONS, resolveBriefing, type Mission } from "./missions";
import { skillLevelFromXp } from "./progress";
import type { CareerRank } from "./types";

/**
 * What the *authored catalogue* can award a flawless player.
 *
 * This module answers one question — "is this reward reachable at all?" — and it
 * exists because the MVP catalogue is deliberately frozen at 14 missions while
 * the rank ladder and several achievements were sized for a much larger one. At
 * 1,830 total XP, four of the six career ranks and two achievements cannot be
 * earned by any amount of play. Rendering them as ordinary locked goals would
 * promise the player something no play can deliver, which is the rule stated in
 * §4 principle 11: a control nothing can honour is worse than no control.
 *
 * Every figure here is **derived from the catalogue**, never authored. Writing
 * Chapter 4 raises the ceiling, and the ranks and achievements it puts back in
 * reach stop being roadmap on their own — no threshold anywhere needs editing.
 * `tests/reach.test.ts` is the guard that keeps that true.
 *
 * It is the mirror of `lib/availability.ts`: that module answers what *this
 * player* may do next, this one answers what *anyone* could ever finish.
 */

/** The missions a player can actually finish today, in catalogue order. */
export function playableMissions(): Mission[] {
  return NODE_MISSIONS.filter((m) => PLAYABLE_MISSION_IDS.includes(m.id));
}

/**
 * A production incident, as opposed to a fundamentals exercise: anything the
 * briefing rates above "low" severity.
 *
 * Lives here rather than in `lib/achievements.ts` — which is its only other
 * caller — because counting how many the catalogue contains is a reach
 * question, and importing it the other way would make the two modules cyclic.
 */
export function isProductionIncident(mission: Mission): boolean {
  return resolveBriefing(mission).severity !== "low";
}

export type CatalogueReach = {
  /** Total XP a flawless run of every playable mission is worth. */
  xpCeiling: number;
  /** How many missions can be finished at all. */
  playableMissions: number;
  /** How many of those the briefing rates above low severity. */
  productionIncidents: number;
  /** How many of a chapter's missions can be finished — a chapter clear needs all of them. */
  playableInChapter: (chapterId: number) => number;
  /** The most XP one skill can be credited, across every playable mission. */
  skillXpCeiling: (skillId: string) => number;
  /** The level that XP buys — what a skill-level achievement has to clear. */
  skillLevelCeiling: (skillId: string) => number;
};

/**
 * Measures the catalogue. Pure and cheap — a sum over 14 missions — so callers
 * derive it on demand rather than caching a figure that could go stale.
 */
export function catalogueReach(): CatalogueReach {
  const playable = playableMissions();

  const skillXp: Record<string, number> = {};
  for (const mission of playable) {
    for (const [skillId, amount] of Object.entries(perfectSkillRewardFor(mission))) {
      skillXp[skillId] = (skillXp[skillId] ?? 0) + amount;
    }
  }

  const skillXpCeiling = (skillId: string) => skillXp[skillId] ?? 0;

  return {
    xpCeiling: playable.reduce((sum, m) => sum + m.xp, 0),
    playableMissions: playable.length,
    productionIncidents: playable.filter(isProductionIncident).length,
    playableInChapter: (chapterId: number) =>
      playable.filter((m) => m.chapterId === chapterId).length,
    skillXpCeiling,
    // `skillLevelFromXp` already clamps at MAX_SKILL_LEVEL, so a skill with
    // surplus XP reports the cap rather than an impossible level.
    skillLevelCeiling: (skillId: string) => skillLevelFromXp(skillXpCeiling(skillId)),
  };
}

/* -------------------------------- Ranks --------------------------------- */

/**
 * Whether a flawless player could ever hold this rank. False for the four ranks
 * above the MVP ceiling, which are shown as roadmap rather than as goals.
 */
export function rankInReach(
  rank: CareerRank,
  reach: CatalogueReach = catalogueReach(),
): boolean {
  return rank.minXp <= reach.xpCeiling;
}

/** The ranks the catalogue can actually confer, lowest first. */
export function reachableRanks(
  reach: CatalogueReach = catalogueReach(),
): CareerRank[] {
  return [...CAREER_RANKS]
    .sort((a, b) => a.minXp - b.minXp)
    .filter((r) => rankInReach(r, reach));
}

/** The ranks that need content the catalogue does not have yet, lowest first. */
export function roadmapRanks(
  reach: CatalogueReach = catalogueReach(),
): CareerRank[] {
  return [...CAREER_RANKS]
    .sort((a, b) => a.minXp - b.minXp)
    .filter((r) => !rankInReach(r, reach));
}
