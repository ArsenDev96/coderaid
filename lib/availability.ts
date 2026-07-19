import { DIAGNOSABLE_MISSION_IDS } from "@/lib/diagnosis";
import { FIXABLE_MISSION_IDS } from "@/lib/fix";
import { INVESTIGATABLE_MISSION_IDS } from "@/lib/investigation";
import {
  MISSIONS,
  NODE_MISSIONS,
  chapterTrack,
  getMission,
  type Mission,
} from "@/lib/missions";
import { EMPTY_LEDGER, type Ledger } from "@/lib/progress";
import { RESULT_MISSION_IDS } from "@/lib/results";
import { VERIFIABLE_MISSION_IDS } from "@/lib/verification";

/**
 * One vocabulary for "can the player do this yet?", shared by the mission
 * browser, the map, the detail panel, the dashboard and the skills page.
 *
 * This lives outside `lib/missions.ts` on purpose: deciding whether a mission
 * is playable means reading the per-stage content modules, and importing those
 * from the catalogue would create a cycle.
 *
 * Availability has two halves. The catalogue decides whether a mission *exists*
 * to be played (`mission.status`, plus whether its stage content is authored);
 * the player's progression ledger decides whether *they* have played it. Both
 * are resolved here, so no component has to combine them itself.
 */
export type Availability =
  | "completed"
  | "current"
  | "available"
  | "locked"
  | "in-development"
  | "coming-soon";

export type AvailabilityMeta = {
  label: string;
  /** Shown wherever there's room to explain why a CTA is disabled. */
  note?: string;
  /** Badge classes, matching the existing surface/chip treatment. */
  cls: string;
  /** Whether the primary CTA may be followed. */
  interactive: boolean;
};

export const IN_DEVELOPMENT_NOTE =
  "This Node.js incident is currently being prepared.";
export const COMING_SOON_NOTE =
  "This track will be added after the Node.js MVP.";

export const AVAILABILITY_META: Record<Availability, AvailabilityMeta> = {
  completed: {
    label: "Completed",
    cls: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
    interactive: true,
  },
  current: {
    label: "In Progress",
    cls: "border-violet-400/30 bg-violet-500/10 text-violet-300",
    interactive: true,
  },
  available: {
    label: "Available",
    cls: "border-electric-400/30 bg-electric-500/10 text-electric-300",
    interactive: true,
  },
  locked: {
    label: "Locked",
    cls: "border-white/10 bg-white/[0.03] text-slate-400",
    note: "Finish the earlier missions in this chapter to unlock it.",
    interactive: false,
  },
  "in-development": {
    label: "In Development",
    cls: "border-amber-400/30 bg-amber-500/10 text-amber-300",
    note: IN_DEVELOPMENT_NOTE,
    interactive: false,
  },
  "coming-soon": {
    label: "Coming Soon",
    cls: "border-white/10 bg-white/[0.03] text-slate-400",
    note: COMING_SOON_NOTE,
    interactive: false,
  },
};

/* ----------------------------- Player view ------------------------------ */

/**
 * Everything about the player that availability depends on. `EMPTY_VIEW` is a
 * valid one — a brand-new player with nothing completed and nothing started —
 * which is what the server renders before the client hydrates the real ledger.
 */
export type PlayerView = {
  ledger: Ledger;
  /** Missions with run telemetry — opened but not necessarily finished. */
  startedMissionIds: string[];
};

export const EMPTY_VIEW: PlayerView = {
  ledger: EMPTY_LEDGER,
  startedMissionIds: [],
};

/* --------------------------- Content coverage --------------------------- */

const has = (ids: string[], id: string) => ids.includes(id);

/**
 * A mission is playable only when every stage after the briefing has authored
 * content. Derived rather than hand-maintained, so adding a mission's stage
 * configs is the single act that makes it startable.
 */
export function hasFullContent(missionId: string): boolean {
  return (
    has(INVESTIGATABLE_MISSION_IDS, missionId) &&
    has(DIAGNOSABLE_MISSION_IDS, missionId) &&
    has(FIXABLE_MISSION_IDS, missionId) &&
    has(VERIFIABLE_MISSION_IDS, missionId) &&
    has(RESULT_MISSION_IDS, missionId)
  );
}

/** Missions a player can actually run end to end right now. */
export const PLAYABLE_MISSION_IDS = NODE_MISSIONS.filter((m) =>
  hasFullContent(m.id),
).map((m) => m.id);

/**
 * Resolved availability for a mission, for this player.
 *
 * Authored `coming-soon` and `locked` states win outright, and anything else
 * that lacks stage content degrades to `in-development` — the UI can never
 * offer a CTA that lands on an unwritten stage. Beyond that the ledger decides:
 * a mission the player has finished is `completed`, one they have opened but
 * not finished is `current`, and the rest are `available`.
 */
export function missionAvailability(
  mission: Mission,
  view: PlayerView = EMPTY_VIEW,
): Availability {
  if (chapterTrack(mission.chapterId) === "future") return "coming-soon";
  if (mission.status === "coming-soon") return "coming-soon";
  if (mission.status === "locked") return "locked";
  if (!hasFullContent(mission.id)) return "in-development";
  if (mission.id in view.ledger.missions) return "completed";
  if (view.startedMissionIds.includes(mission.id)) return "current";
  return "available";
}

/** True when the mission's primary CTA should navigate into the flow. */
export function canStart(mission: Mission, view: PlayerView = EMPTY_VIEW): boolean {
  const availability = missionAvailability(mission, view);
  return (
    availability !== "coming-soon" &&
    availability !== "locked" &&
    availability !== "in-development" &&
    hasFullContent(mission.id)
  );
}

/**
 * Whether a completed mission can be reviewed. Completion now only ever comes
 * from a real run, and a mission can't be run without content, so this holds
 * for anything the player has actually finished.
 */
export function canReview(mission: Mission, view: PlayerView = EMPTY_VIEW): boolean {
  return (
    missionAvailability(mission, view) === "completed" && hasFullContent(mission.id)
  );
}

/** Copy for a CTA that must stay disabled, or null when it's followable. */
export function blockedReason(
  mission: Mission,
  view: PlayerView = EMPTY_VIEW,
): string | null {
  const availability = missionAvailability(mission, view);
  if (availability === "coming-soon") return COMING_SOON_NOTE;
  if (availability === "locked") return AVAILABILITY_META.locked.note ?? null;
  if (availability === "in-development") return IN_DEVELOPMENT_NOTE;
  return null;
}

/* ----------------------------- Recommendation --------------------------- */

/**
 * The mission the player should open next: fully playable, Node.js track, and
 * preferring one they've already started, then one they haven't finished.
 * Never returns an in-development, locked or coming-soon mission, so no
 * recommendation can dead-end.
 */
export function recommendedMission(
  view: PlayerView = EMPTY_VIEW,
): Mission | undefined {
  const playable = NODE_MISSIONS.filter((m) => canStart(m, view));
  return (
    playable.find((m) => missionAvailability(m, view) === "current") ??
    playable.find((m) => missionAvailability(m, view) !== "completed") ??
    playable[0]
  );
}

/**
 * The next mission after `currentId` that can actually be played. Returns
 * undefined when there is nothing playable left — callers fall back to the
 * mission list rather than pointing at unfinished content.
 */
export function nextMissionId(
  currentId: string,
  view: PlayerView = EMPTY_VIEW,
): string | undefined {
  const current = getMission(currentId);
  if (!current) return undefined;
  return MISSIONS.filter(
    (m) =>
      m.index > current.index &&
      canStart(m, view) &&
      missionAvailability(m, view) !== "completed",
  ).sort((a, b) => a.index - b.index)[0]?.id;
}

/** How much of the MVP is actually playable today — drives "more coming" copy. */
export function playableSummary() {
  return {
    playable: PLAYABLE_MISSION_IDS.length,
    inDevelopment: NODE_MISSIONS.filter(
      (m) => missionAvailability(m) === "in-development",
    ).length,
    total: NODE_MISSIONS.length,
  };
}

/* ------------------------------- Progress ------------------------------- */

/**
 * Overall completion across the Node.js MVP — drives the header progress bar.
 * Counted from the ledger, so it only ever reflects missions the player really
 * finished. Future-track missions are excluded so the roadmap can grow without
 * making the player look like they've regressed.
 */
export function overallProgress(
  view: PlayerView = EMPTY_VIEW,
  list = NODE_MISSIONS,
) {
  const total = list.length;
  const done = list.filter((m) => m.id in view.ledger.missions).length;
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}

/** Chapter progress, counted the same way. */
export function chapterProgress(chapterId: number, view: PlayerView = EMPTY_VIEW) {
  const all = MISSIONS.filter((m) => m.chapterId === chapterId);
  return {
    done: all.filter((m) => m.id in view.ledger.missions).length,
    total: all.length,
  };
}

export type ChapterState = "complete" | "in-progress" | "locked" | "coming-soon";

/**
 * A chapter is coming-soon on the future track, locked while none of its
 * missions are playable, and complete when the player has finished them all.
 */
export function chapterState(
  chapterId: number,
  view: PlayerView = EMPTY_VIEW,
  list = MISSIONS,
): ChapterState {
  if (chapterTrack(chapterId) === "future") return "coming-soon";
  const rows = list.filter((m) => m.chapterId === chapterId);
  if (rows.length === 0) return "locked";
  if (rows.every((m) => missionAvailability(m, view) === "locked")) return "locked";
  if (rows.every((m) => missionAvailability(m, view) === "completed")) {
    return "complete";
  }
  return "in-progress";
}
