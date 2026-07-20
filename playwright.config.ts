import { defineConfig, devices } from "@playwright/test";

/**
 * Browser smoke coverage.
 *
 * The Vitest suite in `tests/` already asserts every rule that decides a score,
 * an XP award or a stage guard, for all fourteen missions. This config exists
 * for the one thing that suite cannot see: whether a real player can actually
 * click through the flow in a browser, with `localStorage`, hydration and the
 * client-side stage guards all in play.
 *
 * Deliberately one mission, not fourteen. The contract is covered in unit
 * tests; this proves the wiring.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "line" : "list",

  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],

  // Serves the production build, so the smoke test exercises the same static
  // output CI publishes rather than the dev server's behaviour.
  webServer: {
    command: "npm run build && npx next start --port 3100 --hostname 127.0.0.1",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
