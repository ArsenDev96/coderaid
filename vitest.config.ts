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
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: false,
  },
});
