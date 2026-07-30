import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  achievementSources as sourcesFor,
  achievementSummary,
  earnable,
  getAchievements,
  nextToUnlock,
  sortAchievements,
} from "@/lib/achievements";
import { CAREER_RANKS } from "@/lib/data";
import { PERFECT_SCORE } from "@/lib/grading";
import { NODE_MISSIONS } from "@/lib/missions";
import { EMPTY_LEDGER, rankBand, type Ledger } from "@/lib/progress";
import {
  catalogueReach,
  playableMissions,
  rankInReach,
  reachableRanks,
  roadmapRanks,
} from "@/lib/reach";
import {
  SKILL_DEFS,
  categoryAverage,
  categoryName,
  isPlannedSkill,
  masteryPct,
  radarData,
  skillsFor,
  skillsInCategory,
  skillsSummary,
  trainableInCategory,
} from "@/lib/skills";
import {
  collectResults,
  installStorage,
  play,
  uninstallStorage,
} from "./helpers/mission-run";

/**
 * What the frozen MVP catalogue can and cannot award.
 *
 * These tests exist to keep a promise honest, in both directions. The catalogue
 * is deliberately staying at 14 missions, which puts four career ranks and two
 * achievements permanently out of reach — those are shown as roadmap rather than
 * as goals. If a later pass writes Chapter 4, the ceiling rises and several
 * assertions here go red *on purpose*: that is the signal to stop badging the
 * newly reachable ones as roadmap.
 */

const reach = catalogueReach();

beforeEach(installStorage);
afterEach(uninstallStorage);

/**
 * The ledger of a player who cleared every playable mission perfectly, built by
 * driving the real stage functions and the real grading engine — not by adding
 * up `mission.xp`. That is the point: it independently confirms the ceiling
 * rather than restating the same sum the module under test computes.
 */
function perfectLedger(): Ledger {
  let ledger = EMPTY_LEDGER;
  for (const mission of playableMissions()) {
    play(mission.id);
    const result = collectResults(mission.id, ledger);
    expect(result.grade.score).toBe(PERFECT_SCORE);
    ledger = result.ledger;
  }
  return ledger;
}

describe("catalogueReach", () => {
  it("measures the MVP catalogue: 14 missions worth 1,830 XP", () => {
    expect(reach.playableMissions).toBe(14);
    expect(reach.xpCeiling).toBe(1830);
  });

  it("is the sum of the playable missions' own rewards, not a written-down figure", () => {
    expect(reach.xpCeiling).toBe(
      playableMissions().reduce((sum, m) => sum + m.xp, 0),
    );
  });

  it("agrees with what a flawless player actually earns", () => {
    // The strongest form of the claim: play every mission perfectly through the
    // real grading engine and the ledger lands exactly on the ceiling.
    expect(perfectLedger().totalXp).toBe(reach.xpCeiling);
  });

  it("counts every playable mission as a production incident", () => {
    // All 14 are authored medium or high severity, so On-Call Veteran's target
    // of 10 is clear by four rather than exactly met.
    expect(reach.productionIncidents).toBe(14);
  });

  it("reports Chapter 1 as fully playable, which is what a chapter clear needs", () => {
    expect(reach.playableInChapter(1)).toBe(
      NODE_MISSIONS.filter((m) => m.chapterId === 1).length,
    );
  });
});

describe("skill ceilings", () => {
  it("matches what a flawless playthrough credits each skill", () => {
    const ledger = perfectLedger();
    for (const def of SKILL_DEFS) {
      expect(reach.skillXpCeiling(def.id)).toBe(ledger.skillXp[def.id] ?? 0);
    }
  });

  it("leaves event-loop far short of the Advanced level its achievement wants", () => {
    // One authored mission builds it. This is the whole reason event-loop-master
    // is roadmap: 80 XP is level 2 against a target of 7.
    expect(reach.skillXpCeiling("event-loop")).toBe(80);
    expect(reach.skillLevelCeiling("event-loop")).toBe(2);
  });

  it("does fund the other two skill achievements", () => {
    expect(reach.skillLevelCeiling("root-cause-analysis")).toBeGreaterThanOrEqual(7);
    expect(reach.skillLevelCeiling("async-javascript")).toBeGreaterThanOrEqual(7);
  });
});

describe("planned skills", () => {
  it("is exactly streams and validation", () => {
    const planned = SKILL_DEFS.filter(isPlannedSkill).map((s) => s.id).sort();
    expect(planned).toEqual(["streams", "validation"]);
  });

  it("a planned skill has no mission that could train it", () => {
    for (const def of SKILL_DEFS.filter(isPlannedSkill)) {
      expect(reach.skillXpCeiling(def.id)).toBe(0);
    }
  });

  it("stops dragging down the mastery figure it cannot contribute to", () => {
    // The defect this closes: two permanent zeros were averaged into overall
    // mastery, so part of every player's shortfall was content that does not
    // exist. A flawless playthrough now reads 70% instead of 63%.
    const ledger = perfectLedger();
    const summary = skillsSummary(ledger);
    const all = skillsFor(ledger);
    const withPlanned = Math.round(
      all.reduce((sum, s) => sum + masteryPct(s), 0) / all.length,
    );

    expect(summary.overall).toBe(70);
    expect(withPlanned).toBe(63);
    expect(summary.total).toBe(SKILL_DEFS.length - 2);
  });

  it("is excluded from the category averages the radar renders", () => {
    // The radar has one axis per category, not one per skill, so a planned skill
    // does not add an axis — it drags down the axis of the category it sits in.
    // `streams` is node-core and `validation` is apis, so those two axes were
    // the ones reading low for content that does not exist.
    const ledger = perfectLedger();
    const axes = new Map(radarData(ledger).map((a) => [a.label, a.value]));

    for (const category of ["node-core", "apis"] as const) {
      const trainable = trainableInCategory(category, ledger);
      const withPlanned = skillsInCategory(category, ledger);
      expect(trainable.length).toBe(withPlanned.length - 1);

      const excluded = categoryAverage(category, ledger);
      const included = Math.round(
        withPlanned.reduce((sum, s) => sum + masteryPct(s), 0) / withPlanned.length,
      );
      expect(excluded).toBeGreaterThan(included);
      expect(axes.get(categoryName(category))).toBe(excluded);
    }
  });

  it("leaves the categories with no planned skill untouched", () => {
    const ledger = perfectLedger();
    for (const category of ["runtime", "debugging"] as const) {
      expect(trainableInCategory(category, ledger)).toHaveLength(
        skillsInCategory(category, ledger).length,
      );
    }
  });

  it("does not claim 100% mastery is reachable either", () => {
    // Stated so nobody reads the test above as "mastery is now maxable". It is
    // not: masteryPct measures the climb to level 10 (400 skill XP) and most
    // skills cannot get there at 14 missions. Unlike the ranks, no goal or
    // locked card promises it — it is a progress figure, so it is left alone.
    const ledger = perfectLedger();
    const maxed = skillsFor(ledger).filter((s) => masteryPct(s) === 100);
    expect(maxed.length).toBeGreaterThan(0);
    expect(maxed.length).toBeLessThan(SKILL_DEFS.length);
  });

  it("still renders them, so the taxonomy stays honest about what is coming", () => {
    const ids = skillsFor(EMPTY_LEDGER).map((s) => s.id);
    expect(ids).toContain("streams");
    expect(ids).toContain("validation");
    expect(skillsFor(EMPTY_LEDGER).filter((s) => s.planned)).toHaveLength(2);
  });
});

describe("career ranks", () => {
  it("puts four of the six ranks out of reach", () => {
    expect(reachableRanks(reach).map((r) => r.name)).toEqual([
      "Node.js Explorer",
      "Backend Apprentice",
    ]);
    expect(roadmapRanks(reach).map((r) => r.name)).toEqual([
      "Node.js Developer",
      "Backend Engineer",
      "Production Debugger",
      "Node.js Specialist",
    ]);
  });

  it("every rank is one or the other, and the split is by XP", () => {
    for (const rank of CAREER_RANKS) {
      expect(rankInReach(rank, reach)).toBe(rank.minXp <= reach.xpCeiling);
    }
  });

  it("stops badging a rank as roadmap once the catalogue can fund it", () => {
    // The forward-looking half: simulate the Chapter 4/5 catalogue and the
    // treatment lifts itself with no threshold edited anywhere.
    const grown = { ...reach, xpCeiling: 10_000 };
    expect(reachableRanks(grown).map((r) => r.name)).toContain("Backend Engineer");
    expect(roadmapRanks(grown).map((r) => r.name)).not.toContain("Backend Engineer");
  });
});

describe("rankBand against the ceiling", () => {
  it("measures progress toward the catalogue, not toward an unreachable rank", () => {
    const band = rankBand(600, reach.xpCeiling);
    expect(band.current.name).toBe("Backend Apprentice");
    expect(band.next?.name).toBe("Node.js Developer");
    expect(band.nextIsRoadmap).toBe(true);
    // 600 / 1,830 rather than 600 / 3,000.
    expect(band.xpMax).toBe(reach.xpCeiling);
  });

  it("keeps aiming at the next rank while one is in reach", () => {
    const band = rankBand(100, reach.xpCeiling);
    expect(band.current.name).toBe("Node.js Explorer");
    expect(band.nextIsRoadmap).toBe(false);
    expect(band.xpMax).toBe(500);
  });

  it("is unbounded when no ceiling is supplied", () => {
    // The pure-maths default: with no catalogue passed in, every authored rank
    // is treated as attainable, which is what the module can honestly assume.
    const band = rankBand(600);
    expect(band.nextIsRoadmap).toBe(false);
    expect(band.xpMax).toBe(3000);
  });

  it("holds the bar full at the top of the ladder", () => {
    const band = rankBand(60_000, reach.xpCeiling);
    expect(band.atTopRank).toBe(true);
    expect(band.nextIsRoadmap).toBe(false);
  });
});

describe("roadmap achievements", () => {
  const list = getAchievements(undefined, {}, reach);

  it("is exactly the two the catalogue cannot fund", () => {
    expect(list.filter((a) => a.roadmap).map((a) => a.id).sort()).toEqual([
      "backend-engineer-rank",
      "event-loop-master",
    ]);
  });

  it("every other achievement has a target the catalogue can reach", () => {
    for (const a of earnable(list)) {
      expect(a.progress).toBeLessThanOrEqual(a.target);
      expect(a.roadmap).toBe(false);
    }
  });

  it("a flawless player unlocks every earnable achievement except the streaks", () => {
    // The honest exception: a streak is bounded by the player's own days, not by
    // how many missions exist, so it can't be earned in a single playthrough.
    const earned = getAchievements(
      { ...sourcesFor(perfectLedger()) },
      {},
      reach,
    ).filter((a) => !a.roadmap && !a.unlocked);
    expect(earned.map((a) => a.id).sort()).toEqual([
      "seven-day-streak",
      "thirty-day-streak",
    ]);
  });

  it("excludes them from the unlocked-of-total figure", () => {
    const summary = achievementSummary(list);
    expect(summary.total).toBe(list.length - 2);
    expect(summary.roadmap).toBe(2);
  });

  it("never offers one as the next thing to unlock", () => {
    // event-loop-master sits at 2 of 7 for a player who cleared Chapter 1, which
    // is a high enough ratio to win this slot on closeness alone.
    const played = getAchievements({ ...sourcesFor(perfectLedger()) }, {}, reach);
    expect(nextToUnlock(played)?.roadmap ?? false).toBe(false);
  });

  it("sorts them last, however full their bar looks", () => {
    const sorted = sortAchievements(getAchievements({ ...sourcesFor(perfectLedger()) }, {}, reach));
    expect(sorted.slice(-2).every((a) => a.roadmap)).toBe(true);
  });

  it("stops being roadmap once the catalogue can fund it", () => {
    const grown = { ...reach, xpCeiling: 10_000 };
    const ids = getAchievements(undefined, {}, grown)
      .filter((a) => a.roadmap)
      .map((a) => a.id);
    expect(ids).not.toContain("backend-engineer-rank");
  });
});
