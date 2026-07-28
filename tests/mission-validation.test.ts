import { describe, expect, it } from "vitest";
import {
  LIVE_CONTENT,
  groupByMission,
  validateMissions,
  type ValidationInput,
} from "@/lib/mission-validation";
import { PLAYABLE_MISSION_IDS } from "@/lib/availability";
import type { Mission } from "@/lib/missions";

/* --------------------------- Fixture builders --------------------------- */

/**
 * A minimal, valid one-mission catalogue. Every invalid case below is this,
 * with exactly one thing broken — so a failing assertion names the rule.
 */
function fixture(): ValidationInput {
  const mission: Mission = {
    id: "fixture",
    index: 1,
    chapterId: 1,
    title: "Fixture Incident",
    difficulty: "Easy",
    minutes: 20,
    xp: 80,
    status: "available",
    category: "Async JavaScript",
    tags: ["Node.js"],
    description: "A fixture.",
    objectives: ["Do the thing"],
    rewardSkill: "Event Loop +1",
    rewardSkillId: "event-loop",
  };

  return {
    missions: [mission],
    answers: {
      fixture: {
        rootCauseId: "right",
        evidenceIds: ["key", "noise"],
        fixId: "good",
      },
    },
    investigations: {
      fixture: {
        missionId: "fixture",
        objective: "Find the cause.",
        requiredKeyClues: 1,
        tools: ["logs", "metrics", "code", "database"],
        toolCopy: {},
        summary: { headline: { label: "Lag", value: "1s" }, findings: ["…"] },
        evidence: [
          {
            id: "key",
            source: "metrics",
            title: "Key",
            description: "…",
            isKeyEvidence: true,
          },
          {
            id: "noise",
            source: "logs",
            title: "Noise",
            description: "…",
            isKeyEvidence: false,
          },
        ],
        logs: {
          service: "svc",
          window: "15m",
          lines: [
            { id: "l1", time: "10:00", level: "INFO", message: "…", evidenceId: "noise" },
          ],
        },
        metrics: {
          cards: [
            {
              id: "m1",
              label: "Lag",
              value: "1s",
              detail: "…",
              tone: "critical",
              evidenceId: "key",
            },
          ],
          latency: {
            caption: "…",
            unit: "ms",
            series: [1, 2, 3],
            deployAt: 1,
            deployLabel: "Deploy",
          },
        },
        code: { file: "a.ts", language: "TypeScript", lines: [{ n: 1, text: "…" }] },
        database: { caption: "…", stats: [{ id: "d1", label: "Query", value: "1ms" }] },
      },
    },
    diagnoses: {
      fixture: {
        missionId: "fixture",
        prompt: "What is the root cause?",
        minimumEvidenceRequired: 2,
        rootCauses: [
          { id: "right", title: "Right", description: "…", icon: "cpu" },
          { id: "wrong", title: "Wrong", description: "…", icon: "database" },
        ],
        evidence: [
          { id: "key", source: "metrics", title: "Key", description: "…" },
          { id: "noise", source: "logs", title: "Noise", description: "…" },
        ],
        hint: "…",
      },
    },
    fixes: {
      fixture: {
        missionId: "fixture",
        confirmedRootCause: "…",
        prompt: "Choose the best fix",
        options: [
          {
            id: "good",
            title: "Good",
            description: "…",
            icon: "worker",
            explanation: ["…"],
            codeExample: "…",
          },
          {
            id: "bad",
            title: "Bad",
            description: "…",
            icon: "pool",
            explanation: ["…"],
            codeExample: "…",
          },
        ],
        hint: "…",
      },
    },
    verifications: {
      fixture: {
        missionId: "fixture",
        metrics: [
          {
            id: "lag",
            label: "Lag",
            before: "1s",
            after: "10ms",
            status: "pass",
            delta: "↓ 99%",
            deltaTone: "good",
            icon: "activity",
            accent: "violet",
          },
        ],
        chart: {
          caption: "…",
          yMax: 2,
          unit: "s",
          xLabels: ["a", "b"],
          fixLabel: "Fix Applied",
          fixFraction: 0.5,
          before: [1, 1],
          after: [1, 0.1],
        },
        requestBreakdown: [{ label: "Work", durationMs: 10 }],
        breakdownTotalMs: 10,
        logs: ["ok"],
        checks: [
          { id: "lag", label: "Lag is normal", passed: true },
          { id: "db", label: "Database is healthy", passed: true, dependsOnFix: false },
        ],
        summary: { headline: "Verified.", detail: "…" },
        unresolvedSummary: { headline: "Still broken.", detail: "…" },
        unresolvedLogs: ["still slow"],
        unresolvedBreakdown: [{ label: "Work", durationMs: 1000 }],
        unresolvedBreakdownTotalMs: 1000,
      },
    },
    results: {
      fixture: {
        missionId: "fixture",
        resolved: { summary: "…", missionBlurb: "…", encouragement: "…" },
        unresolved: { summary: "…", missionBlurb: "…", encouragement: "…" },
        fix: { problem: "…", solution: "…", code: "…", note: "…" },
        metrics: [{ id: "lag", label: "Lag", before: "1s", after: "10ms" }],
        lessons: ["…"],
        skillImprovement: { skillId: "event-loop", description: "…" },
      },
    },
  };
}

/** Applies a mutation to a fresh fixture and returns the error messages. */
function errorsAfter(mutate: (input: ValidationInput) => void): string[] {
  const input = fixture();
  mutate(input);
  return validateMissions(input).errors.map((e) => e.message);
}

const matching = (messages: string[], needle: string) =>
  messages.filter((m) => m.includes(needle));

/* ------------------------------ Live content ---------------------------- */

describe("the live mission catalogue", () => {
  const report = validateMissions();

  it("has no validation errors", () => {
    expect(report.errors.map((e) => `${e.missionId}: ${e.message}`)).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it("agrees with availability about which missions are playable", () => {
    expect([...report.playableMissionIds].sort()).toEqual(
      [...PLAYABLE_MISSION_IDS].sort(),
    );
  });

  it("checks every mission in the catalogue", () => {
    expect(report.missionsChecked).toBe(LIVE_CONTENT.missions.length);
  });
});

/* ------------------------------- Fixtures ------------------------------- */

describe("valid fixture content", () => {
  it("passes cleanly", () => {
    const report = validateMissions(fixture());
    expect(report.errors).toEqual([]);
    expect(report.playableMissionIds).toEqual(["fixture"]);
  });
});

describe("catalogue rules", () => {
  it("rejects duplicate mission ids", () => {
    const messages = errorsAfter((i) => i.missions.push({ ...i.missions[0] }));
    expect(matching(messages, "Duplicate mission id").length).toBe(1);
  });

  it("rejects an unknown chapter id", () => {
    const messages = errorsAfter((i) => (i.missions[0].chapterId = 99));
    expect(matching(messages, "Unknown chapter id").length).toBe(1);
  });

  it("rejects non-positive XP and duration", () => {
    expect(matching(errorsAfter((i) => (i.missions[0].xp = 0)), "XP must be")).toHaveLength(1);
    expect(
      matching(errorsAfter((i) => (i.missions[0].minutes = -5)), "duration"),
    ).toHaveLength(1);
  });

  it("rejects an objective carrying player state", () => {
    // Objectives were `{ text, done }` and six were authored `done: true`,
    // which the mission browser rendered as completed ticks to a player who
    // had never opened the mission. §4.10 forbids exactly that, and this is
    // the rule that stops the shape returning.
    const messages = errorsAfter((i) => {
      (i.missions[0].objectives as unknown[])[0] = {
        text: "Do the thing",
        done: true,
      };
    });
    expect(matching(messages, "authored progress").length).toBe(1);
  });

  it("rejects an empty objective", () => {
    const messages = errorsAfter((i) => (i.missions[0].objectives = ["  "]));
    expect(matching(messages, "non-empty strings").length).toBe(1);
  });

  it("rejects a reward skill that is not in the taxonomy", () => {
    const messages = errorsAfter((i) => (i.missions[0].rewardSkillId = "not-a-skill"));
    expect(matching(messages, "not a canonical skill id").length).toBe(1);
  });

  it("rejects a Node.js mission using a future-only category", () => {
    const messages = errorsAfter((i) => (i.missions[0].category = "Databases"));
    expect(matching(messages, "future-only category").length).toBe(1);
  });

  it("rejects a Node.js mission marked coming-soon", () => {
    const messages = errorsAfter((i) => (i.missions[0].status = "coming-soon"));
    expect(matching(messages, "coming-soon").length).toBeGreaterThan(0);
  });

  it("rejects a fully authored mission whose status hides it", () => {
    const messages = errorsAfter((i) => (i.missions[0].status = "in-development"));
    expect(matching(messages, "Every stage is authored").length).toBe(1);
  });

  it("rejects stage content registered for an unknown mission", () => {
    const messages = errorsAfter((i) => {
      i.fixes["ghost-mission"] = i.fixes.fixture;
    });
    expect(matching(messages, 'unknown mission "ghost-mission"').length).toBe(1);
  });
});

describe("investigation rules", () => {
  it("rejects duplicate evidence ids", () => {
    const messages = errorsAfter((i) =>
      i.investigations.fixture.evidence.push({
        ...i.investigations.fixture.evidence[0],
      }),
    );
    expect(matching(messages, "Duplicate evidence id").length).toBe(1);
  });

  it("rejects a panel referencing evidence that does not exist", () => {
    const messages = errorsAfter(
      (i) => (i.investigations.fixture.logs.lines[0].evidenceId = "ghost"),
    );
    expect(matching(messages, 'unknown evidence "ghost"').length).toBe(1);
  });

  it("rejects requiredKeyClues of zero", () => {
    const messages = errorsAfter(
      (i) => (i.investigations.fixture.requiredKeyClues = 0),
    );
    expect(matching(messages, "requiredKeyClues must be").length).toBe(1);
  });

  it("rejects requiring more key clues than exist", () => {
    const messages = errorsAfter(
      (i) => (i.investigations.fixture.requiredKeyClues = 5),
    );
    expect(matching(messages, "exceeds the 1 key evidence").length).toBe(1);
  });

  it("rejects an enabled tool with no content behind it", () => {
    const messages = errorsAfter((i) => (i.investigations.fixture.code.lines = []));
    expect(matching(messages, 'Tool "code" is enabled').length).toBe(1);
  });

  it("rejects enabling the trace tool without trace content", () => {
    const messages = errorsAfter((i) =>
      i.investigations.fixture.tools.push("trace"),
    );
    expect(matching(messages, "trace tool is enabled").length).toBe(1);
  });

  it("rejects an empty latency series", () => {
    const messages = errorsAfter(
      (i) => (i.investigations.fixture.metrics.latency.series = []),
    );
    expect(matching(messages, "no data points").length).toBe(1);
  });
});

describe("diagnosis rules", () => {
  it("rejects duplicate root-cause ids", () => {
    const messages = errorsAfter((i) =>
      i.diagnoses.fixture.rootCauses.push({ ...i.diagnoses.fixture.rootCauses[0] }),
    );
    expect(matching(messages, "Duplicate root-cause option id").length).toBe(1);
  });

  it("rejects an answer root cause that is not offered", () => {
    const messages = errorsAfter(
      (i) => (i.answers.fixture.rootCauseId = "ghost"),
    );
    expect(matching(messages, "not one of the offered root causes").length).toBe(1);
  });

  it("rejects an answer evidence id that does not exist", () => {
    const messages = errorsAfter((i) =>
      i.answers.fixture.evidenceIds.push("ghost"),
    );
    expect(matching(messages, "unknown evidence").length).toBeGreaterThan(0);
  });

  it("rejects a minimum the supporting evidence cannot satisfy", () => {
    const messages = errorsAfter(
      (i) => (i.answers.fixture.evidenceIds = ["key"]),
    );
    expect(matching(messages, "supporting findings are authored").length).toBe(1);
  });

  it("rejects a non-positive evidence minimum", () => {
    const messages = errorsAfter(
      (i) => (i.diagnoses.fixture.minimumEvidenceRequired = 0),
    );
    expect(matching(messages, "minimumEvidenceRequired must be").length).toBe(1);
  });
});

describe("fix rules", () => {
  it("rejects duplicate fix option ids", () => {
    const messages = errorsAfter((i) =>
      i.fixes.fixture.options.push({ ...i.fixes.fixture.options[0] }),
    );
    expect(matching(messages, "Duplicate fix option id").length).toBe(1);
  });

  it("rejects an answer fix that is not offered", () => {
    const messages = errorsAfter((i) => (i.answers.fixture.fixId = "ghost"));
    expect(matching(messages, "not one of the offered fixes").length).toBe(1);
  });

  it("rejects a fix stage with nothing to choose between", () => {
    const messages = errorsAfter((i) => {
      i.fixes.fixture.options = [i.fixes.fixture.options[0]];
    });
    expect(matching(messages, "at least two options").length).toBe(1);
  });

  it("rejects a playable mission with no authored answers", () => {
    const messages = errorsAfter((i) => {
      delete (i.answers as Record<string, unknown>).fixture;
    });
    // Once from the diagnosis rules, once from the fix rules.
    expect(matching(messages, "can be played but not graded").length).toBe(2);
  });

  it("rejects empty explanation or code-example content", () => {
    expect(
      matching(
        errorsAfter((i) => (i.fixes.fixture.options[0].explanation = [])),
        "empty explanation",
      ),
    ).toHaveLength(1);
    expect(
      matching(
        errorsAfter((i) => (i.fixes.fixture.options[0].codeExample = "")),
        "no code example",
      ),
    ).toHaveLength(1);
  });
});

describe("verification rules", () => {
  it("rejects duplicate check ids", () => {
    const messages = errorsAfter((i) =>
      i.verifications.fixture.checks.push({ ...i.verifications.fixture.checks[0] }),
    );
    expect(matching(messages, "Duplicate verification check id").length).toBe(1);
  });

  it("rejects a verification where no check depends on the fix", () => {
    const messages = errorsAfter((i) => {
      i.verifications.fixture.checks = i.verifications.fixture.checks.map((c) => ({
        ...c,
        dependsOnFix: false,
      }));
    });
    expect(matching(messages, "depends on the applied fix").length).toBe(1);
  });

  it("rejects a missing before or after metric value", () => {
    const messages = errorsAfter((i) => (i.verifications.fixture.metrics[0].after = ""));
    expect(matching(messages, "missing a before or after").length).toBe(1);
  });

  it("rejects mismatched chart series lengths", () => {
    const messages = errorsAfter((i) => i.verifications.fixture.chart.after.push(0.5));
    expect(matching(messages, "series lengths differ").length).toBe(1);
  });

  it("rejects a negative request-breakdown duration", () => {
    const messages = errorsAfter(
      (i) => (i.verifications.fixture.requestBreakdown[0].durationMs = -1),
    );
    expect(matching(messages, "negative or non-finite duration").length).toBe(1);
  });

  it("rejects missing unresolved logs", () => {
    const messages = errorsAfter((i) => (i.verifications.fixture.unresolvedLogs = []));
    expect(matching(messages, "unresolved verification logs").length).toBe(1);
  });
});

describe("results rules", () => {
  it("rejects a results config whose missionId disagrees with the catalogue", () => {
    const messages = errorsAfter((i) => (i.results.fixture.missionId = "other"));
    expect(matching(messages, "declares missionId").length).toBe(1);
  });

  it("rejects a skill improvement that is not a canonical skill", () => {
    const messages = errorsAfter(
      (i) => (i.results.fixture.skillImprovement.skillId = "not-a-skill"),
    );
    expect(matching(messages, "not a canonical skill id").length).toBe(1);
  });

  it("rejects empty lessons", () => {
    expect(
      matching(errorsAfter((i) => (i.results.fixture.lessons = [])), "No lessons"),
    ).toHaveLength(1);
    expect(
      matching(errorsAfter((i) => (i.results.fixture.lessons = ["  "])), "A lesson is empty"),
    ).toHaveLength(1);
  });

  it("rejects an incomplete unresolved narrative", () => {
    const messages = errorsAfter((i) => (i.results.fixture.unresolved.summary = ""));
    expect(matching(messages, "unresolved result narrative").length).toBe(1);
  });

  it("rejects a nextMissionId pointing at nothing", () => {
    const messages = errorsAfter((i) => (i.results.fixture.nextMissionId = "ghost"));
    expect(matching(messages, "not a known mission").length).toBe(1);
  });

  it("rejects obsolete hardcoded run fields", () => {
    for (const field of ["score", "xpEarned", "duration", "steps"]) {
      const messages = errorsAfter((i) => {
        (i.results.fixture as unknown as Record<string, unknown>)[field] = 100;
      });
      expect(matching(messages, `obsolete field "${field}"`).length).toBe(1);
    }
  });
});

describe("partially authored missions", () => {
  it("warn rather than error, and are not counted as playable", () => {
    const input = fixture();
    delete input.results.fixture;
    const report = validateMissions(input);
    expect(report.errors).toEqual([]);
    expect(report.playableMissionIds).toEqual([]);
    expect(
      report.warnings.some((w) => w.message.includes("missing results")),
    ).toBe(true);
  });

  it("are skipped entirely when no stage is authored", () => {
    const input = fixture();
    input.investigations = {};
    input.diagnoses = {};
    input.fixes = {};
    input.verifications = {};
    input.results = {};
    const report = validateMissions(input);
    expect(report.issues).toEqual([]);
    expect(report.ok).toBe(true);
  });
});

describe("groupByMission", () => {
  it("puts catalogue-wide findings first", () => {
    const groups = groupByMission([
      { missionId: "fixture", stage: "fix", severity: "error", message: "b" },
      { missionId: "catalogue", stage: "catalogue", severity: "error", message: "a" },
    ]);
    expect(groups[0].missionId).toBe("catalogue");
  });
});
