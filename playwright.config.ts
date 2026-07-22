import { readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

/**
 * Load `.env.local` for local runs.
 *
 * Next reads it during `build`, but the Playwright process is separate and does
 * not, and the authenticated specs need the Supabase keys in *this* process to
 * mint a session. Existing variables always win, so CI secrets are never
 * overwritten by a stray local file. Written by hand rather than pulling in
 * `dotenv` for eleven lines.
 */
function loadEnvLocal() {
  let contents: string;
  try {
    contents = readFileSync(".env.local", "utf8");
  } catch {
    return; // Absent in CI, where the values come from secrets.
  }
  // Split on CRLF as well as LF: this file is edited on Windows, and `.` does
  // not match `\r`, so a trailing carriage return silently defeats the match.
  for (const line of contents.split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const [, key, raw] = match;
    if (process.env[key]) continue;
    process.env[key] = raw.trim().replace(/^["']|["']$/g, "");
  }
}

loadEnvLocal();

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
