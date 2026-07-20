import { describe, expect, it } from "vitest";
import {
  EMPTY_VIEW,
  PLAYABLE_MISSION_IDS,
  blockedReason,
  canReview,
  canStart,
  chapterProgress,
  chapterState,
  hasFullContent,
  missionAvailability,
  nextMissionId,
  overallProgress,
  playableSummary,
  recommendedMission,
  type PlayerView,
} from "@/lib/availability";
import { MISSIONS, NODE_MISSIONS, chapterTrack, getMission, type Mission } from "@/lib/missions";
import { EMPTY_LEDGER, type Ledger, type MissionRecord } from "@/lib/progress";
import { recommendedStartingMission } from "@/lib/onboarding";

/* ------------------------------- Fixtures ------------------------------- */

const EVENT_LOOP = getMission("event-loop-overload") as Mission;
const SIGNUP = getMission("user-signup-latency-spike") as Mission;
/**
 * Inside the Node.js MVP, but with no stage content authored at all.
 *
 * Every catalogued mission is now fully written, so this is a fixture rather
 * than a real mission — the rule it exercises ("no content means no CTA") has
 * to keep holding for the *next* mission someone starts writing.
 */
const PARTIAL: Mission = {
  ...(getMission("slow-api-incident") as Mission),
  id: "unwritten-incident",
  index: 99,
  status: "in-development",
};
const FUTURE = getMission("redis-cache-meltdown") as Mission;

function record(missionId: string, over: Partial<MissionRecord> = {}): MissionRecord {
  return {
    missionId,
    completedAt: "2026-03-10T09:00:00.000Z",
    completedOn: "2026-03-10",
    score: 90,
    xpEarned: 72,
    durationMs: 600_000,
    hintsUsed: 0,
    resolved: true,
    attempts: 1,
    ...over,
  };
}

function viewWith(
  completed: string[] = [],
  started: string[] = [],
): PlayerView {
  const missions: Ledger["missions"] = {};
  for (const id of completed) missions[id] = record(id);
  return {
    ledger: { ...EMPTY_LEDGER, missions },
    startedMissionIds: started,
  };
}

/* -------------------------------- Tests --------------------------------- */

describe("content coverage", () => {
  it("treats a mission with all five stage configs as playable", () => {
    expect(hasFullContent(EVENT_LOOP.id)).toBe(true);
    expect(hasFullContent(SIGNUP.id)).toBe(true);
  });

  it("treats a mission missing a stage as not playable", () => {
    expect(hasFullContent(PARTIAL.id)).toBe(false);
    expect(missionAvailability(PARTIAL)).toBe("in-development");
  });

  it("lists exactly the fully authored Node.js missions, in catalogue order", () => {
    expect(PLAYABLE_MISSION_IDS).toEqual([
      "event-loop-overload",
      "promise-all-cascade",
      "async-map-trap",
      "overlapping-scheduler-runs",
      "unhandled-rejection-storm",
      "user-signup-latency-spike",
      "jwt-session-expiry",
      "health-check-flapping",
      "graceful-shutdown-bug",
      "rate-limiter-race",
      "memory-leak-worker",
      "worker-queue-backlog",
      "connection-pool-exhaustion",
      "slow-api-incident",
    ]);
    expect(playableSummary().total).toBe(NODE_MISSIONS.length);
    expect(playableSummary().playable + playableSummary().inDevelopment).toBe(
      NODE_MISSIONS.length,
    );
  });

  it.each([1, 2, 3])("has every Chapter %i mission playable", (chapterId) => {
    const chapter = NODE_MISSIONS.filter((m) => m.chapterId === chapterId);
    expect(chapter.length).toBeGreaterThan(0);
    for (const mission of chapter) {
      expect(hasFullContent(mission.id)).toBe(true);
      expect(mission.status).toBe("available");
    }
  });

  it("leaves no Node.js mission in development", () => {
    expect(NODE_MISSIONS.length).toBeGreaterThan(0);
    for (const mission of NODE_MISSIONS) {
      expect(hasFullContent(mission.id)).toBe(true);
      expect(mission.status).toBe("available");
      expect(missionAvailability(mission)).toBe("available");
    }
    expect(playableSummary().inDevelopment).toBe(0);
  });

  it("keeps the future tracks out of the playable set", () => {
    const future = MISSIONS.filter((m) => chapterTrack(m.chapterId) === "future");
    expect(future.length).toBeGreaterThan(0);
    for (const mission of future) {
      expect(missionAvailability(mission)).toBe("coming-soon");
      expect(canStart(mission)).toBe(false);
      expect(PLAYABLE_MISSION_IDS).not.toContain(mission.id);
    }
  });

  it("derives the playable count rather than hardcoding it", () => {
    expect(playableSummary().playable).toBe(
      NODE_MISSIONS.filter((m) => hasFullContent(m.id)).length,
    );
  });
});

describe("missionAvailability", () => {
  it("shows a fully authored mission as available to a new player", () => {
    expect(missionAvailability(EVENT_LOOP, EMPTY_VIEW)).toBe("available");
    expect(canStart(EVENT_LOOP, EMPTY_VIEW)).toBe(true);
    expect(blockedReason(EVENT_LOOP, EMPTY_VIEW)).toBeNull();
  });

  it("shows a started but unfinished mission as in progress", () => {
    expect(missionAvailability(EVENT_LOOP, viewWith([], [EVENT_LOOP.id]))).toBe(
      "current",
    );
  });

  it("shows a mission as completed only once it is in the ledger", () => {
    expect(missionAvailability(EVENT_LOOP, viewWith([EVENT_LOOP.id]))).toBe(
      "completed",
    );
    // Completion wins over a lingering started marker.
    expect(
      missionAvailability(EVENT_LOOP, viewWith([EVENT_LOOP.id], [EVENT_LOOP.id])),
    ).toBe("completed");
    expect(canReview(EVENT_LOOP, viewWith([EVENT_LOOP.id]))).toBe(true);
  });

  it("keeps future-track missions coming soon whatever the player does", () => {
    expect(missionAvailability(FUTURE, viewWith([FUTURE.id], [FUTURE.id]))).toBe(
      "coming-soon",
    );
    expect(canStart(FUTURE)).toBe(false);
    expect(blockedReason(FUTURE)).toBeTruthy();
  });

  it("never derives availability from the authored status alone", () => {
    // Every authored status is a content state; "current" and "completed" are
    // player states and must not appear in the catalogue.
    for (const mission of MISSIONS) {
      expect(["available", "locked", "in-development", "coming-soon"]).toContain(
        mission.status,
      );
    }
  });

  it("blocks a mission whose stages are unwritten even if it says available", () => {
    const lying: Mission = { ...PARTIAL, status: "available" };
    expect(missionAvailability(lying)).toBe("in-development");
    expect(canStart(lying)).toBe(false);
  });
});

describe("recommendation", () => {
  it("points a new player at Event Loop Overload", () => {
    expect(recommendedMission(EMPTY_VIEW)?.id).toBe("event-loop-overload");
  });

  it("agrees with the beginner onboarding suggestion", () => {
    const suggested = recommendedStartingMission("beginner");
    expect(suggested.id).toBe("event-loop-overload");
    expect(recommendedMission(EMPTY_VIEW)?.id).toBe(suggested.id);
    expect(canStart(getMission(suggested.id) as Mission, EMPTY_VIEW)).toBe(true);
  });

  it("prefers a mission the player has already started", () => {
    expect(recommendedMission(viewWith([], [SIGNUP.id]))?.id).toBe(SIGNUP.id);
  });

  it("moves on once a mission is completed", () => {
    expect(recommendedMission(viewWith([EVENT_LOOP.id]))?.id).toBe(
      "promise-all-cascade",
    );
  });

  it("never recommends incomplete content", () => {
    const views = [
      EMPTY_VIEW,
      viewWith([EVENT_LOOP.id]),
      viewWith([EVENT_LOOP.id, SIGNUP.id]),
      viewWith([], [PARTIAL.id]),
    ];
    for (const view of views) {
      const mission = recommendedMission(view);
      if (!mission) continue;
      expect(hasFullContent(mission.id)).toBe(true);
      expect(chapterTrack(mission.chapterId)).toBe("nodejs");
    }
  });
});

describe("nextMissionId", () => {
  /** The intended Chapter 1 → Chapter 2 progression, by catalogue index. */
  const ORDER = [
    "event-loop-overload",
    "promise-all-cascade",
    "async-map-trap",
    "overlapping-scheduler-runs",
    "unhandled-rejection-storm",
    "user-signup-latency-spike",
    "jwt-session-expiry",
    "health-check-flapping",
    "graceful-shutdown-bug",
    "rate-limiter-race",
    "memory-leak-worker",
    "worker-queue-backlog",
    "connection-pool-exhaustion",
    "slow-api-incident",
  ];

  it("walks the playable catalogue in order", () => {
    for (let i = 0; i < ORDER.length - 1; i += 1) {
      expect(nextMissionId(ORDER[i], EMPTY_VIEW)).toBe(ORDER[i + 1]);
    }
  });

  it("skips missions the player has already completed", () => {
    expect(nextMissionId(EVENT_LOOP.id, viewWith([ORDER[1]]))).toBe(ORDER[2]);
    expect(nextMissionId(EVENT_LOOP.id, viewWith(ORDER.slice(1)))).toBeUndefined();
  });

  it("returns nothing once every playable mission is finished", () => {
    expect(nextMissionId(ORDER[ORDER.length - 1], viewWith(ORDER))).toBeUndefined();
    // Nor does it fall through into the future tracks, which are not playable.
    expect(nextMissionId(SIGNUP.id, viewWith(ORDER))).toBeUndefined();
  });

  it("never returns incomplete content", () => {
    for (const mission of MISSIONS) {
      const next = nextMissionId(mission.id, EMPTY_VIEW);
      if (!next) continue;
      expect(hasFullContent(next)).toBe(true);
    }
  });

  it("returns nothing for an unknown mission", () => {
    expect(nextMissionId("does-not-exist")).toBeUndefined();
  });
});

describe("progress counting", () => {
  it("counts nothing for a new player", () => {
    expect(overallProgress(EMPTY_VIEW)).toEqual({
      done: 0,
      total: NODE_MISSIONS.length,
      pct: 0,
    });
  });

  it("counts only earned completions", () => {
    const view = viewWith([EVENT_LOOP.id]);
    expect(overallProgress(view).done).toBe(1);
    expect(chapterProgress(1, view).done).toBe(1);
  });

  it("excludes future-track missions from MVP progress", () => {
    const view = viewWith([FUTURE.id]);
    expect(overallProgress(view).done).toBe(0);
    expect(overallProgress(view).total).toBe(NODE_MISSIONS.length);
  });

  it("keeps future chapters coming soon regardless of progress", () => {
    expect(chapterState(4, viewWith([FUTURE.id]))).toBe("coming-soon");
    expect(chapterState(5)).toBe("coming-soon");
  });

  it.each([1, 2])(
    "reports Chapter %i complete only when every mission in it is",
    (chapterId) => {
      expect(chapterState(chapterId, EMPTY_VIEW)).toBe("in-progress");

      const ids = MISSIONS.filter((m) => m.chapterId === chapterId).map((m) => m.id);
      // Every mission but the last still leaves the chapter in progress.
      expect(chapterState(chapterId, viewWith(ids.slice(0, -1)))).toBe("in-progress");
      // Both chapters are fully authored, so finishing all of one completes it.
      expect(chapterState(chapterId, viewWith(ids))).toBe("complete");
    },
  );

  it("cannot complete a chapter that still holds unwritten missions", () => {
    // Every catalogued mission is authored today, so the rule is exercised
    // against an injected chapter: an unwritten mission resolves to
    // in-development whatever the ledger claims, so a stale record can never
    // tick the chapter off.
    const written = getMission("memory-leak-worker") as Mission;
    const list = [written, PARTIAL];
    expect(hasFullContent(PARTIAL.id)).toBe(false);
    expect(
      chapterState(written.chapterId, viewWith([written.id, PARTIAL.id]), list),
    ).toBe("in-progress");
  });

  it("completes Chapter 3 once all four of its missions are finished", () => {
    const chapterThree = MISSIONS.filter((m) => m.chapterId === 3);
    expect(chapterThree).toHaveLength(4);
    expect(chapterState(3, viewWith(chapterThree.slice(0, -1).map((m) => m.id)))).toBe(
      "in-progress",
    );
    expect(chapterState(3, viewWith(chapterThree.map((m) => m.id)))).toBe("complete");
  });
});
