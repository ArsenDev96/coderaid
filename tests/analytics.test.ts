import { describe, expect, it } from "vitest";
import { analyticsConfig } from "@/lib/analytics";

/**
 * The analytics tag is mounted in the root layout, which makes the rules about
 * *when it renders* worth pinning:
 *
 * - absent means off, because a missing measurement id must not be an error on
 *   every page of the site;
 * - a malformed id is reported rather than used, because rendering it anyway
 *   sends every page view to nothing while looking like it works;
 * - and the id can only ever be `G-` plus alphanumerics, because it is
 *   interpolated into an inline `<script>`.
 */

describe("resolving the analytics configuration", () => {
  it("is disabled when nothing is configured", () => {
    expect(analyticsConfig(undefined)).toEqual({ status: "disabled" });
  });

  it("treats an empty or whitespace value as not configured", () => {
    // A deploy pipeline that templates an unset variable produces exactly this,
    // and it means "off", not "broken".
    expect(analyticsConfig("")).toEqual({ status: "disabled" });
    expect(analyticsConfig("   ")).toEqual({ status: "disabled" });
  });

  it("enables a real measurement id", () => {
    expect(analyticsConfig("G-HPHD87W5H9")).toEqual({
      status: "enabled",
      id: "G-HPHD87W5H9",
    });
  });

  it("tolerates surrounding whitespace from a pasted value", () => {
    expect(analyticsConfig("  G-HPHD87W5H9\n")).toEqual({
      status: "enabled",
      id: "G-HPHD87W5H9",
    });
  });

  it("reports a Universal Analytics id rather than using it", () => {
    // The most likely real mistake: a `UA-` property id copied out of an old
    // dashboard. gtag would load and report nothing.
    expect(analyticsConfig("UA-12345-6")).toEqual({
      status: "invalid",
      value: "UA-12345-6",
    });
  });

  it("reports a placeholder that was never filled in", () => {
    expect(analyticsConfig("G-XXXXXXXXXX")).toMatchObject({
      status: "enabled",
    });
    // ...but an obviously unsubstituted template is not a measurement id.
    expect(analyticsConfig("G-${GA_ID}")).toMatchObject({ status: "invalid" });
    expect(analyticsConfig("your-id-here")).toMatchObject({ status: "invalid" });
  });

  /**
   * The id reaches an inline `<script>`, so the character set is a security
   * boundary rather than a formatting preference.
   */
  it("refuses anything that could break out of the script tag", () => {
    for (const hostile of [
      "G-ABCDEF123'});alert(1);//",
      "G-ABCDEF123</script><script>alert(1)</script>",
      'G-ABCDEF123"',
      "G-ABCDEF123\\",
      "G-ABC DEF123",
      "G-ABCDEF123;",
    ]) {
      expect(analyticsConfig(hostile), hostile).toMatchObject({
        status: "invalid",
      });
    }
  });

  it("rejects an id that is too short or too long to be one", () => {
    expect(analyticsConfig("G-ABC")).toMatchObject({ status: "invalid" });
    expect(analyticsConfig(`G-${"A".repeat(21)}`)).toMatchObject({
      status: "invalid",
    });
  });
});
