/**
 * The player's real progression ledger.
 *
 * This module is the single source of truth for everything the player has
 * actually earned: XP, level, rank, per-skill XP, completed missions and the
 * activity streak. Nothing here is authored — every number is derived from
 * mission runs the player genuinely finished.
 *
 * A new player starts empty: 0 XP, level 1, no completed missions, no streak.
 *
 * The ledger lives in `localStorage`, so it can only be read after mount.
 * Every consumer takes a `Ledger` argument and `EMPTY_LEDGER` is a valid one,
 * which keeps the whole app server-renderable: the server renders the
 * zero state, and the client re-renders with the real ledger once hydrated.
 */

import { CAREER_RANKS } from "./data";

/* -------------------------------- Types --------------------------------- */

/** One completed mission run, kept as the evidence behind every derived number. */
export type MissionRecord = {
  missionId: string;
  /** ISO timestamp of the run that produced this record. */
  completedAt: string;
  /** Local calendar date (YYYY-MM-DD) — the unit the streak counts in. */
  completedOn: string;
  /** 0–100, from the grading engine. */
  score: number;
  xpEarned: number;
  durationMs: number;
  hintsUsed: number;
  /** Whether the applied fix actually resolved the root cause. */
  resolved: boolean;
  /** Times this mission has been run to completion. */
  attempts: number;
};

export type Ledger = {
  version: 2;
  /** Total XP earned. Always equals the sum of the mission records' XP. */
  totalXp: number;
  /** Per-skill XP, keyed by the stable skill id from `lib/skills.ts`. */
  skillXp: Record<string, number>;
  /** Best run per mission, keyed by mission id. */
  missions: Record<string, MissionRecord>;
  /** Local calendar dates (YYYY-MM-DD) the player was active, ascending. */
  activeDays: string[];
  /**
   * When each achievement was first derived as unlocked, keyed by achievement
   * id. Stamped on the crossing rather than authored, so "unlocked 3 days ago"
   * means it really was.
   */
  achievements: Record<string, string>;
};

export const EMPTY_LEDGER: Ledger = {
  version: 2,
  totalXp: 0,
  skillXp: {},
  missions: {},
  activeDays: [],
  achievements: {},
};

/* ------------------------------ Persistence ----------------------------- */

export const PROGRESS_KEY = "coderaid:player:progress";

/**
 * Fired on `window` after any ledger write, so every mounted view refreshes
 * together. The native `storage` event only fires in *other* tabs; this one
 * covers the tab that made the change.
 */
export const PROGRESS_EVENT = "coderaid:progress-changed";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Coerces stored JSON into a valid ledger. Unknown shapes reset to empty. */
function parseLedger(raw: string): Ledger {
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed) || parsed.version !== 2) return EMPTY_LEDGER;

  const missions: Record<string, MissionRecord> = {};
  if (isRecord(parsed.missions)) {
    for (const [id, value] of Object.entries(parsed.missions)) {
      if (!isRecord(value)) continue;
      if (typeof value.completedAt !== "string") continue;
      missions[id] = {
        missionId: id,
        completedAt: value.completedAt,
        completedOn:
          typeof value.completedOn === "string"
            ? value.completedOn
            : value.completedAt.slice(0, 10),
        score: numberOr(value.score, 0),
        xpEarned: numberOr(value.xpEarned, 0),
        durationMs: numberOr(value.durationMs, 0),
        hintsUsed: numberOr(value.hintsUsed, 0),
        resolved: value.resolved === true,
        attempts: Math.max(1, numberOr(value.attempts, 1)),
      };
    }
  }

  const skillXp: Record<string, number> = {};
  if (isRecord(parsed.skillXp)) {
    for (const [id, value] of Object.entries(parsed.skillXp)) {
      if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        skillXp[id] = Math.round(value);
      }
    }
  }

  const activeDays = Array.isArray(parsed.activeDays)
    ? Array.from(
        new Set(parsed.activeDays.filter((d): d is string => isIsoDate(d))),
      ).sort()
    : [];

  const achievements: Record<string, string> = {};
  if (isRecord(parsed.achievements)) {
    for (const [id, value] of Object.entries(parsed.achievements)) {
      if (typeof value === "string") achievements[id] = value;
    }
  }

  // Totals are recomputed from the records rather than trusted, so a partial
  // write can never leave the XP figure disagreeing with the mission history.
  const totalXp = Object.values(missions).reduce((sum, m) => sum + m.xpEarned, 0);

  return { version: 2, totalXp, skillXp, missions, activeDays, achievements };
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function loadLedger(storage?: Storage): Ledger {
  const store = storage ?? safeStorage();
  if (!store) return EMPTY_LEDGER;
  try {
    const raw = store.getItem(PROGRESS_KEY);
    return raw ? parseLedger(raw) : EMPTY_LEDGER;
  } catch {
    return EMPTY_LEDGER;
  }
}

export function saveLedger(ledger: Ledger, storage?: Storage): void {
  const store = storage ?? safeStorage();
  if (!store) return;
  try {
    store.setItem(PROGRESS_KEY, JSON.stringify(ledger));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PROGRESS_EVENT));
  }
}

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/* ------------------------------ Calendar -------------------------------- */

/** Local calendar date as YYYY-MM-DD — the unit streaks are counted in. */
export function today(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = `${now.getMonth() + 1}`.padStart(2, "0");
  const d = `${now.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shiftDays(date: string, delta: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const shifted = new Date(y, m - 1, d + delta);
  return today(shifted);
}

/**
 * Records that the player was active today. Called when a mission stage is
 * opened, so the streak reflects real visits rather than an authored number.
 */
export function markActiveToday(ledger: Ledger, now: Date = new Date()): Ledger {
  const day = today(now);
  if (ledger.activeDays.includes(day)) return ledger;
  return { ...ledger, activeDays: [...ledger.activeDays, day].sort() };
}

/**
 * Consecutive active days ending today or yesterday. A streak survives the
 * current day being unplayed until midnight passes twice, which is how every
 * streak the player has seen elsewhere behaves.
 */
export function streakDays(ledger: Ledger, now: Date = new Date()): number {
  const days = new Set(ledger.activeDays);
  if (days.size === 0) return 0;

  const start = days.has(today(now))
    ? today(now)
    : days.has(shiftDays(today(now), -1))
      ? shiftDays(today(now), -1)
      : null;
  if (!start) return 0;

  let count = 0;
  let cursor = start;
  while (days.has(cursor)) {
    count += 1;
    cursor = shiftDays(cursor, -1);
  }
  return count;
}

/* ----------------------------- Achievements ----------------------------- */

/**
 * Stamps the unlock time of any achievement that has just become unlocked, and
 * only those — an id already in the ledger keeps its original timestamp, so an
 * unlock date never drifts forward on a later visit. Returns the same ledger
 * when nothing changed, which lets callers skip a redundant write.
 */
export function stampAchievements(
  ledger: Ledger,
  unlockedIds: string[],
  now: Date = new Date(),
): Ledger {
  const fresh = unlockedIds.filter((id) => !(id in ledger.achievements));
  if (fresh.length === 0) return ledger;
  const achievements = { ...ledger.achievements };
  for (const id of fresh) achievements[id] = now.toISOString();
  return { ...ledger, achievements };
}

/* --------------------------- Levels and ranks --------------------------- */

/**
 * Total XP required to *reach* a level. Quadratic, so each level costs a
 * little more than the last: L2 = 100, L5 = 1,000, L10 = 4,500.
 *
 * Calibration: clearing every Node.js mission in the MVP catalogue at a
 * perfect score is worth ~1,830 XP, which lands a player around level 7.
 */
export function xpForLevel(level: number): number {
  const l = Math.max(1, Math.floor(level));
  return 50 * l * (l - 1);
}

/** The level a total XP figure earns. Starts at 1, never below it. */
export function levelFromXp(totalXp: number): number {
  const xp = Math.max(0, totalXp);
  // Inverse of 50·L·(L−1) ≤ xp, then walked back for float safety.
  let level = Math.floor((1 + Math.sqrt(1 + xp / 12.5)) / 2);
  while (xpForLevel(level + 1) <= xp) level += 1;
  while (level > 1 && xpForLevel(level) > xp) level -= 1;
  return Math.max(1, level);
}

/** Progress through the current level, for the level bar. */
export function levelProgress(totalXp: number) {
  const level = levelFromXp(totalXp);
  const floorXp = xpForLevel(level);
  const ceilXp = xpForLevel(level + 1);
  const span = ceilXp - floorXp;
  return {
    level,
    into: totalXp - floorXp,
    needed: span,
    pct: span === 0 ? 100 : Math.round(((totalXp - floorXp) / span) * 100),
  };
}

/**
 * The rank band a total XP figure falls into, plus the rank above it. Derived
 * from `CAREER_RANKS.minXp` so the displayed rank, the XP ceiling and the
 * progress bar can never drift from the published thresholds.
 */
export function rankBand(totalXp: number) {
  const ranks = [...CAREER_RANKS].sort((a, b) => a.minXp - b.minXp);
  const current = ranks.filter((r) => totalXp >= r.minXp).at(-1) ?? ranks[0];
  const next = ranks.find((r) => r.minXp > current.minXp);
  return {
    current,
    next,
    // At the top rank there is no ceiling left to climb — hold the bar full.
    xpMax: next?.minXp ?? current.minXp,
    atTopRank: !next,
  };
}

/* -------------------------------- Skills -------------------------------- */

/**
 * XP required per skill level. Skills cap at `MAX_SKILL_LEVEL`.
 *
 * Calibrated against the catalogue: a skill that is the primary reward of two
 * or three incidents reaches level 7–8 once those are cleared well, while a
 * skill with a single authored incident tops out low. That is a content
 * statement, not a bug — those levels rise as missions are written.
 */
export const SKILL_XP_PER_LEVEL = 40;
export const MAX_SKILL_LEVEL = 10;

export function skillLevelFromXp(xp: number): number {
  return Math.min(MAX_SKILL_LEVEL, Math.floor(Math.max(0, xp) / SKILL_XP_PER_LEVEL));
}

/** XP earned toward the next skill level, and the size of that level. */
export function skillLevelProgress(xp: number) {
  const level = skillLevelFromXp(xp);
  if (level >= MAX_SKILL_LEVEL) {
    return { level, into: SKILL_XP_PER_LEVEL, needed: SKILL_XP_PER_LEVEL, pct: 100 };
  }
  const into = Math.max(0, xp) - level * SKILL_XP_PER_LEVEL;
  return {
    level,
    into,
    needed: SKILL_XP_PER_LEVEL,
    pct: Math.round((into / SKILL_XP_PER_LEVEL) * 100),
  };
}

export function skillXpFor(ledger: Ledger, skillId: string): number {
  return ledger.skillXp[skillId] ?? 0;
}

/* ------------------------------- Missions ------------------------------- */

export function completedMissionIds(ledger: Ledger): string[] {
  return Object.keys(ledger.missions);
}

export function isMissionCompleted(ledger: Ledger, missionId: string): boolean {
  return missionId in ledger.missions;
}

export function missionRecord(
  ledger: Ledger,
  missionId: string,
): MissionRecord | undefined {
  return ledger.missions[missionId];
}

/** Best score across every completed mission — 0 before the first run. */
export function bestScore(ledger: Ledger): number {
  return Object.values(ledger.missions).reduce(
    (best, m) => Math.max(best, m.score),
    0,
  );
}

/** XP earned within the last `days` calendar days — powers period standings. */
export function xpSince(ledger: Ledger, days: number, now: Date = new Date()): number {
  const cutoff = shiftDays(today(now), -(days - 1));
  return Object.values(ledger.missions)
    .filter((m) => m.completedOn >= cutoff)
    .reduce((sum, m) => sum + m.xpEarned, 0);
}

/** Missions completed within the last `days` calendar days. */
export function missionsSince(
  ledger: Ledger,
  days: number,
  now: Date = new Date(),
): number {
  const cutoff = shiftDays(today(now), -(days - 1));
  return Object.values(ledger.missions).filter((m) => m.completedOn >= cutoff)
    .length;
}

/**
 * Share of completed runs that resolved their incident. 0 when nothing has
 * been completed — an unplayed account has no success rate to report.
 */
export function successRate(ledger: Ledger): number {
  const runs = Object.values(ledger.missions);
  if (runs.length === 0) return 0;
  return Math.round(
    (runs.filter((m) => m.resolved).length / runs.length) * 100,
  );
}

/* ---------------------------- Crediting a run --------------------------- */

export type RunReward = {
  missionId: string;
  score: number;
  xp: number;
  durationMs: number;
  hintsUsed: number;
  resolved: boolean;
  /** Skill XP this run awards, keyed by stable skill id. */
  skillXp: Record<string, number>;
};

export type CreditResult = {
  ledger: Ledger;
  /** XP actually added — 0 on a replay that didn't beat the previous run. */
  xpAdded: number;
  /** Skill XP actually added, keyed by skill id. */
  skillXpAdded: Record<string, number>;
  /** True when this was the first time the mission was completed. */
  firstCompletion: boolean;
};

/**
 * Credits a completed run, keeping only the player's best result per mission.
 *
 * A replay that scores higher tops the previous award up to the new total; a
 * replay that scores the same or lower changes nothing. That makes crediting
 * idempotent — a refresh on the results screen can't farm XP — while still
 * rewarding a genuinely better second attempt.
 */
export function creditRun(
  ledger: Ledger,
  reward: RunReward,
  now: Date = new Date(),
): CreditResult {
  const previous = ledger.missions[reward.missionId];
  const firstCompletion = !previous;
  const improved = !previous || reward.score > previous.score;

  const xpAdded = improved
    ? Math.max(0, reward.xp - (previous?.xpEarned ?? 0))
    : 0;

  const skillXpAdded: Record<string, number> = {};
  const skillXp = { ...ledger.skillXp };
  if (improved) {
    // Skill XP is topped up by the same fraction the mission XP moved, so a
    // better replay upgrades the reward instead of stacking a second one.
    const ratio = previous ? previousSkillShare(previous, reward) : 1;
    for (const [skillId, amount] of Object.entries(reward.skillXp)) {
      const add = Math.max(0, Math.round(amount * ratio));
      if (add === 0) continue;
      skillXpAdded[skillId] = add;
      skillXp[skillId] = (skillXp[skillId] ?? 0) + add;
    }
  }

  const record: MissionRecord = improved
    ? {
        missionId: reward.missionId,
        completedAt: now.toISOString(),
        completedOn: today(now),
        score: reward.score,
        xpEarned: Math.max(reward.xp, previous?.xpEarned ?? 0),
        durationMs: reward.durationMs,
        hintsUsed: reward.hintsUsed,
        resolved: reward.resolved,
        attempts: (previous?.attempts ?? 0) + 1,
      }
    : { ...previous, attempts: previous.attempts + 1 };

  const missions = { ...ledger.missions, [reward.missionId]: record };
  const totalXp = Object.values(missions).reduce((s, m) => s + m.xpEarned, 0);

  return {
    ledger: markActiveToday({ ...ledger, totalXp, skillXp, missions }, now),
    xpAdded,
    skillXpAdded,
    firstCompletion,
  };
}

/**
 * How much of a replay's skill reward is genuinely new. Mirrors the mission-XP
 * top-up: score 60 → 90 grants the missing third, not another full award.
 */
function previousSkillShare(previous: MissionRecord, reward: RunReward): number {
  if (reward.score <= 0) return 0;
  return Math.max(0, (reward.score - previous.score) / reward.score);
}
