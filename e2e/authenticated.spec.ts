import { test as base } from "@playwright/test";
import { expect, hasCredentials, test } from "./support/fixtures";
import {
  MISSION,
  playToVerification,
  resetMissionState,
  runVerification,
} from "./support/mission";
import { selectRows } from "./support/session";

/**
 * The server-authoritative path, which the rest of the suite cannot reach.
 *
 * `mission-flow.spec.ts` stops at the sign-in wall by design — that wall is the
 * commit point, and everything that decides what a run is *worth* happens on
 * the far side of it. These specs cross it with a minted session and then check
 * the one thing a UI assertion cannot: what Postgres actually holds afterwards.
 *
 * Each assertion here corresponds to a claim in §16.6 of `docs/CURRENT_STATE.md`
 * that was previously verified by hand and by nothing else.
 */

type RunRow = {
  mission_id: string;
  score: number;
  xp_earned: number;
  resolved: boolean;
  completed_on: string;
  source: string | null;
  skill_xp: Record<string, number>;
};

test.describe("the authenticated path", () => {
  test.skip(
    !hasCredentials(),
    "needs the Supabase keys; skipped where secrets are unavailable.",
  );

  test("serves a ledger from Postgres and leaves localStorage empty", async ({
    page,
    player,
  }) => {
    const response = await page.request.get("/api/ledger");
    expect(response.status()).toBe(200);

    const body = (await response.json()) as {
      ledger: { totalXp: number; missions: Record<string, unknown> };
      claimed: boolean;
    };

    // A brand-new account: real, and empty.
    expect(body.ledger.totalXp).toBe(0);
    expect(Object.keys(body.ledger.missions)).toEqual([]);
    expect(body.claimed).toBe(false);

    // The trigger gave them a players row without any code path running.
    const players = await selectRows("players", `id=eq.${player.id}&select=id`);
    expect(players).toHaveLength(1);
  });

  test("grades a perfect run server-side and records exactly one row", async ({
    page,
    player,
  }) => {
    await playToVerification(page, "perfect");
    await runVerification(page);

    // The results screen is now reachable, and it credits nothing itself.
    await page.getByRole("link", { name: /Continue to Results/ }).click();
    await expect(page).toHaveURL(new RegExp(`/missions/${MISSION}/results$`));

    const runs = await selectRows<RunRow>(
      "mission_runs",
      `player_id=eq.${player.id}&select=*`,
    );
    expect(runs).toHaveLength(1);
    expect(runs[0].mission_id).toBe(MISSION);
    expect(runs[0].score).toBe(100);
    expect(runs[0].xp_earned).toBe(80); // The catalogue's value for this mission.
    expect(runs[0].resolved).toBe(true);
    // A real graded run, not an import.
    expect(runs[0].source).not.toBe("claimed");
    // The reward reached every skill the mission credits, not just its own.
    expect(Object.keys(runs[0].skill_xp).length).toBeGreaterThanOrEqual(5);

    // Achievements are stamped by the server on the crossing.
    const achievements = await selectRows<{ achievement_id: string }>(
      "player_achievements",
      `player_id=eq.${player.id}&select=achievement_id`,
    );
    const ids = achievements.map((a) => a.achievement_id);
    expect(ids).toContain("first-mission");
    expect(ids).toContain("perfect-diagnosis");

    // And the ledger the app reads carries it — with no local ledger at all.
    const ledger = (await (await page.request.get("/api/ledger")).json()) as {
      ledger: { totalXp: number };
    };
    expect(ledger.ledger.totalXp).toBe(80);

    const local = await page.evaluate(() =>
      window.localStorage.getItem("coderaid:player:progress"),
    );
    expect(local).toBeNull();
  });

  test("credits a worse replay nothing and keeps both runs", async ({
    page,
    player,
  }) => {
    await playToVerification(page, "perfect");
    await runVerification(page);

    const afterFirst = (await (await page.request.get("/api/ledger")).json()) as {
      ledger: { totalXp: number };
    };
    expect(afterFirst.ledger.totalXp).toBe(80);

    // Replay the same mission badly. The Postgres runs stay untouched — only
    // the saved stage state is cleared, which is what replaying means here.
    await resetMissionState(page, MISSION);
    await playToVerification(page, "poor");
    await runVerification(page);

    const afterReplay = (await (await page.request.get("/api/ledger")).json()) as {
      ledger: { totalXp: number; missions: Record<string, { attempts: number }> };
    };

    // Best-run-wins is a view over an append-only table, so the worse run adds
    // nothing rather than overwriting the better one.
    expect(afterReplay.ledger.totalXp).toBe(80);
    expect(afterReplay.ledger.missions[MISSION].attempts).toBe(2);

    const runs = await selectRows<RunRow>(
      "mission_runs",
      `player_id=eq.${player.id}&select=score&order=score.desc`,
    );
    expect(runs).toHaveLength(2);
    expect(runs[0].score).toBe(100);
    expect(runs[1].score).toBeLessThan(100);
  });

  test("actually executes the replay and measures the real main thread", async ({
    page,
  }) => {
    // `tests/verification-runtime.test.ts` proves the measurement in Node with
    // an injected runner. This proves the thing that matters to a player: a
    // real Worker, in a real browser, on the real page.
    await playToVerification(page, "perfect");
    await runVerification(page);

    const panel = page.getByRole("region", { name: "Replay measurement" });
    await expect(panel).toBeVisible({ timeout: 30_000 });
    await expect(panel).toContainText("The main thread kept answering");
    await expect(panel).toContainText("12,000 rows");

    // A real number, not a placeholder — and low, because the Worker took it.
    const stall = await panel.getByText(/^\d+ms$/).first().innerText();
    expect(Number.parseInt(stall, 10)).toBeLessThan(120);

    // The same workload with a fix that leaves it on the thread: the browser
    // genuinely stalls, and the panel says so.
    await resetMissionState(page, MISSION);
    await playToVerification(page, "poor");
    await runVerification(page);

    await expect(panel).toBeVisible({ timeout: 30_000 });
    await expect(panel).toContainText("The main thread stopped answering");
    const blocked = await panel.getByText(/^\d+ms$/).first().innerText();
    expect(Number.parseInt(blocked, 10)).toBeGreaterThan(120);
  });

  test("records the browser's local date, not the server's UTC date", async ({
    page,
    player,
  }) => {
    await playToVerification(page, "perfect");
    await runVerification(page);

    const browserToday = await page.evaluate(() => {
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    });

    const runs = await selectRows<RunRow>(
      "mission_runs",
      `player_id=eq.${player.id}&select=completed_on`,
    );
    // The streak counts local days; at UTC+4 a 01:00 run would otherwise be
    // filed under yesterday and silently break a streak the UI showed as intact.
    expect(runs[0].completed_on).toBe(browserToday);
  });

  test("imports a pre-account ledger once, recomputing what it is worth", async ({
    page,
    player,
  }) => {
    const claim = await page.request.post("/api/claim", {
      data: {
        ledger: {
          missions: {
            // Real, playable — and claiming far more XP than it is worth.
            [MISSION]: {
              score: 90,
              resolved: true,
              xpEarned: 9999,
              completedOn: "2026-01-15",
            },
            // Not in the catalogue: dropped rather than failing the claim.
            "not-a-real-mission": { score: 100, resolved: true },
          },
        },
      },
    });

    expect(claim.status()).toBe(200);
    expect(((await claim.json()) as { claimed: number }).claimed).toBe(1);

    const runs = await selectRows<RunRow>(
      "mission_runs",
      `player_id=eq.${player.id}&select=*`,
    );
    expect(runs).toHaveLength(1);
    expect(runs[0].mission_id).toBe(MISSION);
    expect(runs[0].source).toBe("claimed");
    // 90% of the mission's 80 XP — recomputed here, not the 9,999 claimed.
    expect(runs[0].xp_earned).toBe(72);
    // A genuine past date is kept, so the import does not invent a streak.
    expect(runs[0].completed_on).toBe("2026-01-15");

    // The active day derives from the run's own date, not a submitted list.
    const days = await selectRows<{ day: string }>(
      "player_active_days",
      `player_id=eq.${player.id}&select=day`,
    );
    expect(days.map((d) => d.day)).toContain("2026-01-15");

    // Second attempt is refused — the flag is the fast path, the partial unique
    // index is what holds under a double submit.
    const again = await page.request.post("/api/claim", {
      data: { ledger: { missions: { [MISSION]: { score: 100, resolved: true } } } },
    });
    expect(again.status()).toBe(409);
    expect(
      await selectRows("mission_runs", `player_id=eq.${player.id}&select=id`),
    ).toHaveLength(1);
  });

  test("ranks the player on the leaderboard without leaking anything", async ({
    page,
    player,
  }) => {
    await playToVerification(page, "perfect");
    await runVerification(page);

    const response = await page.request.get("/api/leaderboard");
    expect(response.status()).toBe(200);

    const { standings } = (await response.json()) as {
      standings: Array<Record<string, unknown>>;
    };

    const mine = standings.find((row) => row.id === player.id);
    expect(mine).toBeDefined();
    expect(mine!.isCurrentUser).toBe(true);
    // XP is bucketed by period rather than stored as a total; a run completed
    // today counts in all three.
    expect(mine!.xp).toEqual({ week: 80, month: 80, all: 80 });

    // Other players' rows exist but are not marked as this requester.
    for (const row of standings) {
      if (row.id !== player.id) expect(row.isCurrentUser).toBeUndefined();
    }

    // The projection carries what was earned and nothing identifying beyond a
    // display name — no email, and no run detail that would leak an answer.
    const serialised = JSON.stringify(standings);
    expect(serialised).not.toContain(player.email);
    expect(serialised).not.toContain("@example.com");
    for (const leaked of ["root_cause", "rootCauseId", "fix_id", "fixId", "email"]) {
      expect(serialised).not.toContain(leaked);
    }
  });

  test("refuses a run written directly with the player's own token", async ({
    player,
    request,
  }) => {
    // RLS grants SELECT on your own rows and no INSERT at all: the service-role
    // route handlers are the only writer of anything scored.
    const response = await request.post(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/mission_runs`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${(player.session as { access_token: string }).access_token}`,
          "Content-Type": "application/json",
        },
        data: {
          player_id: player.id,
          mission_id: MISSION,
          score: 100,
          xp_earned: 99999,
          resolved: true,
          duration_ms: 1,
          completed_on: "2026-07-22",
        },
      },
    );

    expect(response.status()).toBe(403);
    expect(
      await selectRows("mission_runs", `player_id=eq.${player.id}&select=id`),
    ).toHaveLength(0);
  });
});

/**
 * Signed out, on the same endpoints. Uses the un-extended `test`, so no session
 * cookie is ever written into the context.
 */
base.describe("the authenticated path, signed out", () => {
  base.skip(
    !hasCredentials(),
    "needs the Supabase keys; skipped where secrets are unavailable.",
  );

  base("401s rather than serving an empty ledger or a public board", async ({
    request,
  }) => {
    // These are different facts: the provider falls back to the local ledger on
    // a 401 and would wrongly show zero if "no session" looked like "no progress".
    expect((await request.get("/api/ledger")).status()).toBe(401);

    // The board names other people, and nobody opted into publishing that.
    expect((await request.get("/api/leaderboard")).status()).toBe(401);

    // And nothing can be graded without an account to credit.
    const graded = await request.post("/api/runs", {
      data: { missionId: MISSION, rootCauseId: "x", fixId: "y", fixApplied: true },
    });
    expect(graded.status()).toBe(401);
  });
});
