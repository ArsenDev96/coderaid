import { expect, test } from "@playwright/test";

/**
 * One mission, played through the real UI.
 *
 * `tests/mission-flows-all.test.ts` already drives every mission's rules
 * directly. What it cannot show is that the browser wiring holds: that the
 * stage CTAs unlock in order, that evidence marked in one panel survives the
 * navigation to the next stage, and that the client-side guard actually stops
 * a directly typed results URL from crediting a run.
 *
 * `event-loop-overload` is the first mission a new player is recommended, so
 * it is the path most likely to be walked.
 */

const MISSION = "event-loop-overload";

test("blocks the results screen before the mission has been played", async ({
  page,
}) => {
  await page.goto(`/missions/${MISSION}/results`);

  // The guard renders after mount, once localStorage can be read.
  await expect(page.getByRole("heading", { name: "Not there yet" })).toBeVisible();
  await expect(page.getByText(/Run verification before collecting your results/i)).toBeVisible();

  // And it offers the way back rather than a dead end.
  await expect(
    page.getByRole("link", { name: "Back to Verification" }),
  ).toBeVisible();

  // Nothing was credited: no ledger entry exists for this mission.
  const ledger = await page.evaluate(() =>
    window.localStorage.getItem("coderaid:player:progress"),
  );
  expect(ledger === null || !ledger.includes(MISSION)).toBe(true);
});

test("plays the event loop incident up to the grading boundary", async ({
  page,
}) => {
  /* ---------------------------- Briefing ---------------------------- */
  await page.goto(`/missions/${MISSION}/briefing`);
  await expect(
    page.getByRole("heading", { name: /Event Loop Overload/i }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Start Investigation" }).click();

  /* -------------------------- Investigation ------------------------- */
  await expect(page).toHaveURL(new RegExp(`/missions/${MISSION}/investigation$`));

  // The exit stays disabled until enough key clues are collected.
  await expect(
    page.getByRole("button", { name: /Continue to Diagnosis/ }),
  ).toBeDisabled();

  // Logs: a delayed unrelated endpoint — the clue that the whole API is affected.
  await page.getByRole("button", { name: /\/api\/products/ }).click();
  await page.getByRole("button", { name: "Mark as Evidence" }).click();

  // Metrics: event-loop lag and CPU saturation.
  await page.getByRole("tab", { name: "Metrics" }).click();
  await page.getByRole("button", { name: /Event-loop lag p95/ }).click();
  await page.getByRole("button", { name: /App CPU usage/ }).click();
  await page.getByRole("button", { name: "Mark as Evidence" }).click();

  // Three key clues collected, so the stage unlocks.
  const toDiagnosis = page.getByRole("link", { name: /Continue to Diagnosis/ });
  await expect(toDiagnosis).toBeVisible();
  await toDiagnosis.click();

  /* ---------------------------- Diagnosis --------------------------- */
  await expect(page).toHaveURL(new RegExp(`/missions/${MISSION}/diagnosis$`));

  await page
    .getByRole("radio", { name: /Synchronous CPU work blocks the event loop/ })
    .click();
  // Every finding that supports the cause — a partial case scores below 100.
  for (const evidence of [
    /Event-loop lag spiked to 6\.8s/,
    /CPU jumped from 31% to 96%/,
    /Report aggregation takes/,
    /Unrelated endpoints respond seconds late/,
    /The database stays healthy/,
  ]) {
    await page.getByRole("checkbox", { name: evidence }).click();
  }

  const toFix = page.getByRole("link", { name: /Confirm Diagnosis|Continue to Fix/ });
  await expect(toFix).toBeVisible();
  await toFix.click();

  /* ------------------------------- Fix ------------------------------ */
  await expect(page).toHaveURL(new RegExp(`/missions/${MISSION}/fix$`));

  await page
    .getByRole("radio", { name: /Generate the report in a worker thread/ })
    .click();
  await page.getByRole("link", { name: /Apply Fix/ }).click();

  /* -------------------------- Verification -------------------------- */
  await expect(page).toHaveURL(new RegExp(`/missions/${MISSION}/verification$`));

  await expect(
    page.getByRole("button", { name: /Continue to Results/ }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Run Verification" }).click();

  /* ------------------- Grading requires an account ------------------ */
  // Everything above is free to play. Running verification submits the run for
  // grading, and grading is server-side — so a signed-out player is asked to
  // sign in here rather than being handed a score the browser made up.
  await expect(
    page.getByRole("link", { name: /Sign in with GitHub/ }),
  ).toBeVisible({ timeout: 15_000 });

  // No grade was cached and no result screen is reachable...
  const cached = await page.evaluate(
    (mission) => window.localStorage.getItem(`coderaid:${mission}:grade`),
    MISSION,
  );
  expect(cached).toBeNull();

  // ...and the run itself is preserved, so signing in loses no work.
  const run = await page.evaluate(
    (mission) => window.localStorage.getItem(`coderaid:${mission}:run`),
    MISSION,
  );
  expect(run).not.toBeNull();

  // Nothing was credited to the ledger for an ungraded run.
  const ledger = await page.evaluate(() =>
    window.localStorage.getItem("coderaid:player:progress"),
  );
  expect(ledger === null || !JSON.parse(ledger).missions[MISSION]).toBeTruthy();
});
