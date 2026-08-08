import { expect, test } from "@playwright/test";

/**
 * The marketing page's own promises.
 *
 * Every other spec treats `/` as a doorway and walks straight through it, so
 * nothing checked the page itself. Two defects lived there because of that: a
 * "Pricing" nav item pointing at a section that has never shown a price, and a
 * header offering "Sign In" to players who were already signed in.
 *
 * The signed-in half of that second fix needs a real session, so it lives in
 * `authenticated.spec.ts` where the fixture can mint one. This covers the half
 * that needs no account — which is also the state most visitors arrive in.
 */

test("offers no navigation to something the product does not have", async ({
  page,
}) => {
  await page.goto("/");

  const nav = page.getByRole("navigation").first();
  // The rename, not merely the absence: a nav item promising pricing implies a
  // price list, and there is no price anywhere in the app.
  await expect(nav.getByRole("link", { name: "Pricing" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Get Started" })).toBeVisible();
});

test("every header nav item lands on a section that exists", async ({ page }) => {
  await page.goto("/");

  const links = page.getByRole("navigation").first().getByRole("link");
  const targets = await links.evaluateAll((nodes) =>
    nodes
      .map((n) => n.getAttribute("href") ?? "")
      .filter((href) => href.startsWith("#")),
  );
  expect(targets.length).toBeGreaterThan(0);

  for (const href of targets) {
    // `#foo` has to resolve to an element with `id="foo"`, or the nav item is
    // a link that scrolls nowhere.
    await expect(page.locator(href)).toHaveCount(1);
  }
});

test("shows the signed-out actions to a visitor without an account", async ({
  page,
}) => {
  await page.goto("/");

  // Both, and not the dashboard link: missions are playable without an account,
  // so this is a real state rather than a loading artefact.
  await expect(
    page.getByRole("link", { name: "Sign In" }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Start Your First Mission" }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Go to Dashboard" }),
  ).toHaveCount(0);
});

test("every footer link goes somewhere real", async ({ page }) => {
  await page.goto("/");

  const footer = page.getByRole("contentinfo");
  const hrefs = await footer
    .getByRole("link")
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href") ?? ""));

  expect(hrefs.length).toBeGreaterThan(0);

  for (const href of hrefs) {
    if (href.startsWith("#")) {
      // The footer only renders on `/`, so its anchors must exist on `/`.
      await expect(page.locator(href)).toHaveCount(1);
    } else {
      // A route, not a placeholder: `/demo` was where the removed Privacy,
      // Terms and social links all used to point.
      expect(href).not.toBe("/demo");
      const response = await page.request.get(href, { maxRedirects: 0 });
      expect(
        response.status(),
        `${href} should not 404`,
      ).toBeLessThan(400);
    }
  }
});

test("closes the mobile menu on Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  // Located by what it controls, not by its label — the label flips to "Close
  // menu" once open, and finding it this way is itself the `aria-controls`
  // assertion: a screen reader can reach the panel from the toggle.
  const toggle = page.locator('button[aria-controls="site-menu"]');
  await expect(toggle).toHaveAttribute("aria-label", "Open menu");

  await toggle.click();

  const menu = page.locator("#site-menu");
  await expect(menu).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-label", "Close menu");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");

  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
});
