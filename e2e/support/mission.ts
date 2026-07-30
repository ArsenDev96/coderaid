import { expect, type Page } from "@playwright/test";

/**
 * Playing `event-loop-overload` through the real UI, correctly or badly.
 *
 * The same walkthrough as `mission-flow.spec.ts`, factored out because the
 * authenticated specs need to reach the far side of the sign-in wall twice —
 * once well and once badly — and the interesting assertions are all about what
 * the server did with the result, not about the clicking.
 *
 * `quality: "perfect"` selects the authored correct cause, all five supporting
 * findings and the resolving fix. `"poor"` selects a plausible wrong cause and
 * a non-resolving fix, which is what makes the replay worth nothing.
 */

export const MISSION = "event-loop-overload";

/**
 * Clears one mission's saved stage state so it can be played again.
 *
 * This is what replaying actually is for a signed-in player: the runs are
 * append-only in Postgres and are deliberately untouched, while the local
 * per-stage state — which evidence was marked, which cause was confirmed — is
 * what gets cleared so the mission can be walked a second time. Without it the
 * investigation panel restores the first run's selections and the evidence rows
 * are already collected rather than selectable.
 *
 * The app does this for itself now: "Run It Again" calls
 * `clearMissionWorkingState()`, and the investigation's Restart action calls
 * `clearInvestigationOnward()`. The authenticated spec covers that button
 * directly. This stays a raw sweep on purpose — a test that sets up a replay
 * should not have to route through whichever CTA happens to offer one, and the
 * measurement specs below replay from stages where no CTA exists at all.
 */
export async function resetMissionState(page: Page, missionId: string): Promise<void> {
  await page.evaluate((id) => {
    const prefix = `coderaid:${id}:`;
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith(prefix)) window.localStorage.removeItem(key);
    }
  }, missionId);
}

export async function playToVerification(
  page: Page,
  quality: "perfect" | "poor",
): Promise<void> {
  /* ---------------------------- Briefing ---------------------------- */
  await page.goto(`/missions/${MISSION}/briefing`);
  await page.getByRole("link", { name: "Start Investigation" }).click();

  /* -------------------------- Investigation ------------------------- */
  await expect(page).toHaveURL(new RegExp(`/missions/${MISSION}/investigation$`));

  await page.getByRole("button", { name: /\/api\/products/ }).click();
  await page.getByRole("button", { name: "Mark as Evidence" }).click();

  await page.getByRole("tab", { name: "Metrics" }).click();
  await page.getByRole("button", { name: /Event-loop lag p95/ }).click();
  await page.getByRole("button", { name: /App CPU usage/ }).click();
  await page.getByRole("button", { name: "Mark as Evidence" }).click();

  // The key-clue threshold is what unlocks the stage, for a good run and a bad
  // one alike — the mission is lost on the answer, not on the evidence gate.
  await page.getByRole("link", { name: /Continue to Diagnosis/ }).click();

  /* ---------------------------- Diagnosis --------------------------- */
  await expect(page).toHaveURL(new RegExp(`/missions/${MISSION}/diagnosis$`));

  if (quality === "perfect") {
    await page
      .getByRole("radio", { name: /Synchronous CPU work blocks the event loop/ })
      .click();
    for (const evidence of [
      /Event-loop lag spiked to 6\.8s/,
      /CPU jumped from 31% to 96%/,
      /Report aggregation takes/,
      /Unrelated endpoints respond seconds late/,
      /The database stays healthy/,
    ]) {
      await page.getByRole("checkbox", { name: evidence }).click();
    }
  } else {
    // Pool exhaustion is the distractor the evidence explicitly rules out: the
    // database stays healthy throughout.
    await page
      .getByRole("radio", { name: /Database connection pool exhaustion/ })
      .click();
    // The minimum the gate accepts, and the wrong ones.
    await page.getByRole("checkbox", { name: /Event-loop lag spiked to 6\.8s/ }).click();
    await page.getByRole("checkbox", { name: /CPU jumped from 31% to 96%/ }).click();
    await page.getByRole("checkbox", { name: /The database stays healthy/ }).click();
  }

  await page.getByRole("link", { name: /Confirm Diagnosis|Continue to Fix/ }).click();

  /* ------------------------------- Fix ------------------------------ */
  await expect(page).toHaveURL(new RegExp(`/missions/${MISSION}/fix$`));

  await page
    .getByRole("radio", {
      name:
        quality === "perfect"
          ? /Generate the report in a worker thread/
          : /Increase the database connection pool/,
    })
    .click();
  await page.getByRole("link", { name: /Apply Fix/ }).click();

  /* -------------------------- Verification -------------------------- */
  await expect(page).toHaveURL(new RegExp(`/missions/${MISSION}/verification$`));
}

/**
 * Runs verification and waits for the graded response to land.
 *
 * Returns the parsed body so a caller can assert on **what the server actually
 * sent**, rather than on what the screen made of it. That distinction matters
 * for the disclosure rule (§12 item 19): the question is what crosses the wire,
 * and a UI assertion would pass just as well against a server that sent the
 * answer and a client that chose not to render it.
 */
export async function runVerification(page: Page): Promise<RunResponse> {
  const graded = page.waitForResponse(
    (r) => r.url().includes("/api/runs") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Run Verification" }).click();
  const response = await graded;
  return (await response.json()) as RunResponse;
}

/**
 * The body `POST /api/runs` sends back. `grade` is absent on a run past the
 * replay limit and `limited` is absent on every other run, which is the shape
 * the withholding depends on — so both are optional here rather than asserted.
 */
export type RunResponse = {
  grade?: Record<string, unknown>;
  ledger?: Record<string, unknown>;
  credit?: Record<string, unknown>;
  limited?: { limited: boolean; attempts: number; limit: number };
};

/**
 * The grade from a response that must have carried one. Fails loudly rather than
 * letting an unexpectedly withheld verdict read as a passing assertion on
 * `undefined`.
 */
export function gradeOf(response: RunResponse): Record<string, unknown> {
  expect(response.limited, "the server withheld a verdict unexpectedly").toBeUndefined();
  expect(response.grade, "the response carried no grade").toBeTruthy();
  return response.grade as Record<string, unknown>;
}

/**
 * Submits a run straight to the API with an already-authenticated page context,
 * skipping the six-stage UI.
 *
 * Used only to reach the replay limit, which needs nine submissions: driving the
 * whole flow nine times would take minutes and would test the stage components
 * over again rather than the limit. The payload is a deliberately *wrong* guess
 * — the enumeration pattern the limit exists to slow down.
 */
export async function submitRunDirectly(
  page: Page,
  missionId: string,
): Promise<RunResponse> {
  return page.evaluate(async (id) => {
    const response = await fetch("/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        missionId: id,
        rootCauseId: "definitely-not-the-answer",
        evidenceIds: [],
        fixId: "definitely-not-the-answer",
        fixApplied: true,
        telemetry: {
          startedAt: Date.now() - 60_000,
          lastActiveAt: Date.now(),
          stagesCompleted: [],
          hintsUsed: [],
        },
        completedOn: new Date().toISOString().slice(0, 10),
      }),
    });
    return response.json();
  }, missionId);
}
