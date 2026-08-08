import { test as base } from "@playwright/test";
import { REPLAY_LIMIT } from "../lib/replay-limit";
import { credentialsMissing, expect, test } from "./support/fixtures";
import {
  MISSION,
  gradeOf,
  playToVerification,
  resetMissionState,
  runVerification,
  submitRunDirectly,
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
    credentialsMissing(),
    "needs the Supabase keys; skipped locally without them, red in CI.",
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

  test("withholds the component breakdown from a run that beat nothing", async ({
    page,
  }) => {
    // §12 item 19. The endpoint grades and records every submission, and that
    // was argued to be enough to stop it being an answer oracle. It is not:
    // nothing rate-limits it and a wrong guess is free, so what matters is how
    // much each response gives away. `rootCauseCorrect` and the evidence counts
    // name WHICH component was right, which is what lets the three answers be
    // searched one at a time instead of as a product.

    // A first run has nothing to beat, so it is fully disclosed — the honest
    // player still gets their working shown.
    await playToVerification(page, "perfect");
    const first = gradeOf(await runVerification(page));

    expect(first.detailed).toBe(true);
    expect(first).toHaveProperty("rootCauseCorrect");
    expect(first).toHaveProperty("breakdown");

    // Now a worse attempt. It is still graded, still recorded, and still tells
    // the player what they scored and whether the incident resolved — but the
    // per-component detail is gone.
    await resetMissionState(page, MISSION);
    await playToVerification(page, "poor");
    const replay = gradeOf(await runVerification(page));

    expect(replay.detailed).toBe(false);
    expect(typeof replay.score).toBe("number");
    expect(typeof replay.resolved).toBe("boolean");

    // Absent, not falsified. A `false` would answer the enumerator's question
    // just as well as a `true` does.
    for (const field of [
      "rootCauseCorrect",
      "fixCorrect",
      "evidenceHits",
      "evidenceTotal",
      "evidenceMisses",
      "breakdown",
    ]) {
      expect(
        Object.prototype.hasOwnProperty.call(replay, field),
        `${field} reached a caller whose run beat nothing`,
      ).toBe(false);
    }
  });

  test("stops disclosing anything at all past the replay limit", async ({
    page,
  }) => {
    // The other half of §12 item 19, and the half disclosure could not reach.
    // `resolved` has to be sent on an ordinary run — the verification report is
    // rendered from it — so the fix answer leaks one bit per attempt. What makes
    // that cheap is that attempts are unbounded, so the limit is the closure.
    //
    // Submitted straight to the API: this is exactly the enumeration pattern the
    // limit exists to slow, and driving the UI nine times would test the stage
    // components again rather than the policy.
    await page.goto(`/missions/${MISSION}/briefing`);

    const responses = [];
    for (let i = 0; i < REPLAY_LIMIT + 1; i += 1) {
      responses.push(await submitRunDirectly(page, MISSION));
    }

    // The first eight are answered normally — a genuine player replaying hard
    // must not be cut off.
    for (const [i, response] of responses.slice(0, REPLAY_LIMIT).entries()) {
      expect(response.limited, `attempt ${i + 1} was limited too early`).toBeUndefined();
      expect(typeof response.grade?.resolved).toBe("boolean");
    }

    // The ninth is accepted, recorded, and answered with nothing.
    const ninth = responses[REPLAY_LIMIT];
    expect(ninth.limited?.limited).toBe(true);
    expect(ninth.limited?.attempts).toBe(REPLAY_LIMIT);
    expect(ninth.limited?.limit).toBe(REPLAY_LIMIT);

    // The whole point: no verdict, no score, and no ledger to read one out of.
    // `ledger.missions[missionId]` carries the best run's `resolved` and `score`,
    // so leaving it in would hand over exactly what the withholding protects.
    for (const field of ["grade", "ledger", "credit"]) {
      expect(
        Object.prototype.hasOwnProperty.call(ninth, field),
        `${field} was disclosed past the replay limit`,
      ).toBe(false);
    }
  });

  test("still records the run it declined to report on", async ({
    page,
    player,
  }) => {
    // Record-but-disclose-nothing, not reject. The append-only history has to
    // stay complete — it is what makes the limit self-enforcing on the next
    // attempt, and a rejected run would be a hole in the player's own history.
    await page.goto(`/missions/${MISSION}/briefing`);
    for (let i = 0; i < REPLAY_LIMIT + 1; i += 1) {
      await submitRunDirectly(page, MISSION);
    }

    const rows = await selectRows<RunRow>(
      "mission_runs",
      `player_id=eq.${player.id}&mission_id=eq.${MISSION}`,
    );
    expect(rows.length).toBe(REPLAY_LIMIT + 1);
  });

  test("starts a genuinely fresh attempt from Run It Again", async ({
    page,
    player,
  }) => {
    // "Run It Again" used to be a plain link to the briefing. The second
    // attempt therefore opened on the first one's evidence, its confirmed
    // diagnosis, its applied fix and its still-running clock — a navigation
    // rather than a replay. Only an unresolved run offers the action, so this
    // plays badly on purpose.
    await playToVerification(page, "poor");
    await runVerification(page);
    await page.getByRole("link", { name: /Continue to Results/ }).click();
    await expect(page).toHaveURL(new RegExp(`/missions/${MISSION}/results$`));

    const before = await page.evaluate(
      (m) => window.localStorage.getItem(`coderaid:${m}:run`),
      MISSION,
    );
    expect(before).not.toBeNull();

    await page.getByRole("button", { name: "Run It Again" }).click();
    await expect(page).toHaveURL(new RegExp(`/missions/${MISSION}/briefing$`));

    // Every local slot this mission owns is gone.
    const leftover = await page.evaluate((m) => {
      const prefix = `coderaid:${m}:`;
      return Object.keys(window.localStorage).filter((k) => k.startsWith(prefix));
    }, MISSION);
    expect(leftover).toEqual([]);

    // So the investigation opens blank — nothing restored, nothing to explain.
    await page.getByRole("link", { name: "Start Investigation" }).click();
    await expect(page.getByText(/Investigation progress restored/)).toBeHidden();
    await expect(page.getByText(/Nothing collected yet/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Continue to Diagnosis/ }),
    ).toBeDisabled();

    // And the recorded attempt is untouched: a replay adds a run, it does not
    // erase one. That is the half of "restart" the browser may never do.
    const runs = await selectRows<RunRow>(
      "mission_runs",
      `player_id=eq.${player.id}&select=score`,
    );
    expect(runs).toHaveLength(1);
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

  /**
   * Logging out actually ends the session.
   *
   * This is the regression test for a live defect: the sidebar rendered Log out
   * as `<Link href="/">`, which navigated home and left the session completely
   * intact. The page looked signed out — the dashboard is behind a client
   * redirect — while the cookie, and every endpoint it opened, stayed live.
   *
   * So the assertion is deliberately *not* "the UI changed". It is that the
   * server stops answering: `/api/ledger` is the endpoint the old bug left wide
   * open, and it is the one checked here.
   */
  test("ends the session when the player logs out", async ({ page }) => {
    // The session is live before we touch anything, or the rest proves nothing.
    expect((await page.request.get("/api/ledger")).status()).toBe(200);

    await page.goto("/dashboard");

    const logOut = page.getByRole("button", { name: "Log out" });
    await expect(logOut).toBeVisible();

    // The route answers 303 to `/`; a form POST follows it as a navigation.
    await Promise.all([page.waitForURL("**/"), logOut.click()]);

    // The actual claim: the cookie no longer opens anything.
    expect((await page.request.get("/api/ledger")).status()).toBe(401);
    expect((await page.request.get("/api/leaderboard")).status()).toBe(401);
  });

  /**
   * The stale-verdict regression.
   *
   * A player submitted the `Promise.resolve()` fix — which does not move the
   * work off the thread — got an unresolved verification, went back to Fix and
   * applied the worker-thread fix. Verification kept showing the **old
   * unresolved result**: the cached grade, credit, verification and results
   * state all still described the abandoned fix, and nothing tied a cached
   * grade to the submission that produced it.
   *
   * `tests/stale-verdict.test.ts` covers the storage rules. This covers the
   * thing only a browser can: that the screen a player actually looks at shows
   * the new verdict, and that both attempts survive as real server runs.
   */
  test("does not show the old verdict after changing to the correct fix", async ({
    page,
    player,
  }) => {
    // The headline value on the Event Loop Lag card. Targeted precisely rather
    // than by card text, because the card also carries "was 6.8s" in *both*
    // states — an assertion that matched it would pass either way.
    const lagValue = page
      .getByRole("listitem")
      .filter({ hasText: "Event Loop Lag (p95)" })
      .locator("p")
      .first();

    /* 1–2 — play the mission and submit the Promise.resolve fix. */
    await playToVerification(page, "perfect");
    await page.goto(`/missions/${MISSION}/fix`);
    await page.getByRole("radio", { name: /Wrap buildWeeklyReport\(\) in Promise\.resolve\(\)/ }).click();
    await page.getByRole("link", { name: /Apply Fix/ }).click();
    await runVerification(page);

    /* 3 — unresolved: the metrics hold at their "before" values, and the
       checks that depend on the fix are red. */
    await expect(page.getByText("Continue to Results")).toBeVisible();
    // The unresolved report holds every metric at its "before" value.
    await expect(lagValue).toHaveText("6.8s");

    const firstRuns = await selectRows<RunRow>(
      "mission_runs",
      `player_id=eq.${player.id}&select=resolved,score`,
    );
    expect(firstRuns).toHaveLength(1);
    expect(firstRuns[0].resolved).toBe(false);

    /* 4–6 — back to Fix, select the worker-thread option, apply it. */
    await page.goto(`/missions/${MISSION}/fix`);
    await page.getByRole("radio", { name: /Generate the report in a worker thread/ }).click();

    // The moment the bug produced: the old verdict must already be gone.
    const cached = await page.evaluate(
      (id) => window.localStorage.getItem(`coderaid:${id}:grade`),
      MISSION,
    );
    expect(cached).toBeNull();

    await page.getByRole("link", { name: /Apply Fix/ }).click();
    await expect(page).toHaveURL(new RegExp(`/missions/${MISSION}/verification$`));

    // Verification asks for a new run instead of restoring the failed one.
    await expect(page.getByRole("button", { name: "Run Verification" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Continue to Results/ }),
    ).toHaveCount(0);

    /* 7–9 — run it again: the lag improves and the checks go green. */
    await runVerification(page);
    await expect(page.getByRole("link", { name: /Continue to Results/ })).toBeVisible({
      timeout: 20_000,
    });
    await expect(lagValue).toHaveText("35ms");
    await expect(page.getByText("Event-loop lag is back to normal")).toBeVisible();
    await expect(page.getByText("Unrelated endpoints stay responsive")).toBeVisible();

    // A refresh shows the latest verdict, not the first one.
    await page.reload();
    await expect(lagValue).toHaveText("35ms");

    /* Both attempts remain real server runs — the client fix never touches
       history — and the best one is what counts. */
    const runs = await selectRows<RunRow>(
      "mission_runs",
      `player_id=eq.${player.id}&select=resolved,score&order=score.asc`,
    );
    expect(runs).toHaveLength(2);
    expect(runs.map((r) => r.resolved)).toEqual([false, true]);

    const ledger = await page.request.get("/api/ledger");
    const body = (await ledger.json()) as {
      ledger: { missions: Record<string, { attempts: number; resolved: boolean }> };
    };
    expect(body.ledger.missions[MISSION].attempts).toBe(2);
    expect(body.ledger.missions[MISSION].resolved).toBe(true);
  });

  /* ---------------------------------------------------------------------- *
   *  Starting over — §12 item 7, a tombstone rather than a delete
   * ---------------------------------------------------------------------- */

  /**
   * The round trip, and the only place the SQL half of the feature is tested.
   *
   * `tests/reset.test.ts` pins what a date means and
   * `tests/ledger-derivation.test.ts` pins which columns that is applied to,
   * but both run against a stand-in. Whether `best_runs` *actually* filters on
   * `players.reset_at` is a fact about migration 0004 in the live project, and
   * nothing but a real database can answer it. This spec fails on a deploy
   * where 0004 has not been applied — deliberately, and the same way
   * `view-privileges.spec.ts` fails without 0003.
   */
  test("zeroes the ledger without deleting a single run", async ({
    page,
    player,
  }) => {
    await playToVerification(page, "perfect");
    await runVerification(page);

    // Real, earned progress first — a reset that zeroes an already-empty
    // account would pass this test while doing nothing at all.
    const earned = (await (await page.request.get("/api/ledger")).json()) as {
      ledger: { totalXp: number; missions: Record<string, unknown> };
    };
    expect(earned.ledger.totalXp).toBe(80);
    expect(Object.keys(earned.ledger.missions)).toEqual([MISSION]);

    const stamps = await selectRows<{ achievement_id: string }>(
      "player_achievements",
      `player_id=eq.${player.id}&select=achievement_id`,
    );
    expect(stamps.length).toBeGreaterThan(0);

    /* ------------------------------ the reset ----------------------------- */
    const reset = await page.request.post("/api/reset");
    expect(reset.status()).toBe(200);

    // The response carries the resulting ledger so the client can adopt it
    // without a second round trip; it must be the zero one.
    const body = (await reset.json()) as {
      ledger?: { totalXp: number; missions: Record<string, unknown> };
      resetAt: string;
    };
    expect(body.resetAt).toBeTruthy();
    expect(body.ledger?.totalXp).toBe(0);

    // And a fresh read agrees — the tombstone is in the database, not in a
    // response the route happened to construct.
    const after = (await (await page.request.get("/api/ledger")).json()) as {
      ledger: {
        totalXp: number;
        missions: Record<string, unknown>;
        skillXp: Record<string, number>;
        activeDays: string[];
        achievements: Record<string, string>;
      };
    };
    expect(after.ledger.totalXp).toBe(0);
    expect(after.ledger.missions).toEqual({});
    expect(after.ledger.skillXp).toEqual({});
    expect(after.ledger.achievements).toEqual({});
    // The reset day itself still counts: the player was genuinely here today.
    expect(after.ledger.activeDays.length).toBeLessThanOrEqual(1);

    /* --------------------- what a delete would have lost ------------------ */
    // The whole reason this is a tombstone. `mission_runs` is untouched, and
    // the row still carries everything it was recorded with.
    const runs = await selectRows<RunRow>(
      "mission_runs",
      `player_id=eq.${player.id}&select=*`,
    );
    expect(runs).toHaveLength(1);
    expect(runs[0].mission_id).toBe(MISSION);
    expect(runs[0].score).toBe(100);
    expect(runs[0].xp_earned).toBe(80);

    // The tombstone is a real column value, and it is what the view filters on.
    const players = await selectRows<{ reset_at: string | null }>(
      "players",
      `id=eq.${player.id}&select=reset_at`,
    );
    expect(players[0].reset_at).not.toBeNull();

    // Achievement stamps are deleted rather than filtered — an unlock time is a
    // derived conclusion, and one the ledger no longer supports is a second
    // source of truth (§4 principle 12).
    expect(
      await selectRows("player_achievements", `player_id=eq.${player.id}&select=achievement_id`),
    ).toHaveLength(0);

    // The leaderboard derives from the same view, so it goes to zero with the
    // ledger rather than continuing to rank a reset player on old runs.
    const { standings } = (await (
      await page.request.get("/api/leaderboard")
    ).json()) as { standings: Array<{ id: string; xp: { all: number } }> };
    const mine = standings.find((row) => row.id === player.id);
    expect(mine?.xp.all ?? 0).toBe(0);
  });

  /**
   * The invariant most likely to be broken by a later hand.
   *
   * The replay limit counts raw `mission_runs` rows, unfiltered by the
   * tombstone, and that is exactly what stops Reset Progress being a rate-limit
   * bypass. Anyone who later "tidies up" by making the limit read `best_runs`,
   * or by having the reset delete rows after all, hands a free set of attempts
   * to every enumerator for the cost of one POST.
   */
  test("does not refill the replay limit", async ({ page }) => {
    await page.goto(`/missions/${MISSION}/briefing`);

    for (let i = 0; i < REPLAY_LIMIT; i += 1) {
      await submitRunDirectly(page, MISSION);
    }

    // The limit is genuinely reached before the reset, or the assertion after
    // it proves nothing.
    const blocked = await submitRunDirectly(page, MISSION);
    expect(blocked.limited?.limited).toBe(true);

    expect((await page.request.post("/api/reset")).status()).toBe(200);

    // Still limited. The window is what frees an attempt up, not a reset.
    const afterReset = await submitRunDirectly(page, MISSION);
    expect(afterReset.limited?.limited).toBe(true);
    expect(afterReset.limited?.attempts).toBeGreaterThanOrEqual(REPLAY_LIMIT);
    for (const field of ["grade", "ledger", "credit"]) {
      expect(
        Object.prototype.hasOwnProperty.call(afterReset, field),
        `${field} was disclosed after a reset past the replay limit`,
      ).toBe(false);
    }
  });

  /**
   * The one-time pre-account import stays one-time. Letting a reset re-open it
   * would make a control that says "start over" into a way of granting yourself
   * a fresh claim, repeatedly.
   */
  test("does not re-open the one-time claim", async ({ page, player }) => {
    const claim = await page.request.post("/api/claim", {
      data: { ledger: { missions: { [MISSION]: { score: 100, resolved: true } } } },
    });
    expect(claim.status()).toBe(200);

    expect((await page.request.post("/api/reset")).status()).toBe(200);

    // Asserted on the column, not only on the 409. §16.4 guards the one-time
    // rule twice — `players.claimed_at` *and* a partial unique index on
    // `(player_id, mission_id) where source = 'claimed'` — so a reset that
    // cleared the flag would still be refused by the index, and a spec that
    // checked only the status code would pass while the decision was reversed.
    // Verified by mutation: nulling `claimed_at` in the reset route leaves the
    // 409 intact and fails only this line.
    const players = await selectRows<{ claimed_at: string | null }>(
      "players",
      `id=eq.${player.id}&select=claimed_at`,
    );
    expect(players[0].claimed_at).not.toBeNull();

    const again = await page.request.post("/api/claim", {
      data: { ledger: { missions: { [MISSION]: { score: 100, resolved: true } } } },
    });
    expect(again.status()).toBe(409);

    // The refused second claim wrote nothing, and the first one's row survived
    // the reset the same way a graded run does.
    expect(
      await selectRows("mission_runs", `player_id=eq.${player.id}&select=id`),
    ).toHaveLength(1);
  });

  /**
   * The other half: a reset is a starting point, not a wall. A run recorded
   * after the tombstone counts normally, which is what makes the whole thing a
   * reset rather than an account-level ban on earning anything.
   */
  test("counts what the player earns after starting over", async ({ page }) => {
    await playToVerification(page, "perfect");
    await runVerification(page);
    expect((await page.request.post("/api/reset")).status()).toBe(200);

    await resetMissionState(page, MISSION);
    await playToVerification(page, "perfect");
    await runVerification(page);

    const after = (await (await page.request.get("/api/ledger")).json()) as {
      ledger: {
        totalXp: number;
        missions: Record<string, { attempts: number }>;
      };
    };
    expect(after.ledger.totalXp).toBe(80);
    // One, not two. The pre-reset attempt is recorded and invisible, so the
    // count beside the mission describes the history the player can see.
    expect(after.ledger.missions[MISSION].attempts).toBe(1);
  });

  /**
   * The landing page must not invite a signed-in player to sign in.
   *
   * `/` is on the ordinary path for someone with a session — logging out lands
   * there, and the logo links there from every page — but the header rendered a
   * fixed "Sign In" / "Start Your First Mission" pair with no route to the
   * dashboard anywhere on the page. The signed-out half of this is in
   * `landing.spec.ts`; this half needs a real session, so it lives here.
   */
  test("offers the dashboard, not a sign-in, to a player who has one", async ({
    page,
  }) => {
    await page.goto("/");

    // Awaited first: the swap happens once the ledger resolves, so asserting
    // the absence of "Sign In" before that would pass on the loading state.
    await expect(
      page.getByRole("link", { name: "Go to Dashboard" }).first(),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign In" })).toHaveCount(0);

    await page.getByRole("link", { name: "Go to Dashboard" }).first().click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  /**
   * The other half of the same design: sign-out is POST-only *on purpose*,
   * because a GET sign-out lets any page on the internet log the player out
   * with an `<img src="…/auth/sign-out">` tag. `app/auth/sign-out/route.ts`
   * says so in a comment; nothing checked it, and a later hand adding `GET` to
   * "make the link work" would have reintroduced exactly that.
   */
  test("cannot be logged out by a GET", async ({ page }) => {
    const response = await page.request.get("/auth/sign-out", {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(405);

    // The point of the check: the session survived the attempt.
    expect((await page.request.get("/api/ledger")).status()).toBe(200);
  });
});

/**
 * Signed out, on the same endpoints. Uses the un-extended `test`, so no session
 * cookie is ever written into the context.
 */
base.describe("the authenticated path, signed out", () => {
  base.skip(
    credentialsMissing(),
    "needs the Supabase keys; skipped locally without them, red in CI.",
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

    // Nor can anyone stamp a tombstone. The route holds the service-role key
    // and its only bound on *whose* row it writes is the verified session, so
    // the 401 is the whole of that bound rather than a nicety.
    expect((await request.post("/api/reset")).status()).toBe(401);
  });
});
