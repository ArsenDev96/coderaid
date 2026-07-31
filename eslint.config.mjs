import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

/**
 * Flat config, replacing `.eslintrc.json`.
 *
 * Forced by the Next 16 upgrade, not chosen: `next lint` is gone, so `npm run
 * lint` calls `eslint` directly, and `eslint-config-next@16` requires ESLint 9,
 * which only reads flat config. `eslint-config-next/core-web-vitals` already
 * exports a flat array, so this is the same rule set as before — the shape
 * around it changed, the rules did not.
 *
 * `ignores` in a block of its own is global. Listed alongside other keys it
 * would only apply to that block, which is the usual way this file goes wrong.
 */
const config = [
  {
    ignores: [
      ".next/",
      "node_modules/",
      "out/",
      "build/",
      "playwright-report/",
      "test-results/",
    ],
  },
  ...nextCoreWebVitals,
  {
    rules: {
      /**
       * Demoted to a warning on 2026-07-31, deliberately and temporarily —
       * §12 item 23.
       *
       * New in the `eslint-plugin-react-hooks` v6 that ships with
       * `eslint-config-next@16`, so it arrived with the framework rather than
       * with any change to this code. It fires 14 times, and every one is the
       * same shape: read `localStorage` (or fetch the ledger) on mount, then
       * subscribe to changes. Server rendering cannot read `localStorage`, so
       * hydrating in an effect is why these are written this way.
       *
       * The rule is right that this cascades renders, and the idiomatic
       * replacement is `useSyncExternalStore`. That is a rewrite of the client
       * hydration path — `ProgressProvider` included, which is the whole
       * pre-account ledger — and **there are no component tests to catch a
       * regression** (§12 item 2). Doing it inside a framework migration would
       * mean changing the state model and the framework at once, with nothing
       * watching.
       *
       * A warning keeps it visible and countable without either pretending the
       * problem does not exist or wiring `lint` to fail on pre-existing code.
       * Raise it back to "error" in the pass that fixes it.
       */
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];

export default config;
