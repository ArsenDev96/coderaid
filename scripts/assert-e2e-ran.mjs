/**
 * Assert that the Playwright run actually ran, rather than reporting success
 * for having done nothing. Reads the JSON reporter's output; run after
 * `npm run test:e2e` in CI.
 *
 * Why this exists (§12 item 22). A green Playwright run and a Playwright run
 * that skipped every spec that matters are the same colour and the same exit
 * code. That is not hypothetical here: the smoke job's key export could return
 * success having exported nothing, at which point the twenty authenticated
 * specs skipped themselves and CI stayed green. Two guards now stop that
 * happening — but both reason about *credentials*, and this one reasons about
 * the only thing actually being claimed: how many specs ran.
 *
 * `credentialsMissing()` throwing is the specific assertion; this is the
 * general one. It also catches a case neither guard sees — a spec file that
 * silently stops being collected, which no credential check would ever notice.
 */
import { readFileSync } from "node:fs";

/** Overridable so the guard itself can be exercised against fixtures. */
const REPORT = process.argv[2] ?? "playwright-report/results.json";

/**
 * A floor, not an exact count: adding specs should not fail CI, but losing
 * them should. 37 as of 2026-07-31 — raise it when the suite grows.
 */
const MINIMUM_SPECS = 37;

let report;
try {
  report = JSON.parse(readFileSync(REPORT, "utf8"));
} catch (error) {
  console.error(`::error::Could not read ${REPORT}: ${error.message}`);
  console.error("The JSON reporter is configured only when CI is set.");
  process.exit(1);
}

const { expected = 0, skipped = 0, unexpected = 0, flaky = 0 } = report.stats ?? {};
const problems = [];

if (skipped > 0) {
  problems.push(
    `${skipped} spec(s) skipped. In CI nothing is allowed to skip: the local ` +
      `Supabase stack means there is no missing precondition to skip over.`,
  );
}
if (expected < MINIMUM_SPECS) {
  problems.push(
    `only ${expected} spec(s) ran, expected at least ${MINIMUM_SPECS}. ` +
      `Specs have disappeared, or the run stopped early.`,
  );
}
if (unexpected > 0) {
  problems.push(`${unexpected} spec(s) failed.`);
}

if (problems.length > 0) {
  for (const problem of problems) console.error(`::error::${problem}`);
  process.exit(1);
}

console.log(
  `${expected} specs ran, ${skipped} skipped, ${unexpected} failed, ${flaky} flaky.`,
);
