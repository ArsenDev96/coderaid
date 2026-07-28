/**
 * Mission content validation.
 *
 * Mission content is hand-authored TypeScript spread across six modules —
 * the catalogue plus five stage registries — and the type system only checks
 * the shapes. It has nothing to say about whether `correctRootCauseId` names a
 * root cause that exists, whether a mission requires more key clues than it
 * authors, or whether a fix option's skill reference is a real skill.
 *
 * Those are the mistakes that actually happen while writing a mission, and each
 * one produces a mission that compiles, renders, and then grades nonsense. This
 * module reads the live registries and reports them.
 *
 * It is deliberately pure: `validateMissions()` returns findings, and the CLI in
 * `scripts/validate-missions.ts` decides how to print and exit.
 */

import {
  CHAPTERS,
  DIFFICULTIES,
  MISSIONS,
  chapterTrack,
  type Category,
  type Difficulty,
  type Mission,
} from "./missions";
import { diagnosisConfigs } from "./diagnosis";
import { fixConfigs, type MissionFixConfig } from "./fix";
import {
  investigationConfigs,
  type Investigation,
  type InvestigationToolId,
} from "./investigation";
import { resultsConfigs, type MissionResultConfig } from "./results";
import { verificationConfigs, type MissionVerificationConfig } from "./verification";
import type { MissionDiagnosisConfig } from "./diagnosis";
import type { MissionAnswers } from "./grading";
import { MISSION_ANSWERS } from "./server/answers";
import { SKILL_DEFS } from "./skills";

/* -------------------------------- Types --------------------------------- */

export type IssueSeverity = "error" | "warning";

export type ValidationIssue = {
  /** Mission the finding belongs to, or `"catalogue"` for global ones. */
  missionId: string;
  /** Which part of the content the finding came from. */
  stage:
    | "catalogue"
    | "investigation"
    | "diagnosis"
    | "fix"
    | "verification"
    | "results";
  severity: IssueSeverity;
  message: string;
};

export type ValidationReport = {
  issues: ValidationIssue[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  ok: boolean;
  /** Missions with all five stage configs authored. */
  playableMissionIds: string[];
  missionsChecked: number;
};

/** The content registries, injectable so tests can validate fixture data. */
export type ValidationInput = {
  missions: Mission[];
  investigations: Record<string, Investigation>;
  diagnoses: Record<string, MissionDiagnosisConfig>;
  fixes: Record<string, MissionFixConfig>;
  verifications: Record<string, MissionVerificationConfig>;
  results: Record<string, MissionResultConfig>;
  /** The mission answers, which live server-side (`lib/server/answers.ts`). */
  answers: Record<string, MissionAnswers>;
};

export const LIVE_CONTENT: ValidationInput = {
  missions: MISSIONS,
  investigations: investigationConfigs,
  diagnoses: diagnosisConfigs,
  fixes: fixConfigs,
  verifications: verificationConfigs,
  results: resultsConfigs,
  answers: MISSION_ANSWERS,
};

/* ------------------------------- Helpers -------------------------------- */

const SKILL_IDS = new Set(SKILL_DEFS.map((s) => s.id));
const CHAPTER_IDS = new Set(CHAPTERS.map((c) => c.id));
const DIFFICULTY_SET = new Set<Difficulty>(DIFFICULTIES);

/** Categories only future-track missions are allowed to use. */
const FUTURE_ONLY_CATEGORIES: Category[] = ["Databases", "Distributed Systems"];

/** Authored states a future-track mission may carry. */
const FUTURE_STATUSES = new Set(["coming-soon", "locked"]);

function duplicates(ids: string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) dupes.add(id);
    seen.add(id);
  }
  return [...dupes];
}

function isPositiveInt(n: unknown): boolean {
  return typeof n === "number" && Number.isInteger(n) && n > 0;
}

const blank = (s: unknown) => typeof s !== "string" || s.trim().length === 0;

/** Collects findings for one mission, in authoring order. */
class Collector {
  readonly issues: ValidationIssue[] = [];

  constructor(private readonly missionId: string) {}

  error(stage: ValidationIssue["stage"], message: string): void {
    this.issues.push({ missionId: this.missionId, stage, severity: "error", message });
  }

  warn(stage: ValidationIssue["stage"], message: string): void {
    this.issues.push({ missionId: this.missionId, stage, severity: "warning", message });
  }

  /** `error` when `condition` is false. */
  check(stage: ValidationIssue["stage"], condition: boolean, message: string): void {
    if (!condition) this.error(stage, message);
  }
}

/* ---------------------------- Catalogue rules --------------------------- */

function validateCatalogue(missions: Mission[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const id of duplicates(missions.map((m) => m.id))) {
    issues.push({
      missionId: "catalogue",
      stage: "catalogue",
      severity: "error",
      message: `Duplicate mission id "${id}".`,
    });
  }
  for (const index of duplicates(missions.map((m) => String(m.index)))) {
    issues.push({
      missionId: "catalogue",
      stage: "catalogue",
      severity: "warning",
      message: `Duplicate mission index ${index} — ordering and "next mission" become ambiguous.`,
    });
  }

  const missionIds = new Set(missions.map((m) => m.id));

  // Skill definitions point back at missions; a stale id there silently stops
  // a skill from ever being credited. Only meaningful against the real
  // catalogue — a fixture catalogue naturally doesn't contain the live
  // missions the taxonomy refers to.
  if (missions === MISSIONS) {
    for (const skill of SKILL_DEFS) {
      for (const id of skill.missionIds) {
        if (!missionIds.has(id)) {
          issues.push({
            missionId: "catalogue",
            stage: "catalogue",
            severity: "error",
            message: `Skill "${skill.id}" references unknown mission "${id}".`,
          });
        }
      }
    }
  }

  for (const mission of missions) {
    const c = new Collector(mission.id);
    const track = chapterTrack(mission.chapterId);

    c.check(
      "catalogue",
      CHAPTER_IDS.has(mission.chapterId),
      `Unknown chapter id ${mission.chapterId}.`,
    );
    c.check("catalogue", isPositiveInt(mission.xp), `XP must be a positive integer (got ${mission.xp}).`);
    c.check(
      "catalogue",
      isPositiveInt(mission.minutes),
      `Estimated duration must be a positive integer number of minutes (got ${mission.minutes}).`,
    );
    c.check(
      "catalogue",
      DIFFICULTY_SET.has(mission.difficulty),
      `Unknown difficulty "${mission.difficulty}".`,
    );
    c.check("catalogue", !blank(mission.title), "Mission title is empty.");
    c.check("catalogue", !blank(mission.description), "Mission description is empty.");
    c.check(
      "catalogue",
      mission.objectives.length > 0,
      "Mission has no objectives.",
    );

    // Objectives describe the mission; whether one is *done* describes a
    // player, and nothing about a player may be authored (§4.10). Eighty of
    // these carried a `done` flag and six said `true`, which the mission
    // browser rendered as completed checkmarks for someone who had never
    // played. The type no longer allows it — this catches a literal that slips
    // past `as`-casts or a hand-edited catalogue.
    for (const [i, objective] of mission.objectives.entries()) {
      const record = objective as unknown as Record<string, unknown>;
      c.check(
        "catalogue",
        !("done" in record),
        `Objective ${i + 1} carries a "done" flag — objective completion is a fact about a player, not authored content.`,
      );
      c.check("catalogue", !blank(objective.text), `Objective ${i + 1} has empty text.`);
    }
    c.check(
      "catalogue",
      !blank(mission.rewardSkill),
      "Mission has no reward-skill label.",
    );

    if (mission.rewardSkillId !== undefined) {
      c.check(
        "catalogue",
        SKILL_IDS.has(mission.rewardSkillId),
        `rewardSkillId "${mission.rewardSkillId}" is not a canonical skill id.`,
      );
    }

    if (track === "future") {
      c.check(
        "catalogue",
        FUTURE_STATUSES.has(mission.status),
        `Future-track mission has status "${mission.status}" — expected "coming-soon" or "locked".`,
      );
      // Future missions have no skill taxonomy yet; a reward id would credit
      // XP for a track that isn't playable.
      if (mission.rewardSkillId) {
        c.warn(
          "catalogue",
          `Future-track mission carries rewardSkillId "${mission.rewardSkillId}".`,
        );
      }
    } else {
      c.check(
        "catalogue",
        !FUTURE_ONLY_CATEGORIES.includes(mission.category),
        `Node.js mission uses future-only category "${mission.category}".`,
      );
      c.check(
        "catalogue",
        mission.status !== "coming-soon",
        'Node.js mission is marked "coming-soon" — use "in-development" instead.',
      );
      c.check(
        "catalogue",
        Boolean(mission.rewardSkillId),
        "Node.js mission has no rewardSkillId, so its skill reward can never be credited.",
      );
    }

    issues.push(...c.issues);
  }

  return issues;
}

/* --------------------------- Investigation rules ------------------------ */

/**
 * The only fields an `EvidenceItem` may carry.
 *
 * `isKeyEvidence` is on the list because the clue gate counts it, but nothing
 * else may join it: a field like `isCorrect`, `recommended` or `distractor`
 * would put the answer in a module the browser downloads, and — worse — invite
 * a panel to render it. The correctness of a finding lives in
 * `lib/server/answers.ts` and nowhere else.
 */
const PUBLIC_EVIDENCE_FIELDS = new Set([
  "id",
  "source",
  "title",
  "description",
  "isKeyEvidence",
]);

/** Field names that would be a correctness label under any spelling. */
const CORRECTNESS_FIELD_PATTERN =
  /correct|answer|recommend|distract|decoy|wrong|red.?herring|supports?RootCause/i;

function validateInvestigation(c: Collector, inv: Investigation): void {
  const stage = "investigation" as const;
  const ids = inv.evidence.map((e) => e.id);

  for (const id of duplicates(ids)) {
    c.error(stage, `Duplicate evidence id "${id}".`);
  }
  const known = new Set(ids);

  const keys = inv.evidence.filter((e) => e.isKeyEvidence);
  c.check(stage, keys.length > 0, "No key evidence authored.");
  c.check(
    stage,
    inv.requiredKeyClues > 0,
    `requiredKeyClues must be greater than zero (got ${inv.requiredKeyClues}).`,
  );
  c.check(
    stage,
    inv.requiredKeyClues <= keys.length,
    `requiredKeyClues (${inv.requiredKeyClues}) exceeds the ${keys.length} key evidence items authored.`,
  );

  for (const item of inv.evidence) {
    if (blank(item.title)) c.error(stage, `Evidence "${item.id}" has no title.`);
    if (blank(item.description)) {
      c.error(stage, `Evidence "${item.id}" has no description.`);
    }
    if (!inv.tools.includes(item.source)) {
      c.warn(
        stage,
        `Evidence "${item.id}" is sourced from the "${item.source}" tool, which this mission does not enable.`,
      );
    }
  }

  /* Every evidence reference embedded in a tool panel must resolve. */
  const ref = (label: string, evidenceId?: string) => {
    if (evidenceId && !known.has(evidenceId)) {
      c.error(stage, `${label} references unknown evidence "${evidenceId}".`);
    }
  };

  inv.logs.lines.forEach((l) => ref(`Log line "${l.id}"`, l.evidenceId));
  inv.metrics.cards.forEach((m) => ref(`Metric card "${m.id}"`, m.evidenceId));
  inv.code.lines.forEach((l) => ref(`Code line ${l.n}`, l.evidenceId));
  inv.database.stats.forEach((s) => ref(`Database stat "${s.id}"`, s.evidenceId));
  inv.trace?.spans.forEach((s) => ref(`Trace span "${s.id}"`, s.evidenceId));

  /* Enabled tools must actually have content behind them. */
  const populated: Record<InvestigationToolId, boolean> = {
    logs: inv.logs.lines.length > 0,
    metrics: inv.metrics.cards.length > 0,
    code: inv.code.lines.length > 0,
    database: inv.database.stats.length > 0,
    trace: Boolean(inv.trace && inv.trace.spans.length > 0),
  };
  c.check(stage, inv.tools.length > 0, "No investigation tools enabled.");
  for (const tool of inv.tools) {
    c.check(stage, populated[tool], `Tool "${tool}" is enabled but has no content.`);
  }
  for (const id of duplicates(inv.tools)) {
    c.error(stage, `Tool "${id}" is listed twice.`);
  }

  /* Charts and traces. */
  const series = inv.metrics.latency.series;
  c.check(stage, series.length > 0, "Latency chart has no data points.");
  c.check(
    stage,
    series.every((n) => Number.isFinite(n) && n >= 0),
    "Latency chart contains a negative or non-finite value.",
  );
  c.check(
    stage,
    inv.metrics.latency.deployAt >= 0 &&
      inv.metrics.latency.deployAt < Math.max(1, series.length),
    `Deploy marker index ${inv.metrics.latency.deployAt} falls outside the ${series.length}-point series.`,
  );

  if (inv.trace) {
    c.check(stage, inv.trace.root.ms > 0, "Trace root span has no duration.");
    c.check(
      stage,
      inv.trace.spans.every((s) => s.ms >= 0),
      "Trace contains a negative span duration.",
    );
  }
  c.check(
    stage,
    inv.tools.includes("trace") === Boolean(inv.trace),
    inv.trace
      ? "Trace content is authored but the trace tool is not enabled."
      : "The trace tool is enabled but no trace content is authored.",
  );

  if (blank(inv.objective)) c.error(stage, "Investigation objective is empty.");
  if (inv.summary.findings.length === 0) {
    c.warn(stage, "Investigation summary has no findings.");
  }

  validateSelectabilityLeak(c, inv, populated);
}

/**
 * **The rule that stops the UI from answering the question.**
 *
 * An investigation panel makes a row selectable when — and only when — it
 * carries an `evidenceId`. That is a rendering decision, but it is also a
 * *disclosure*: whatever is selectable is what the mission author thought was
 * worth noticing. When only the key findings carried an id, the workspace told
 * the player which rows mattered before they had read a single one of them, and
 * collecting evidence degenerated into clicking whatever had a plus button.
 *
 * So the invariant is not "everything is selectable" — a blank line and a
 * closing brace are not findings, and making them selectable would be noise
 * rather than fairness. It is that **selectability must not correlate with
 * correctness**: the selectable set has to contain enough plausible-but-wrong,
 * healthy-subsystem and eliminating observations that being selectable tells
 * the player nothing.
 *
 * These checks bound that from below. They cannot prove an author included
 * every reasonable finding, but they do fail the shape the bug actually had.
 */
function validateSelectabilityLeak(
  c: Collector,
  inv: Investigation,
  populated: Record<InvestigationToolId, boolean>,
): void {
  const stage = "investigation" as const;

  /* No public evidence field may carry a correctness label. */
  for (const item of inv.evidence) {
    for (const field of Object.keys(item as unknown as Record<string, unknown>)) {
      if (!PUBLIC_EVIDENCE_FIELDS.has(field)) {
        c.error(
          stage,
          `Evidence "${item.id}" carries the unknown public field "${field}". Investigation content ships to the browser — anything describing whether a finding is correct belongs in lib/server/answers.ts.`,
        );
      }
      if (CORRECTNESS_FIELD_PATTERN.test(field)) {
        c.error(
          stage,
          `Evidence "${item.id}" carries "${field}", which reads as a correctness label on client-visible content.`,
        );
      }
    }
  }

  /* What each enabled tool actually makes selectable. */
  const selectableByTool: Record<InvestigationToolId, string[]> = {
    logs: inv.logs.lines.flatMap((l) => (l.evidenceId ? [l.evidenceId] : [])),
    metrics: inv.metrics.cards.flatMap((m) => (m.evidenceId ? [m.evidenceId] : [])),
    code: inv.code.lines.flatMap((l) => (l.evidenceId ? [l.evidenceId] : [])),
    database: inv.database.stats.flatMap((s) => (s.evidenceId ? [s.evidenceId] : [])),
    trace: inv.trace?.spans.flatMap((s) => (s.evidenceId ? [s.evidenceId] : [])) ?? [],
  };

  // Only enabled tools render, so only they can leak anything.
  const selectable = new Set(
    inv.tools.flatMap((tool) => selectableByTool[tool]),
  );
  const keyIds = new Set(
    inv.evidence.filter((e) => e.isKeyEvidence).map((e) => e.id),
  );
  const selectableNonKey = [...selectable].filter((id) => !keyIds.has(id));

  c.check(
    stage,
    selectableNonKey.length >= 2,
    `Only ${selectableNonKey.length} selectable finding(s) are not key evidence. A player can then read the answer off which rows have a plus button — author at least two negative, distracting or otherwise non-decisive observations that are selectable too.`,
  );

  // Stated separately from the count because it is the property that matters:
  // the two sets coinciding is exactly the bug, whatever their size.
  const selectableKey = [...selectable].filter((id) => keyIds.has(id));
  c.check(
    stage,
    !(
      selectable.size > 0 &&
      selectableKey.length === selectable.size &&
      keyIds.size > 0
    ),
    "Every selectable finding is key evidence, so selectability is a complete answer key.",
  );

  /* A tool that renders content but offers nothing to collect. Warned rather
     than failed: a panel can legitimately be all context — a query callout, a
     caption, a chart — and forcing an evidence id onto it would be worse. */
  for (const tool of inv.tools) {
    if (populated[tool] && selectableByTool[tool].length === 0) {
      c.warn(
        stage,
        `Tool "${tool}" renders content but has nothing selectable. If any of it is a finding a reasonable engineer would note, give it an evidence id.`,
      );
    }
  }
}

/* ----------------------------- Diagnosis rules -------------------------- */

function validateDiagnosis(
  c: Collector,
  d: MissionDiagnosisConfig,
  answers: MissionAnswers | undefined,
): void {
  const stage = "diagnosis" as const;

  for (const id of duplicates(d.rootCauses.map((r) => r.id))) {
    c.error(stage, `Duplicate root-cause option id "${id}".`);
  }
  for (const id of duplicates(d.evidence.map((e) => e.id))) {
    c.error(stage, `Duplicate diagnosis evidence id "${id}".`);
  }

  // The answers live in `lib/server/answers.ts` now, so this is where the two
  // halves are checked against each other: with the answer no longer sitting
  // beside the options it names, a renamed option would otherwise silently
  // make a mission ungradeable.
  const correctEvidenceIds = answers?.evidenceIds ?? [];
  c.check(
    stage,
    Boolean(answers),
    "No answers are authored for this mission — it can be played but not graded.",
  );

  if (answers) {
    c.check(
      stage,
      d.rootCauses.some((r) => r.id === answers.rootCauseId),
      `answers.rootCauseId "${answers.rootCauseId}" is not one of the offered root causes.`,
    );

    const evidenceIds = new Set(d.evidence.map((e) => e.id));
    for (const id of correctEvidenceIds) {
      c.check(
        stage,
        evidenceIds.has(id),
        `answers.evidenceIds references unknown evidence "${id}".`,
      );
    }
    for (const id of duplicates(correctEvidenceIds)) {
      c.error(stage, `answers.evidenceIds lists "${id}" twice.`);
    }
  }

  c.check(stage, d.rootCauses.length >= 2, "A diagnosis needs at least two root-cause options.");

  c.check(
    stage,
    d.minimumEvidenceRequired > 0,
    `minimumEvidenceRequired must be greater than zero (got ${d.minimumEvidenceRequired}).`,
  );
  c.check(
    stage,
    d.minimumEvidenceRequired <= d.evidence.length,
    `minimumEvidenceRequired (${d.minimumEvidenceRequired}) exceeds the ${d.evidence.length} evidence options offered.`,
  );
  // Otherwise the gate can only be satisfied by citing evidence that doesn't
  // support the cause, and a perfect score becomes unreachable.
  c.check(
    stage,
    correctEvidenceIds.length >= d.minimumEvidenceRequired,
    `Only ${correctEvidenceIds.length} supporting findings are authored, but ${d.minimumEvidenceRequired} selections are required.`,
  );

  if (blank(d.hint)) c.error(stage, "Diagnosis hint is empty.");
  if (blank(d.prompt)) c.error(stage, "Diagnosis prompt is empty.");
}

/* -------------------------------- Fix rules ----------------------------- */

function validateFix(
  c: Collector,
  f: MissionFixConfig,
  answers: MissionAnswers | undefined,
): void {
  const stage = "fix" as const;

  for (const id of duplicates(f.options.map((o) => o.id))) {
    c.error(stage, `Duplicate fix option id "${id}".`);
  }

  // The resolving fix is now named once, server-side, instead of being both
  // flagged per option and named again by `correctFixId`. There is nothing left
  // for the two to disagree about — what remains is checking that the answer
  // still points at an option that exists.
  c.check(
    stage,
    Boolean(answers),
    "No answers are authored for this mission — it can be played but not graded.",
  );
  if (answers) {
    c.check(
      stage,
      f.options.some((o) => o.id === answers.fixId),
      `answers.fixId "${answers.fixId}" is not one of the offered fixes.`,
    );
  }
  // A single-option fix stage isn't a choice, so nothing can be got wrong.
  c.check(stage, f.options.length >= 2, "A fix stage needs at least two options.");

  for (const option of f.options) {
    if (blank(option.title)) c.error(stage, `Fix "${option.id}" has no title.`);
    if (blank(option.description)) {
      c.error(stage, `Fix "${option.id}" has no description.`);
    }
    if (option.explanation.length === 0 || option.explanation.some(blank)) {
      c.error(stage, `Fix "${option.id}" has empty explanation content.`);
    }
    if (blank(option.codeExample)) {
      c.error(stage, `Fix "${option.id}" has no code example.`);
    }
  }

  if (blank(f.confirmedRootCause)) {
    c.error(stage, "Fix stage restates no confirmed root cause.");
  }
  if (blank(f.hint)) c.error(stage, "Fix hint is empty.");
}

/* --------------------------- Verification rules ------------------------- */

function validateVerification(c: Collector, v: MissionVerificationConfig): void {
  const stage = "verification" as const;

  for (const id of duplicates(v.metrics.map((m) => m.id))) {
    c.error(stage, `Duplicate verification metric id "${id}".`);
  }
  for (const id of duplicates(v.checks.map((k) => k.id))) {
    c.error(stage, `Duplicate verification check id "${id}".`);
  }

  c.check(stage, v.metrics.length > 0, "No verification metrics authored.");
  for (const m of v.metrics) {
    if (blank(m.before) || blank(m.after)) {
      c.error(stage, `Metric "${m.id}" is missing a before or after value.`);
    }
    if (blank(m.label)) c.error(stage, `Metric "${m.id}" has no label.`);
    if (blank(m.delta)) c.error(stage, `Metric "${m.id}" has no change summary.`);
  }

  c.check(stage, v.checks.length > 0, "No verification checks authored.");
  // Without one, an unresolved run would pass every check and the verification
  // would be a formality.
  c.check(
    stage,
    v.checks.some((k) => k.dependsOnFix !== false),
    "No verification check depends on the applied fix.",
  );
  for (const k of v.checks) {
    if (blank(k.label)) c.error(stage, `Check "${k.id}" has no label.`);
  }

  c.check(stage, v.logs.length > 0, "No successful verification logs authored.");
  c.check(
    stage,
    v.unresolvedLogs.length > 0,
    "No unresolved verification logs authored — a failed run would show the success logs.",
  );
  if (blank(v.summary.headline) || blank(v.summary.detail)) {
    c.error(stage, "Successful verification summary is incomplete.");
  }
  if (blank(v.unresolvedSummary.headline) || blank(v.unresolvedSummary.detail)) {
    c.error(stage, "Unresolved verification summary is incomplete.");
  }

  /* Chart. */
  c.check(
    stage,
    v.chart.before.length > 0 && v.chart.after.length > 0,
    "Verification chart has an empty before or after series.",
  );
  c.check(
    stage,
    v.chart.before.length === v.chart.after.length,
    `Verification chart series lengths differ (${v.chart.before.length} before, ${v.chart.after.length} after).`,
  );
  c.check(
    stage,
    v.chart.yMax > 0,
    `Verification chart yMax must be positive (got ${v.chart.yMax}).`,
  );
  c.check(
    stage,
    v.chart.fixFraction >= 0 && v.chart.fixFraction <= 1,
    `Verification chart fixFraction must be between 0 and 1 (got ${v.chart.fixFraction}).`,
  );
  c.check(
    stage,
    [...v.chart.before, ...v.chart.after].every((n) => Number.isFinite(n) && n >= 0),
    "Verification chart contains a negative or non-finite value.",
  );

  /* Request breakdown. */
  const breakdowns: [string, { label: string; durationMs: number }[], number][] = [
    ["requestBreakdown", v.requestBreakdown, v.breakdownTotalMs],
    ["unresolvedBreakdown", v.unresolvedBreakdown, v.unresolvedBreakdownTotalMs],
  ];
  for (const [name, spans, total] of breakdowns) {
    c.check(stage, spans.length > 0, `${name} has no spans.`);
    c.check(
      stage,
      spans.every((s) => Number.isFinite(s.durationMs) && s.durationMs >= 0),
      `${name} contains a negative or non-finite duration.`,
    );
    c.check(stage, total > 0, `${name} total must be positive (got ${total}).`);
    const sum = spans.reduce((n, s) => n + s.durationMs, 0);
    if (sum > total) {
      c.warn(
        stage,
        `${name} spans sum to ${sum}ms, more than the stated total of ${total}ms.`,
      );
    }
  }
}

/* ------------------------------ Results rules --------------------------- */

function validateResults(
  c: Collector,
  r: MissionResultConfig,
  mission: Mission,
  missionIds: Set<string>,
): void {
  const stage = "results" as const;

  c.check(
    stage,
    r.missionId === mission.id,
    `Results config is registered under "${mission.id}" but declares missionId "${r.missionId}".`,
  );
  c.check(
    stage,
    SKILL_IDS.has(r.skillImprovement.skillId),
    `skillImprovement.skillId "${r.skillImprovement.skillId}" is not a canonical skill id.`,
  );
  if (blank(r.skillImprovement.description)) {
    c.error(stage, "skillImprovement has no description.");
  }

  c.check(stage, r.lessons.length > 0, "No lessons authored.");
  if (r.lessons.some(blank)) c.error(stage, "A lesson is empty.");

  for (const [name, narrative] of [
    ["resolved", r.resolved],
    ["unresolved", r.unresolved],
  ] as const) {
    if (
      blank(narrative.summary) ||
      blank(narrative.missionBlurb) ||
      blank(narrative.encouragement)
    ) {
      c.error(stage, `The ${name} result narrative is incomplete.`);
    }
  }

  if (blank(r.fix.problem) || blank(r.fix.solution) || blank(r.fix.code)) {
    c.error(stage, "The results fix recap is incomplete.");
  }

  c.check(stage, r.metrics.length > 0, "No performance improvement metrics authored.");
  for (const id of duplicates(r.metrics.map((m) => m.id))) {
    c.error(stage, `Duplicate result metric id "${id}".`);
  }
  for (const m of r.metrics) {
    if (blank(m.before) || blank(m.after)) {
      c.error(stage, `Result metric "${m.id}" is missing a before or after value.`);
    }
    if (m.spark) {
      c.check(
        stage,
        m.spark.before.length > 0 && m.spark.after.length > 0,
        `Result metric "${m.id}" has an empty sparkline series.`,
      );
      c.check(
        stage,
        m.spark.yMax > 0,
        `Result metric "${m.id}" has a non-positive sparkline yMax.`,
      );
    }
  }

  if (r.nextMissionId !== undefined) {
    c.check(
      stage,
      missionIds.has(r.nextMissionId),
      `nextMissionId "${r.nextMissionId}" is not a known mission.`,
    );
  }

  // Scores, XP, elapsed time and step counts come from grading and run
  // telemetry. A results config that carries them has re-introduced the
  // hardcoded run the engine replaced.
  const OBSOLETE = ["score", "xpEarned", "xp", "timeTaken", "duration", "steps", "stepsCompleted", "status"];
  const record = r as unknown as Record<string, unknown>;
  for (const field of OBSOLETE) {
    if (field in record) {
      c.error(
        stage,
        `Results config carries obsolete field "${field}" — that value belongs to the run, not the mission.`,
      );
    }
  }
}

/* ------------------------------ Entry point ----------------------------- */

/**
 * Validates the whole catalogue plus every authored stage. Missions with *no*
 * stage content are skipped rather than reported: "in development" is a
 * legitimate state, not an error. Missions with *some* stage content are
 * reported, because a half-authored mission is how a dead-end CTA happens.
 */
export function validateMissions(
  input: ValidationInput = LIVE_CONTENT,
): ValidationReport {
  const issues: ValidationIssue[] = [...validateCatalogue(input.missions)];
  const missionIds = new Set(input.missions.map((m) => m.id));
  const playableMissionIds: string[] = [];

  /* Stage content registered under an id no mission has. */
  const registries: [ValidationIssue["stage"], Record<string, unknown>][] = [
    ["investigation", input.investigations],
    ["diagnosis", input.diagnoses],
    ["fix", input.fixes],
    ["verification", input.verifications],
    ["results", input.results],
  ];
  for (const [stage, registry] of registries) {
    for (const id of Object.keys(registry)) {
      if (!missionIds.has(id)) {
        issues.push({
          missionId: id,
          stage,
          severity: "error",
          message: `${stage} content is registered for unknown mission "${id}".`,
        });
      }
    }
  }

  for (const mission of input.missions) {
    const inv = input.investigations[mission.id];
    const diag = input.diagnoses[mission.id];
    const fix = input.fixes[mission.id];
    const ver = input.verifications[mission.id];
    const res = input.results[mission.id];

    const present = [inv, diag, fix, ver, res].filter(Boolean).length;
    if (present === 0) continue; // Not authored yet — legitimately in development.

    const c = new Collector(mission.id);
    const complete = present === 5;
    if (complete) playableMissionIds.push(mission.id);

    /* Stage completeness — only a full set makes a mission playable. */
    if (!complete) {
      const missing = [
        ["investigation", inv],
        ["diagnosis", diag],
        ["fix", fix],
        ["verification", ver],
        ["results", res],
      ]
        .filter(([, cfg]) => !cfg)
        .map(([name]) => name);
      c.warn(
        "catalogue",
        `Partially authored: missing ${missing.join(", ")}. The mission stays in development until every stage exists.`,
      );
    }

    // A playable mission whose catalogue status still says otherwise means the
    // browser will hide content that is finished.
    if (complete && chapterTrack(mission.chapterId) !== "future") {
      c.check(
        "catalogue",
        mission.status === "available" || mission.status === "locked",
        `Every stage is authored but the catalogue status is "${mission.status}".`,
      );
    }

    if (inv) {
      c.check(
        "investigation",
        inv.missionId === mission.id,
        `Investigation config declares missionId "${inv.missionId}".`,
      );
      validateInvestigation(c, inv);
    }
    if (diag) {
      c.check(
        "diagnosis",
        diag.missionId === mission.id,
        `Diagnosis config declares missionId "${diag.missionId}".`,
      );
      validateDiagnosis(c, diag, input.answers[mission.id]);
    }
    if (fix) {
      c.check(
        "fix",
        fix.missionId === mission.id,
        `Fix config declares missionId "${fix.missionId}".`,
      );
      validateFix(c, fix, input.answers[mission.id]);
    }
    if (ver) {
      c.check(
        "verification",
        ver.missionId === mission.id,
        `Verification config declares missionId "${ver.missionId}".`,
      );
      validateVerification(c, ver);
    }
    if (res) validateResults(c, res, mission, missionIds);

    /* Cross-stage: the diagnosis should cite findings the player can collect. */
    if (inv && diag) {
      const collectable = new Set(inv.evidence.map((e) => e.id));
      for (const option of diag.evidence) {
        if (!collectable.has(option.id)) {
          c.warn(
            "diagnosis",
            `Evidence option "${option.id}" has no matching investigation evidence, so it can't be collected first.`,
          );
        }
      }
    }

    issues.push(...c.issues);
  }

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  return {
    issues,
    errors,
    warnings,
    ok: errors.length === 0,
    playableMissionIds,
    missionsChecked: input.missions.length,
  };
}

/** Findings grouped by mission, in catalogue order, for readable output. */
export function groupByMission(
  issues: ValidationIssue[],
): { missionId: string; issues: ValidationIssue[] }[] {
  const order = ["catalogue", ...MISSIONS.map((m) => m.id)];
  const groups = new Map<string, ValidationIssue[]>();
  for (const issue of issues) {
    const list = groups.get(issue.missionId) ?? [];
    list.push(issue);
    groups.set(issue.missionId, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      return (ai === -1 ? order.length : ai) - (bi === -1 ? order.length : bi);
    })
    .map(([missionId, list]) => ({ missionId, issues: list }));
}
