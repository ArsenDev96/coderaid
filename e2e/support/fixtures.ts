import { test as base } from "@playwright/test";
import {
  applySession,
  createPlayer,
  deletePlayer,
  hasCredentials,
  type TestPlayer,
} from "./session";

/**
 * A signed-in browser context, and a player who is deleted afterwards.
 *
 * The fixture owns the whole lifecycle deliberately: a test that fails
 * mid-flight still tears its player down, so a red run cannot leave rows in a
 * shared project. Each test gets its own player rather than sharing a seeded
 * account, which is what lets these run in parallel and keeps one test's runs
 * out of another's ledger.
 *
 * `describe`-level `skip` on `hasCredentials()` is what makes the suite safe to
 * run without secrets — a fork's PR skips these rather than failing red on
 * credentials it was never going to have.
 */
export const test = base.extend<{ player: TestPlayer }>({
  player: async ({ context, baseURL }, use) => {
    const player = await createPlayer("player");
    await applySession(context, player.session, baseURL!);

    await use(player);

    await deletePlayer(player.id);
  },
});

export { expect } from "@playwright/test";
export { hasCredentials };
