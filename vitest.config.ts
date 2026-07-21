import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Domain-logic tests only.
 *
 * Everything under `lib/` is pure TypeScript — the grading engine, the
 * progression ledger, availability, skills, achievements and the mission
 * content registries — so a plain Node environment is enough. There is no
 * component testing here on purpose: the value is in the rules, not in the
 * markup that renders them.
 *
 * The `@/*` alias mirrors `tsconfig.json` so tests import modules exactly the
 * way the app does.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      // `server-only` throws on import outside a React Server Component — that
      // is its whole job, and it is what keeps the answers out of the browser
      // bundle. The suite tests those server modules directly in Node, so it
      // stubs the guard rather than weakening it.
      "server-only": fileURLToPath(
        new URL("./tests/stubs/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: false,
  },
});
