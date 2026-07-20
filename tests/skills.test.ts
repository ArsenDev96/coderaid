import { describe, expect, it } from "vitest";
import { EMPTY_VIEW, canStart, type PlayerView } from "@/lib/availability";
import { gradeMission, skillRewardFor } from "@/lib/grading";
import { getDiagnosis } from "@/lib/diagnosis";
import { getFix } from "@/lib/fix";
import { getMission, type Mission } from "@/lib/missions";
import {
  EMPTY_LEDGER,
  SKILL_XP_PER_LEVEL,
  creditRun,
  skillXpFor,
  type Ledger,
} from "@/lib/progress";
import { rewardFor } from "@/lib/grading";
import {
  SKILL_CATEGORIES,
  SKILL_DEFS,
  categoryAverage,
  getSkill,
  getSkillDef,
  levelLabel,
  masteryPct,
  radarData,
  relatedMissions,
  skillLevel,
  skillsFor,
  skillsSummary,
  skillsToImprove,
} from "@/lib/skills";
import { emptyRun } from "@/lib/run";

const mission = getMission("event-loop-overload") as Mission;

/** A perfect run of Event Loop Overload, graded by the real engine. */
function perfectRun() {
  const diagnosisConfig = getDiagnosis(mission.id)!;
  const fixConfig = getFix(mission.id)!;
  return gradeMission({
    mission,
    diagnosis: {
      config: diagnosisConfig,
      state: {
        rootCauseId: diagnosisConfig.correctRootCauseId,
        evidenceIds: [...diagnosisConfig.correctEvidenceIds],
        confirmed: true,
      },
    },
    fix: {
      config: fixConfig,
      state: { fixId: fixConfig.correctFixId, applied: true },
    },
    run: { ...emptyRun(0), lastActiveAt: 600_000 },
  });
}

describe("a new player's skills", () => {
  it("starts every skill at zero XP and level 0", () => {
    for (const skill of skillsFor(EMPTY_LEDGER)) {
      expect(skill.totalXp).toBe(0);
      expect(skill.level).toBe(0);
      expect(levelLabel(skill.level)).toBe("Not Started");
      expect(masteryPct(skill)).toBe(0);
    }
  });

  it("reports a zero summary and a flat radar", () => {
    const summary = skillsSummary(EMPTY_LEDGER);
    expect(summary.overall).toBe(0);
    expect(summary.started).toBe(0);
    expect(summary.mastered).toBe(0);
    expect(summary.total).toBe(SKILL_DEFS.length);
    expect(radarData(EMPTY_LEDGER).every((axis) => axis.value === 0)).toBe(true);
  });
});

describe("mission skill rewards", () => {
  const grade = perfectRun();
  const reward = skillRewardFor(mission, grade);

  it("credits the mission's primary reward skill", () => {
    expect(reward[mission.rewardSkillId as string]).toBe(mission.xp);
  });

  it("credits every skill that lists the mission, at a partial share", () => {
    const related = SKILL_DEFS.filter(
      (s) => s.missionIds.includes(mission.id) && s.id !== mission.rewardSkillId,
    );
    expect(related.length).toBeGreaterThan(0);
    for (const skill of related) {
      expect(reward[skill.id]).toBeGreaterThan(0);
      expect(reward[skill.id]).toBeLessThan(mission.xp);
    }
  });

  it("credits nothing to unrelated skills", () => {
    expect(reward.promises).toBeUndefined();
    expect(reward.authentication).toBeUndefined();
  });

  it("raises the derived skill level once the XP lands in the ledger", () => {
    const { ledger } = creditRun(EMPTY_LEDGER, rewardFor(mission, grade));
    const xp = skillXpFor(ledger, "event-loop");
    expect(xp).toBe(mission.xp);
    expect(skillLevel("event-loop", ledger)).toBe(
      Math.floor(xp / SKILL_XP_PER_LEVEL),
    );
    expect(getSkill("event-loop", ledger)?.level).toBe(
      skillLevel("event-loop", ledger),
    );
  });
});

describe("skill definitions", () => {
  it("keeps ids unique", () => {
    const ids = SKILL_DEFS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("places every skill in a real category", () => {
    const categories = new Set(SKILL_CATEGORIES.map((c) => c.id));
    for (const skill of SKILL_DEFS) {
      expect(categories.has(skill.category)).toBe(true);
    }
  });

  it("only references missions that exist", () => {
    for (const skill of SKILL_DEFS) {
      expect(relatedMissions(skill).map((m) => m.id)).toEqual(skill.missionIds);
    }
  });

  it("lists Event Loop Overload against the Event Loop skill", () => {
    expect(getSkillDef("event-loop")?.missionIds).toContain(
      "event-loop-overload",
    );
  });
});

describe("skillsToImprove", () => {
  it("only suggests skills a playable mission can actually improve", () => {
    const view: PlayerView = EMPTY_VIEW;
    for (const skill of skillsToImprove(EMPTY_LEDGER, view)) {
      const def = getSkillDef(skill.id)!;
      expect(relatedMissions(def).some((m) => canStart(m, view))).toBe(true);
    }
  });
});

describe("category averages", () => {
  it("rise only for the categories the earned skill belongs to", () => {
    const ledger: Ledger = {
      ...EMPTY_LEDGER,
      skillXp: { "event-loop": SKILL_XP_PER_LEVEL * 4 },
    };
    expect(categoryAverage("runtime", ledger)).toBeGreaterThan(0);
    expect(categoryAverage("apis", ledger)).toBe(0);
    expect(skillsSummary(ledger).started).toBe(1);
  });
});
