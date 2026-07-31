import { describe, expect, it, vi } from "vitest";
import { EMPTY_LEDGER, coerceLedger, creditBetween, type Ledger } from "@/lib/progress";
import { ledgerFor } from "@/lib/server/ledger";
import { parseLocalDate } from "@/lib/server/submission";

/**
 * The rules that replaced client-side crediting.
 *
 * Step D moved the ledger to the server, so `creditRun()` no longer runs in the
 * browser. What the results screen shows is now *measured* — the server diffs
 * the ledger around the insert — and these are the pure pieces that make that
 * measurement, plus the bound on the one value a client still supplies.
 *
 * The last block goes one level up and drives `ledgerFor()` itself against a
 * stand-in database, because the reset tombstone (§12 item 7) is the one rule
 * that is *not* wholly pure: `lib/reset.ts` decides what a date means, but
 * `lib/server/ledger.ts` decides which columns that decision is applied to, and
 * nothing about the first catches a change to the second.
 */

/* The admin client `ledgerFor()` builds its queries on. Held in a hoisted box
   because `vi.mock` factories are lifted above every other statement here. */
const db = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => db.current }));

function ledger(over: Partial<Ledger> = {}): Ledger {
  return { ...EMPTY_LEDGER, ...over };
}

function record(missionId: string, xpEarned: number, score = 100) {
  return {
    missionId,
    completedAt: "2026-07-21T10:00:00.000Z",
    completedOn: "2026-07-21",
    score,
    xpEarned,
    durationMs: 1000,
    hintsUsed: 0,
    resolved: true,
    attempts: 1,
  };
}

describe("creditBetween", () => {
  it("reports what a first completion added", () => {
    const before = EMPTY_LEDGER;
    const after = ledger({
      totalXp: 80,
      skillXp: { "event-loop": 80, "worker-threads": 32 },
      missions: { "event-loop-overload": record("event-loop-overload", 80) },
    });

    expect(creditBetween(before, after, "event-loop-overload")).toEqual({
      xpAdded: 80,
      skillXpAdded: { "event-loop": 80, "worker-threads": 32 },
      firstCompletion: true,
    });
  });

  it("credits only the difference when a replay beats the previous run", () => {
    const before = ledger({
      totalXp: 40,
      skillXp: { "event-loop": 40 },
      missions: { "event-loop-overload": record("event-loop-overload", 40, 50) },
    });
    const after = ledger({
      totalXp: 80,
      skillXp: { "event-loop": 80 },
      missions: { "event-loop-overload": record("event-loop-overload", 80) },
    });

    const credit = creditBetween(before, after, "event-loop-overload");
    expect(credit.xpAdded).toBe(40);
    expect(credit.skillXpAdded).toEqual({ "event-loop": 40 });
    // Already completed, so this is an improvement rather than a first clear.
    expect(credit.firstCompletion).toBe(false);
  });

  /**
   * The property that makes a refresh worthless: because the ledger derives
   * from the *best* run, a worse replay changes nothing, and the diff says so
   * without the client knowing the best-run rule at all.
   */
  it("credits nothing for a replay that didn't beat the previous run", () => {
    const settled = ledger({
      totalXp: 80,
      skillXp: { "event-loop": 80 },
      missions: { "event-loop-overload": record("event-loop-overload", 80) },
    });

    expect(creditBetween(settled, settled, "event-loop-overload")).toEqual({
      xpAdded: 0,
      skillXpAdded: {},
      firstCompletion: false,
    });
  });

  it("never reports a negative award", () => {
    const before = ledger({ totalXp: 100, skillXp: { "event-loop": 100 } });
    const after = ledger({ totalXp: 80, skillXp: { "event-loop": 80 } });

    const credit = creditBetween(before, after, "event-loop-overload");
    expect(credit.xpAdded).toBe(0);
    expect(credit.skillXpAdded).toEqual({});
  });
});

describe("parseLocalDate", () => {
  const now = new Date("2026-07-21T12:00:00.000Z");

  it("accepts the player's own date on either side of the server's", () => {
    for (const day of ["2026-07-20", "2026-07-21", "2026-07-22"]) {
      expect(parseLocalDate(day, now)).toBe(day);
    }
  });

  /**
   * The bound is the whole point: a timezone can move "today" by a day, so a
   * day either side is legitimate and anything further is not. A forged date
   * cannot backdate a streak — it falls back to the server's own.
   */
  it("discards a date no timezone could justify", () => {
    for (const forged of ["2026-07-01", "2026-08-30", "1999-01-01", "2030-01-01"]) {
      expect(parseLocalDate(forged, now)).toBe("2026-07-21");
    }
  });

  it("falls back to the server's date for anything malformed", () => {
    for (const bad of [undefined, null, "", "today", "2026-7-1", 20260721, {}]) {
      expect(parseLocalDate(bad, now)).toBe("2026-07-21");
    }
  });

  it("handles a month boundary", () => {
    const eve = new Date("2026-08-01T00:30:00.000Z");
    expect(parseLocalDate("2026-07-31", eve)).toBe("2026-07-31");
  });
});

describe("coerceLedger", () => {
  it("accepts a ledger the server sent", () => {
    const wire = {
      version: 2,
      totalXp: 999,
      skillXp: { "event-loop": 80 },
      missions: { "event-loop-overload": record("event-loop-overload", 80) },
      activeDays: ["2026-07-21"],
      achievements: { "first-mission": "2026-07-21T10:00:00.000Z" },
    };

    const parsed = coerceLedger(wire);
    expect(parsed.missions["event-loop-overload"].xpEarned).toBe(80);
    expect(parsed.activeDays).toEqual(["2026-07-21"]);
    expect(parsed.achievements["first-mission"]).toBeTruthy();
    // Recomputed from the records rather than trusted, exactly as for storage:
    // a wire value that disagrees with the runs behind it loses.
    expect(parsed.totalXp).toBe(80);
  });

  it("rejects anything that isn't a version-2 ledger", () => {
    for (const bad of [null, undefined, 42, "ledger", [], { version: 1 }, {}]) {
      expect(coerceLedger(bad)).toEqual(EMPTY_LEDGER);
    }
  });
});

/* ========================================================================== *
 *  The reset tombstone, at the level that assembles the ledger — §12 item 7
 * ========================================================================== */

type Row = Record<string, unknown>;

/**
 * A stand-in for `best_runs`, applying migration 0004's rule in TypeScript.
 *
 * **What this does and does not prove.** It models the view: best run per
 * mission, over runs strictly after the tombstone, with `attempts` counted the
 * same way. That is enough to check what `ledgerFor()` does with the result —
 * which is the point of this block — but it is *not* a test of the SQL. Nobody
 * should read a green here as evidence that the real view filters. That is
 * tested by `e2e/authenticated.spec.ts` against the real database, which is the
 * only place it can be.
 */
function bestRuns(runs: Row[], resetAt: string | null): Row[] {
  const live = runs.filter(
    (r) => resetAt === null || Date.parse(r.completed_at as string) > Date.parse(resetAt),
  );

  const byMission = new Map<string, Row>();
  for (const run of live) {
    const id = run.mission_id as string;
    const held = byMission.get(id);
    if (!held || (run.score as number) > (held.score as number)) byMission.set(id, run);
  }

  return [...byMission.values()].map((run) => ({
    ...run,
    attempts: live.filter((r) => r.mission_id === run.mission_id).length,
  }));
}

/**
 * The four reads `ledgerFor()` makes, answered from plain arrays.
 *
 * `select`/`eq` are chainable no-ops and the builder is thenable, which is the
 * whole surface `ledgerFor()` touches. Column lists are ignored: the rows are
 * shaped correctly at the call site instead, so a test never passes because the
 * stand-in was lenient about a name.
 */
function fakeDb(tables: Record<string, Row[]>, failing: string[] = []) {
  return {
    from(table: string) {
      const fails = failing.includes(table);
      const rows = tables[table] ?? [];
      const listed = fails
        ? { data: null, error: { message: `${table} read failed` } }
        : { data: rows, error: null };

      const builder = {
        select: (..._columns: unknown[]) => builder,
        eq: (..._filter: unknown[]) => builder,
        single: () =>
          Promise.resolve(
            fails
              ? listed
              : rows[0]
                ? { data: rows[0], error: null }
                : { data: null, error: { message: "no rows" } },
          ),
        then: <T>(
          onFulfilled: (value: typeof listed) => T,
          onRejected?: (reason: unknown) => T,
        ) => Promise.resolve(listed).then(onFulfilled, onRejected),
      };
      return builder;
    },
  };
}

const PLAYER = "00000000-0000-0000-0000-000000000001";

/** One recorded run. `completed_at` is the server's clock, which the filter uses. */
function run(missionId: string, at: string, over: Row = {}): Row {
  return {
    mission_id: missionId,
    score: 100,
    xp_earned: 80,
    resolved: true,
    skill_xp: { "event-loop": 80 },
    duration_ms: 600_000,
    hints_used: 0,
    completed_at: at,
    completed_on: at.slice(0, 10),
    ...over,
  };
}

/** Installs a database holding `runs`, with the tombstone applied everywhere. */
function install(runs: Row[], resetAt: string | null, extra: Partial<Record<string, Row[]>> = {}) {
  db.current = fakeDb({
    mission_runs: runs,
    best_runs: bestRuns(runs, resetAt),
    player_active_days: extra.player_active_days ?? [],
    player_achievements: extra.player_achievements ?? [],
    players: [{ reset_at: resetAt }],
  });
}

describe("ledgerFor and the reset tombstone", () => {
  const RESET = "2026-07-30T14:00:00.000Z";

  const earned = [
    run("event-loop-overload", "2026-07-20T10:00:00.000Z"),
    run("async-map-trap", "2026-07-21T10:00:00.000Z", {
      xp_earned: 70,
      skill_xp: { "async-patterns": 70 },
    }),
  ];

  it("reads a full ledger for a player who has never reset", async () => {
    // The control. Without it, a test asserting zero after a reset would pass
    // just as well against a stand-in that never returns anything at all.
    install(earned, null, {
      player_active_days: [{ day: "2026-07-20" }, { day: "2026-07-21" }],
      player_achievements: [
        { achievement_id: "first-mission", unlocked_at: "2026-07-20T10:00:00.000Z" },
      ],
    });

    const ledger = await ledgerFor(PLAYER);

    expect(ledger.totalXp).toBe(150);
    expect(Object.keys(ledger.missions).sort()).toEqual([
      "async-map-trap",
      "event-loop-overload",
    ]);
    expect(ledger.activeDays).toEqual(["2026-07-20", "2026-07-21"]);
    expect(ledger.achievements["first-mission"]).toBeTruthy();
  });

  /**
   * The claim the whole feature rests on: the ledger reads as a new player's
   * while every run is still recorded. A delete would produce the same first
   * half and lose the second, which is why the second half is asserted here at
   * all — `mission_runs` is read back untouched.
   */
  it("reads as zero while the runs themselves still exist", async () => {
    install(earned, RESET, {
      player_active_days: [{ day: "2026-07-20" }, { day: "2026-07-21" }],
      player_achievements: [
        { achievement_id: "first-mission", unlocked_at: "2026-07-20T10:00:00.000Z" },
      ],
    });

    const ledger = await ledgerFor(PLAYER);

    expect(ledger.totalXp).toBe(0);
    expect(ledger.missions).toEqual({});
    expect(ledger.skillXp).toEqual({});
    expect(ledger.activeDays).toEqual([]);
    expect(ledger.achievements).toEqual({});

    // Nothing left the table. This is the difference between a tombstone and a
    // delete, and it is the reason append-only survives a reset at all.
    const recorded = db.current as ReturnType<typeof fakeDb>;
    const { data } = await recorded.from("mission_runs").select("*").eq();
    expect(data).toEqual(earned);
  });

  it("counts a run recorded after the reset, and only that one", async () => {
    install([...earned, run("event-loop-overload", "2026-07-30T15:00:00.000Z", { score: 60, xp_earned: 48 })], RESET);

    const ledger = await ledgerFor(PLAYER);

    expect(ledger.totalXp).toBe(48);
    expect(Object.keys(ledger.missions)).toEqual(["event-loop-overload"]);
    // Not 2. The pre-reset attempt is invisible to the player, so the count
    // beside the mission describes the history they can actually see.
    expect(ledger.missions["event-loop-overload"].attempts).toBe(1);
  });

  /**
   * `best_runs` cannot reach the active days or the achievement stamps, so
   * `ledgerFor()` filters both itself. That filtering is what these two assert,
   * and it is the part `tests/reset.test.ts` cannot see.
   */
  it("keeps the visit history but counts the streak from the reset day", async () => {
    install([], RESET, {
      player_active_days: [
        { day: "2026-07-28" },
        { day: "2026-07-29" },
        { day: "2026-07-30" }, // The reset day itself — they were here.
        { day: "2026-07-31" },
      ],
    });

    expect((await ledgerFor(PLAYER)).activeDays).toEqual(["2026-07-30", "2026-07-31"]);
  });

  it("drops an achievement stamped before the reset and keeps one stamped after", async () => {
    // The route deletes these outright; this is the belt-and-braces path, for a
    // reset whose second write failed. A stamp the ledger no longer supports
    // would show as unlocked on a page deriving from zero XP.
    install([], RESET, {
      player_achievements: [
        { achievement_id: "first-mission", unlocked_at: "2026-07-20T10:00:00.000Z" },
        { achievement_id: "perfect-diagnosis", unlocked_at: "2026-07-30T16:00:00.000Z" },
      ],
    });

    const ledger = await ledgerFor(PLAYER);
    expect(Object.keys(ledger.achievements)).toEqual(["perfect-diagnosis"]);
  });

  /**
   * The direction the failure has to fall. This exact read fails on any deploy
   * where 0004 has not been applied — the column is simply not there — and
   * blanking a player's progress because of it would be far worse than showing
   * progress a reset should have hidden.
   */
  it("treats a failed reset_at read as 'never reset' rather than as zero", async () => {
    db.current = fakeDb(
      {
        best_runs: bestRuns(earned, null),
        player_active_days: [{ day: "2026-07-20" }],
        player_achievements: [],
        players: [{ reset_at: RESET }],
      },
      ["players"],
    );

    const ledger = await ledgerFor(PLAYER);
    expect(ledger.totalXp).toBe(150);
    expect(ledger.activeDays).toEqual(["2026-07-20"]);
  });

  /** The three reads that carry earned progress fail loudly instead. */
  it("throws rather than reporting an empty ledger when a run read fails", async () => {
    db.current = fakeDb(
      {
        best_runs: [],
        player_active_days: [],
        player_achievements: [],
        players: [{ reset_at: null }],
      },
      ["best_runs"],
    );

    await expect(ledgerFor(PLAYER)).rejects.toThrow("ledger_read_failed");
  });
});
