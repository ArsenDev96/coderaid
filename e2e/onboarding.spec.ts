import { expect, test, type Page } from "@playwright/test";

/**
 * Onboarding completion, through the real UI.
 *
 * The pure rules live in `tests/start.test.ts`. What only a browser can show is
 * the part that was actually wrong: that the success state appears **once**,
 * that it leads with the mission rather than the dashboard, and that coming
 * back to `/start` later resumes training instead of congratulating the player
 * again for something they did last week.
 *
 * Signed out throughout — onboarding needs no account, which is itself one of
 * the claims the storage copy makes.
 */

const PROFILE_KEY = "coderaid:profile";

/** Walks the four steps and lands on the success card. */
async function completeOnboarding(page: Page, name: string, experience: RegExp) {
  await page.goto("/start");

  // Step 1 — identity. The CTA is gated on a name.
  await expect(page.getByRole("heading", { name: /set up your profile/i })).toBeVisible();
  await page.getByLabel(/What should we call you/i).fill(name);
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 2 — learning goal. The default is already selected.
  await expect(page.getByRole("heading", { name: /get better at/i })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 3 — experience, which is what decides the recommendation.
  await expect(page.getByRole("heading", { name: /Node.js experience/i })).toBeVisible();
  await page.getByRole("button", { name: experience }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 4 — confirm.
  await expect(page.getByRole("heading", { name: /Ready to start debugging/i })).toBeVisible();
  await page.getByRole("button", { name: "Enter CodeRaid" }).click();
}

test("leads with the recommended mission after onboarding completes", async ({
  page,
}) => {
  await completeOnboarding(page, "Arsen", /Beginner/);

  await expect(page.getByRole("heading", { name: "You're ready, Arsen!" })).toBeVisible();
  await expect(page.getByText("Your Node.js training path is set up.")).toBeVisible();

  // The mission is the point of the screen: named, labelled, and the CTA.
  await expect(page.getByText("Recommended first incident")).toBeVisible();
  await expect(page.getByText("Event Loop Overload")).toBeVisible();

  const start = page.getByRole("link", { name: /^Start Mission/ });
  await expect(start).toBeVisible();
  await expect(start).toHaveAttribute(
    "href",
    "/missions/event-loop-overload/briefing",
  );

  // The dashboard stays reachable but is no longer the primary action.
  await expect(page.getByRole("link", { name: "View Dashboard" })).toBeVisible();

  // The competing actions the old screen carried are gone.
  await expect(page.getByRole("link", { name: "Enter Dashboard" })).toHaveCount(0);
  await expect(page.getByText("Already have progress?")).toHaveCount(0);

  // Signed out, so the copy must explain what an account is actually for
  // rather than claiming progress is merely browser-local.
  await expect(page.getByText(/Sign in when you run verification/i)).toBeVisible();

  await start.click();
  await expect(page).toHaveURL(/\/missions\/event-loop-overload\/briefing$/);
});

test("derives the recommendation from the chosen experience level", async ({
  page,
}) => {
  // Not hardcoded: a different answer on step 3 must change the mission.
  await completeOnboarding(page, "Mid", /Mid-Level/);

  await expect(page.getByText("User Signup Latency Spike")).toBeVisible();
  await expect(page.getByRole("link", { name: /^Start Mission/ })).toHaveAttribute(
    "href",
    "/missions/user-signup-latency-spike/briefing",
  );
});

test("does not congratulate a returning player again", async ({ page }) => {
  await completeOnboarding(page, "Arsen", /Junior/);
  await expect(page.getByRole("heading", { name: "You're ready, Arsen!" })).toBeVisible();

  // A later visit — the profile is still saved, but this is a new interaction.
  await page.goto("/start");

  // Redirected into training rather than shown the success card again.
  await expect(page).toHaveURL(/\/missions\/promise-all-cascade\//, {
    timeout: 15_000,
  });
  await expect(page.getByRole("heading", { name: /You're ready/ })).toHaveCount(0);
});

test("resumes the mission a returning player already started", async ({ page }) => {
  await completeOnboarding(page, "Arsen", /Beginner/);

  // Open the recommended mission and get as far as the investigation, which is
  // what writes the run telemetry the resume logic reads.
  await page.getByRole("link", { name: /^Start Mission/ }).click();
  await page.getByRole("link", { name: "Start Investigation" }).click();
  await expect(page).toHaveURL(/\/missions\/event-loop-overload\/investigation$/);

  await page.goto("/start");

  // Back to the stage they left, not to the briefing and not to the card.
  await expect(page).toHaveURL(
    /\/missions\/event-loop-overload\/investigation$/,
    { timeout: 15_000 },
  );
});

test("preserves unfinished mission work across onboarding", async ({ page }) => {
  // Mission state is local and separate from the profile. Re-running the
  // wizard must not touch it — losing collected evidence to a settings change
  // would be the worst possible outcome of this refactor.
  await completeOnboarding(page, "Arsen", /Beginner/);
  await page.getByRole("link", { name: /^Start Mission/ }).click();
  await page.getByRole("link", { name: "Start Investigation" }).click();

  await page.getByRole("button", { name: /\/api\/products/ }).click();
  await page.getByRole("button", { name: "Mark as Evidence" }).click();

  const before = await page.evaluate(() =>
    window.localStorage.getItem("coderaid:event-loop-overload:investigation"),
  );
  expect(before).toContain("unrelated-endpoints-delayed");

  // Reopen onboarding by clearing only the completion flag, and finish again.
  await page.evaluate((key) => {
    const draft = JSON.parse(window.localStorage.getItem(key)!);
    window.localStorage.setItem(
      key,
      JSON.stringify({ ...draft, completed: false, step: 3 }),
    );
  }, PROFILE_KEY);

  await page.goto("/start");
  await page.getByRole("button", { name: "Enter CodeRaid" }).click();
  await expect(page.getByRole("heading", { name: /You're ready/ })).toBeVisible();

  const after = await page.evaluate(() =>
    window.localStorage.getItem("coderaid:event-loop-overload:investigation"),
  );
  expect(after).toBe(before);
});
