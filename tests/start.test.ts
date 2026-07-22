import { describe, expect, it } from "vitest";
import { EMPTY_VIEW, canStart, type PlayerView } from "@/lib/availability";
import { NODE_MISSIONS, getMission } from "@/lib/missions";
import { EMPTY_LEDGER, type Ledger, type MissionRecord } from "@/lib/progress";
import {
  firstIncident,
  returningMission,
  startDestination,
  storageNote,
} from "@/lib/start";

/**
 * The `/start` decision rules.
 *
 * These are the parts of the onboarding completion flow that can be tested
 * without a browser: which state the page should be in, which mission the
 * success card offers, and what the storage copy claims. The component supplies
 * the `localStorage` reads and the navigation, in the same split as
 * `lib/stage-access.ts` and `StageGate`.
 */

/** A ledger holding a finished run for each of `missionIds`. */
function ledgerWith(missionIds: string[]): Ledger {
  const missions: Record<string, MissionRecord> = {};
  for (const id of missionIds) {
    missions[id] = {
      missionId: id,
      completedAt: "2026-07-22T10:00:00.000Z",
      completedOn: "2026-07-22",
      score: 100,
      xpEarned: getMission(id)?.xp ?? 0,
      durationMs: 600_000,
      hintsUsed: 0,
      resolved: true,
      attempts: 1,
    };
  }
  return { ...EMPTY_LEDGER, missions };
}

function viewWith(completed: string[], started: string[] = []): PlayerView {
  return { ledger: ledgerWith(completed), startedMissionIds: started };
}

const PLAYABLE = NODE_MISSIONS.filter((m) => canStart(m));

describe("startDestination", () => {
  it("runs the wizard when onboarding is not complete", () => {
    expect(
      startDestination({ completed: false, justCompleted: false, experienceId: "beginner" }, EMPTY_VIEW),
    ).toEqual({ kind: "onboarding" });
  });

  it("shows the success card only in the interaction that completed it", () => {
    expect(
      startDestination({ completed: true, justCompleted: true, experienceId: "beginner" }, EMPTY_VIEW),
    ).toEqual({ kind: "success" });
  });

  it("redirects a returning player instead of re-congratulating them", () => {
    // The whole point: same persisted draft, different interaction.
    const destination = startDestination(
      { completed: true, justCompleted: false, experienceId: "beginner" },
      EMPTY_VIEW,
    );
    expect(destination.kind).toBe("resume");
  });

  it("prefers the mission a returning player already started", () => {
    const started = PLAYABLE[2];
    const destination = startDestination(
      { completed: true, justCompleted: false, experienceId: "beginner" },
      viewWith([], [started.id]),
    );
    expect(destination).toMatchObject({ kind: "resume" });
    if (destination.kind !== "resume") throw new Error("unreachable");
    expect(destination.mission.id).toBe(started.id);
  });

  it("moves past a mission the player has finished", () => {
    const done = PLAYABLE[0];
    const destination = startDestination(
      { completed: true, justCompleted: false, experienceId: "beginner" },
      viewWith([done.id]),
    );
    if (destination.kind !== "resume") throw new Error("expected a resume");
    expect(destination.mission.id).not.toBe(done.id);
  });

  it("sends a player who has finished everything to the dashboard", () => {
    const destination = startDestination(
      { completed: true, justCompleted: false, experienceId: "beginner" },
      viewWith(PLAYABLE.map((m) => m.id)),
    );
    expect(destination).toEqual({ kind: "dashboard" });
  });

  it("never resumes into a mission that cannot be started", () => {
    // Every reachable destination must be playable end to end, or the redirect
    // lands a returning player on unwritten content.
    for (const completed of [[], [PLAYABLE[0].id], PLAYABLE.slice(0, 5).map((m) => m.id)]) {
      const destination = startDestination(
        { completed: true, justCompleted: false, experienceId: "beginner" },
        viewWith(completed),
      );
      if (destination.kind === "resume") {
        expect(canStart(destination.mission)).toBe(true);
      }
    }
  });
});

describe("returningMission", () => {
  it("is undefined exactly when there is nothing left to play", () => {
    expect(returningMission(viewWith(PLAYABLE.map((m) => m.id)))).toBeUndefined();
    expect(returningMission(EMPTY_VIEW)).toBeDefined();
  });

  it("sends a player back to the incident their onboarding recommended", () => {
    // Otherwise the app contradicts itself: the success card tells a Junior
    // player to start Promise.all Failure Cascade, and the next visit to
    // /start redirects them into Event Loop Overload instead.
    expect(returningMission(EMPTY_VIEW, "junior")?.id).toBe("promise-all-cascade");
    expect(returningMission(EMPTY_VIEW, "mid")?.id).toBe(
      "user-signup-latency-spike",
    );
  });

  it("puts a mission in progress ahead of the onboarding recommendation", () => {
    const started = PLAYABLE.find((m) => m.id !== "promise-all-cascade")!;
    expect(returningMission(viewWith([], [started.id]), "junior")?.id).toBe(
      started.id,
    );
  });

  it("moves on once the recommended incident is finished", () => {
    const mission = returningMission(viewWith(["promise-all-cascade"]), "junior");
    expect(mission?.id).not.toBe("promise-all-cascade");
    expect(mission).toBeDefined();
  });
});

describe("firstIncident", () => {
  // The recommendation the product spec pins, per experience level.
  it.each([
    ["beginner", "event-loop-overload"],
    ["junior", "promise-all-cascade"],
    ["mid", "user-signup-latency-spike"],
  ])("recommends %s → %s", (experienceId, missionId) => {
    expect(firstIncident(experienceId, EMPTY_VIEW)?.id).toBe(missionId);
  });

  it("falls back to the beginner mission for an unknown experience id", () => {
    // Includes experience levels saved by older builds.
    expect(firstIncident("staff-principal-wizard", EMPTY_VIEW)?.id).toBe(
      "event-loop-overload",
    );
  });

  it("only ever offers a mission that canStart", () => {
    for (const experienceId of ["beginner", "junior", "mid", "unknown"]) {
      const mission = firstIncident(experienceId, EMPTY_VIEW);
      expect(mission).toBeDefined();
      expect(canStart(mission!)).toBe(true);
    }
  });

  it("does not hardcode one mission for every player", () => {
    const ids = ["beginner", "junior", "mid"].map(
      (e) => firstIncident(e, EMPTY_VIEW)?.id,
    );
    expect(new Set(ids).size).toBe(3);
  });

  it("still recommends a mission the player has already completed", () => {
    // The success card is shown once, right after onboarding — "you have
    // played this" is not a reason to withhold the suggestion the wizard just
    // told them about on the confirm step.
    expect(
      firstIncident("beginner", viewWith(["event-loop-overload"]))?.id,
    ).toBe("event-loop-overload");
  });
});

describe("storageNote", () => {
  it("tells a signed-in player their progress is on their account", () => {
    const note = storageNote(true);
    expect(note.primary).toBe(
      "Your scores and progress are saved to your account.",
    );
    expect(note.secondary).toContain("profile preferences");
  });

  it("tells a signed-out player what an account is for", () => {
    const note = storageNote(false);
    expect(note.primary).toContain("without an account");
    expect(note.primary).toContain("run verification");
    expect(note.secondary).toContain("this browser");
  });

  it("never tells a signed-in player their progress is browser-local", () => {
    // The exact inaccuracy this copy replaces: "Your profile is saved in this
    // browser", shown to everyone, including players whose XP, skills, rank
    // and achievements are derived in Postgres.
    const note = storageNote(true);
    expect(note.primary).not.toMatch(/this browser/i);
  });
});
