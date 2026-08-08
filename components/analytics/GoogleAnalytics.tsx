import Script from "next/script";
import { analyticsConfig } from "@/lib/analytics";

/**
 * The `gtag.js` tag, mounted once from the root layout.
 *
 * A server component with no hooks, so it adds no client-side React and cannot
 * turn a static route dynamic — every prerendered page keeps its prerender.
 * `afterInteractive` is the right strategy for a tag: it must run on every page
 * but never ahead of the page becoming usable.
 *
 * **Page views on client navigation are left to GA4.** "Page changes based on
 * browser history events" is part of enhanced measurement and is on by default,
 * and Next's client-side navigation goes through `pushState`, so route changes
 * are already counted. Sending a manual `page_view` on top of that — the shape
 * a lot of App Router snippets use — double-counts every navigation. If
 * enhanced measurement is ever turned off for this property, the fix is to
 * configure with `send_page_view: false` *and* send them manually, never both.
 *
 * Nothing renders unless an id is configured, which is why no analytics call
 * leaves a `npm run dev` session or a Playwright run.
 */
export function GoogleAnalytics() {
  const config = analyticsConfig();

  if (config.status === "invalid") {
    // Warned, not thrown: this is the root layout, and an analytics typo must
    // not be an outage. A build log line is enough to find it, and the
    // alternative — rendering it anyway — silently reports to nothing.
    console.warn(
      `NEXT_PUBLIC_GA_MEASUREMENT_ID="${config.value}" is not a GA4 measurement id (expected G-XXXXXXXXXX). Analytics is disabled.`,
    );
    return null;
  }

  if (config.status === "disabled") return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${config.id}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${config.id}');`}
      </Script>
    </>
  );
}
