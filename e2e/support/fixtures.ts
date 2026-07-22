import { test as base } from "@playwright/test";
import {
  applySession,
  cookieName,
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
  /**
   * `auto: true` is load-bearing, and was added after this bit.
   *
   * Playwright fixtures are lazy: a test that destructures only `{ page }`
   * never instantiates `player`, so no session cookie is written and the test
   * runs **signed out** — silently, against endpoints that answer 401, with no
   * hint that the fixture was skipped. A spec written that way failed with an
   * empty cookie jar and a missing element, which looks like a UI bug and is
   * not one.
   *
   * Making it automatic means every test in this file is signed in whether or
   * not it names the fixture, so the failure mode cannot recur.
   */
  player: [
    async ({ context, baseURL }, use) => {
      const player = await createPlayer("player");
      await applySession(context, player.session, baseURL!);

      // Fail loudly if the session did not actually land. A silently
      // signed-out run is the one outcome that would make these specs pass
      // for the wrong reason on the endpoints that tolerate anonymity.
      const cookies = await context.cookies();
      if (!cookies.some((c) => c.name.startsWith(cookieName()))) {
        await deletePlayer(player.id);
        throw new Error(
          `The session cookie (${cookieName()}) was not applied to the context.`,
        );
      }

      await use(player);

      await deletePlayer(player.id);
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
export { hasCredentials };
