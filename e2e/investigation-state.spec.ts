import { expect, test } from "@playwright/test";

/**
 * Two things about investigation state that only the browser can show.
 *
 * `tests/investigation-restore-and-replay.test.ts` pins the storage contract —
 * which keys each action clears and keeps. What it cannot show is the part the
 * player actually experiences: that restored evidence is *explained* rather
 * than silently pre-marked, that the way out asks before taking anything away,
 * and that a mission reopened after a restart is genuinely blank.
 */

const MISSION = "event-loop-overload";
const NOTICE = /Investigation progress restored/;

/** The evidence rail, which is where a marked finding has to end up. */
const notebook = (page: import("@playwright/test").Page) =>
  page.getByRole("region", { name: "Collected Evidence" });

/** Collects one finding, so the mission has state to restore on the next visit. */
async function collectOneFinding(page: import("@playwright/test").Page) {
  await page.goto(`/missions/${MISSION}/investigation`);
  await page.getByRole("button", { name: /\/api\/products/ }).click();
  await page.getByRole("button", { name: "Mark as Evidence" }).click();
  // Scoped to the rail on purpose. The finding's name now also appears on every
  // row carrying it — as a tag, or as the screen-reader text behind a log row —
  // so an unscoped text match resolves to five elements and asserts nothing in
  // particular. The rail is what "it was collected" actually means.
  await expect(
    notebook(page).getByRole("heading", {
      name: "Unrelated endpoints are delayed too",
    }),
  ).toBeVisible();
}

test("says nothing about restored progress on a first visit", async ({ page }) => {
  await page.goto(`/missions/${MISSION}/investigation`);
  await expect(page.getByRole("tab", { name: "Logs" })).toBeVisible();
  await expect(page.getByText(NOTICE)).toBeHidden();
});

test("does not announce a restore when the player collects in this session", async ({
  page,
}) => {
  // The notice explains rows the player did not mark now. Marking one must not
  // conjure it — that would report their own click back to them as history.
  await collectOneFinding(page);
  await expect(page.getByText(NOTICE)).toBeHidden();
});

test("explains restored evidence with the real count on a later visit", async ({
  page,
}) => {
  await collectOneFinding(page);

  // Leaving and coming back is what makes the collected rows unexplained.
  await page.goto("/missions");
  await page.goto(`/missions/${MISSION}/investigation`);

  const notice = page.getByText(/Investigation progress restored — 1 evidence item/);
  await expect(notice).toBeVisible();
  // Secondary, not a blocker: the workspace is fully usable behind it.
  await expect(page.getByRole("tab", { name: "Metrics" })).toBeVisible();
});

test("counts every restored finding, not just the first", async ({ page }) => {
  await collectOneFinding(page);
  await page.getByRole("tab", { name: "Metrics" }).click();
  await page.getByRole("button", { name: /Event-loop lag p95/ }).click();
  await page.getByRole("button", { name: /App CPU usage/ }).click();
  await page.getByRole("button", { name: "Mark as Evidence" }).click();

  await page.goto(`/missions/${MISSION}/investigation`);

  await expect(
    page.getByText(/Investigation progress restored — 3 evidence items/),
  ).toBeVisible();
});

test("asks before clearing, and keeps everything when cancelled", async ({ page }) => {
  await collectOneFinding(page);
  await page.goto(`/missions/${MISSION}/investigation`);

  await page.getByRole("button", { name: "Restart Investigation" }).click();

  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "Restart this investigation?" }),
  ).toBeVisible();
  // The copy has to be honest about what survives: server progress is not the
  // browser's to delete.
  await expect(
    dialog.getByText(/previous attempts will not be deleted/),
  ).toBeVisible();

  await dialog.getByRole("button", { name: "Cancel" }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByText(NOTICE)).toBeVisible();
  const saved = await page.evaluate(
    (m) => window.localStorage.getItem(`coderaid:${m}:investigation`),
    MISSION,
  );
  expect(saved).toContain("unrelated-endpoints-delayed");
});

test("clears the collected evidence when the restart is confirmed", async ({ page }) => {
  await collectOneFinding(page);
  await page.goto(`/missions/${MISSION}/investigation`);

  await page.getByRole("button", { name: "Restart Investigation" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Restart Investigation" })
    .click();

  // The notice goes with the state it was describing...
  await expect(page.getByText(NOTICE)).toBeHidden();
  await expect(
    page.getByText(/Nothing collected yet/),
  ).toBeVisible();
  // ...and the row is offered again rather than showing as already collected.
  await expect(
    page.getByRole("button", { name: /\/api\/products/ }),
  ).toBeVisible();

  const saved = await page.evaluate(
    (m) => window.localStorage.getItem(`coderaid:${m}:investigation`),
    MISSION,
  );
  expect(saved ?? "").not.toContain("unrelated-endpoints-delayed");
});

/**
 * A tick has to mean "I marked this".
 *
 * One finding legitimately spans several tools, so the health span in Trace
 * carries the same finding as the `/api/products` log line. It must not arrive
 * wearing a checkmark the player never placed — that reads as the game having
 * answered for them, which is the complaint this whole state exists to fix.
 */
test("shows a finding held from another tool without ticking it", async ({ page }) => {
  await collectOneFinding(page);
  await page.getByRole("tab", { name: "Trace" }).click();

  await expect(
    page.getByText(/belongs to a finding you already collected in another tool/),
  ).toBeVisible();

  // The tag on the span itself, not the notice's mention of it.
  const span = page.getByRole("listitem").filter({ hasText: /api\/health/ });
  await expect(span.getByText("Already held", { exact: true })).toBeVisible();
  await expect(span.getByText("Collected", { exact: true })).toBeHidden();

  // Not selectable either: the finding is held, so there is nothing to mark.
  await expect(page.getByRole("button", { name: /api\/health/ })).toBeHidden();
});

test("ticks the row the player marked, in the tool they marked it in", async ({
  page,
}) => {
  await collectOneFinding(page);

  // Same finding, same visit — but this is the row they clicked, so it is
  // theirs and says so.
  await expect(page.getByText("Collected", { exact: true })).toBeHidden();
  const row = page.getByTitle(/^Collected as evidence: Unrelated endpoints/);
  await expect(row).toBeVisible();

  // ...while its three siblings in the same panel are held, not collected.
  await expect(page.getByTitle(/^Already held from another tool/)).toHaveCount(3);
});

test("makes every meaningful row selectable, not only the decisive ones", async ({
  page,
}) => {
  // The leak this replaced: only key findings had a plus button, so the UI
  // named the answer. These four span a key finding, a healthy subsystem, a
  // ruled-out alternative and a plain observation — all equally selectable,
  // and rendered identically.
  await page.goto(`/missions/${MISSION}/investigation`);
  await page.getByRole("tab", { name: "Metrics" }).click();

  for (const name of [
    /Event-loop lag p95/,
    /Heap used/,
    /Database query time/,
    /Throughput/,
  ]) {
    const card = page.getByRole("button", { name });
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute("aria-pressed", "false");
  }
});
