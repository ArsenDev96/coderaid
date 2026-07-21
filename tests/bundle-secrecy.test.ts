import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MISSION_ANSWERS } from "@/lib/server/answers";

/**
 * The answers must not be in anything a browser downloads.
 *
 * They used to be: `correctRootCauseId`, `correctEvidenceIds`, `correctFixId`
 * and a `resolvesRootCause` flag per option all lived in the stage configs, so
 * a player could read the correct answer out of devtools before choosing one.
 * A grep of the built bundle is what found it, and this is that grep, kept.
 *
 * It reads the real build output rather than reasoning about imports, because
 * the failure mode is subtle: a value reaches the browser through a `"use
 * client"` import chain *or* by being serialised into a server component's
 * props, and only the artefact shows both.
 *
 * Skipped when `.next` is absent so `npm run test` works on a clean checkout;
 * CI runs `build` before `test`, and the assertion is what fails a leak.
 */

const BUILD_DIR = join(process.cwd(), ".next");

function buildExists(): boolean {
  try {
    return statSync(BUILD_DIR).isDirectory();
  } catch {
    return false;
  }
}

/** Every file a browser could fetch: the JS chunks and the prerendered HTML. */
function clientFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      // `.next/server` is not served to browsers; everything else under
      // `.next` either is, or is prerendered HTML that will be.
      if (entry.name === "cache") continue;
      clientFiles(path, found);
    } else if (/\.(js|html|json|txt)$/.test(entry.name)) {
      found.push(path);
    }
  }
  return found;
}

/**
 * Note what is *not* asserted: that the answer ids are absent. They can't be.
 * `move-report-generation-to-worker-thread` is the value of a radio button the
 * player picks from, so every option id — including the correct one — is
 * necessarily in the bundle. The secret was never the id; it was **which id is
 * the right one**. So this looks for the two things that would carry that:
 * the field names the answers used to travel under, and the serialised
 * key/value pairing of the answers module itself.
 */
describe("the built bundle", () => {
  /** The field names that used to hold the answers in the public configs. */
  const REMOVED_FIELDS = [
    "correctRootCauseId",
    "correctEvidenceIds",
    "correctFixId",
    "resolvesRootCause",
  ];

  function browserFiles(): string[] {
    // `.next/server` holds the server bundle, where the answers belong.
    return clientFiles(BUILD_DIR).filter(
      (f) => !f.includes(`${join(".next", "server")}`),
    );
  }

  it("has answers to hide", () => {
    expect(Object.keys(MISSION_ANSWERS).length).toBeGreaterThan(0);
  });

  it.skipIf(!buildExists())(
    "carries none of the fields the answers used to travel in",
    () => {
      const files = browserFiles();
      expect(files.length).toBeGreaterThan(0);

      const leaks: string[] = [];
      for (const file of files) {
        const contents = readFileSync(file, "utf8");
        for (const field of REMOVED_FIELDS) {
          // Minifiers preserve data-object keys, so a surviving field name
          // here would be a real leak rather than a naming coincidence.
          if (contents.includes(field)) leaks.push(`${field} → ${file}`);
        }
      }

      expect(leaks).toEqual([]);
    },
  );

  it.skipIf(!buildExists())(
    "never pairs a mission with its correct answer",
    () => {
      const files = browserFiles();
      const leaks: string[] = [];

      for (const file of files) {
        const contents = readFileSync(file, "utf8");
        for (const [missionId, answers] of Object.entries(MISSION_ANSWERS)) {
          // How the answers module would look if it were ever bundled, with
          // and without quoted keys, minified or not.
          for (const [key, value] of [
            ["rootCauseId", answers.rootCauseId],
            ["fixId", answers.fixId],
          ] as const) {
            for (const shape of [
              `${key}:"${value}"`,
              `"${key}":"${value}"`,
              `${key}: "${value}"`,
            ]) {
              if (contents.includes(shape)) {
                leaks.push(`${missionId}: ${shape} → ${file}`);
              }
            }
          }
        }
      }

      expect(leaks).toEqual([]);
    },
  );
});
