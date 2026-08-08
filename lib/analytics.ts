/**
 * Google Analytics configuration.
 *
 * Deliberately *not* shaped like `lib/supabase/env.ts`, which throws on a
 * missing key. Supabase is load-bearing — without it there is no account and no
 * score, so failing loudly at the call site is right. Analytics is not: it is
 * mounted in the root layout, so a throw would take every page down over a
 * measurement id. Absent means off, and off is a working site.
 *
 * The id is read from `NEXT_PUBLIC_GA_MEASUREMENT_ID` rather than hardcoded,
 * even though a GA4 id is public by design and visible in the page source. The
 * reason is data, not secrecy: CI builds and serves the production app to run
 * Playwright against it, so a hardcoded id would report a page view for every
 * spec in every run, mixed in with real players.
 */

/**
 * GA4 measurement ids are `G-` followed by an alphanumeric token.
 *
 * This is also the injection guard. The id is interpolated into an inline
 * `<script>`, and while it comes from our own environment rather than from a
 * request, an env var is still a string someone can typo — or set from a
 * templated deploy pipeline. Restricting it to `[A-Z0-9]` means nothing that
 * reaches the script tag can close it or open a new statement.
 */
const MEASUREMENT_ID = /^G-[A-Z0-9]{6,20}$/i;

export type AnalyticsConfig =
  /** No id configured. The normal state in development and in CI. */
  | { status: "disabled" }
  /** An id is set but is not a measurement id — almost certainly a mistake. */
  | { status: "invalid"; value: string }
  | { status: "enabled"; id: string };

/**
 * Resolves the analytics configuration.
 *
 * `raw` is a parameter so this is testable without mutating `process.env`;
 * production callers pass nothing. Note that `NEXT_PUBLIC_` variables are
 * inlined at build time, so the value is fixed when the bundle is built, not
 * when a request arrives.
 */
export function analyticsConfig(
  raw: string | undefined = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
): AnalyticsConfig {
  const id = raw?.trim();
  if (!id) return { status: "disabled" };
  if (!MEASUREMENT_ID.test(id)) return { status: "invalid", value: id };
  return { status: "enabled", id };
}
