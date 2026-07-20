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

test("plays the event loop incident from briefing to results", async ({ page }) => {
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

  const toResults = page.getByRole("link", { name: /Continue to Results/ });
  await expect(toResults).toBeVisible({ timeout: 15_000 });
  await toResults.click();

  /* ----------------------------- Results ---------------------------- */
  await expect(page).toHaveURL(new RegExp(`/missions/${MISSION}/results$`));

  // The results screen renders rather than the guard.
  await expect(page.getByRole("heading", { name: "Not there yet" })).toHaveCount(0);
  // A correct run scores 100 and is reported as resolved.
  await expect(page.getByText("100 / 100").first()).toBeVisible();
  await expect(page.getByText("Incident Resolved").first()).toBeVisible();

  // And the run was really credited to the ledger, with the mission's full XP.
  const ledger = await page.evaluate(() => {
    const raw = window.localStorage.getItem("coderaid:player:progress");
    return raw ? (JSON.parse(raw) as { totalXp: number; missions: Record<string, { score: number; resolved: boolean }> }) : null;
  });
  expect(ledger).not.toBeNull();
  expect(ledger!.missions[MISSION]?.score).toBe(100);
  expect(ledger!.missions[MISSION]?.resolved).toBe(true);
  expect(ledger!.totalXp).toBe(80);
});
