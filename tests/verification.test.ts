import { describe, expect, it } from "vitest";
import {
  allChecksPassed,
  getVerification,
  resolveVerification,
  type MissionVerificationConfig,
} from "@/lib/verification";
import { getFix } from "@/lib/fix";
import { PLAYABLE_MISSION_IDS } from "@/lib/availability";

const config = getVerification("event-loop-overload") as MissionVerificationConfig;

/** A deep snapshot, so mutation of the authored config is detectable. */
const snapshot = (c: MissionVerificationConfig) => JSON.stringify(c);

describe("resolveVerification — the fix worked", () => {
  const report = resolveVerification(config, true);

  it("reports the authored improvement", () => {
    expect(report.resolved).toBe(true);
    for (const metric of report.metrics) {
      const authored = config.metrics.find((m) => m.id === metric.id);
      expect(metric.after).toBe(authored?.after);
      expect(metric.status).toBe("pass");
    }
  });

  it("shows the after-line diverging from the before-line", () => {
    expect(report.chart.after).not.toEqual(report.chart.before);
  });

  it("passes every check, including the ones that depend on the fix", () => {
    expect(allChecksPassed(report)).toBe(true);
    expect(report.checks.some((c) => c.dependsOnFix !== false)).toBe(true);
  });

  it("replays the successful logs and the fast request breakdown", () => {
    expect(report.logs).toEqual(config.logs);
    expect(report.requestBreakdown).toEqual(config.requestBreakdown);
    expect(report.breakdownTotalMs).toBe(config.breakdownTotalMs);
    expect(report.breakdownTotalMs).toBeLessThan(
      config.unresolvedBreakdownTotalMs,
    );
  });
});

describe("resolveVerification — the fix did not work", () => {
  const report = resolveVerification(config, false);

  it("holds every metric at its before value", () => {
    expect(report.resolved).toBe(false);
    for (const metric of report.metrics) {
      expect(metric.after).toBe(metric.before);
      expect(metric.status).toBe("fail");
      expect(metric.delta).toBe("No change");
    }
  });

  it("flattens the chart so nothing improved", () => {
    expect(report.chart.after).toEqual(report.chart.before);
  });

  it("fails the checks that depend on the fix", () => {
    const dependent = report.checks.filter((c) => c.dependsOnFix !== false);
    expect(dependent.length).toBeGreaterThan(0);
    expect(dependent.every((c) => c.passed === false)).toBe(true);
    expect(allChecksPassed(report)).toBe(false);
  });

  it("leaves checks that do not depend on the fix alone", () => {
    const independent = report.checks.filter((c) => c.dependsOnFix === false);
    expect(independent.length).toBeGreaterThan(0);
    for (const check of independent) {
      const authored = config.checks.find((c) => c.id === check.id);
      expect(check.passed).toBe(authored?.passed);
    }
  });

  it("keeps the slow request and the pre-fix logs visible", () => {
    expect(report.logs).toEqual(config.unresolvedLogs);
    expect(report.requestBreakdown).toEqual(config.unresolvedBreakdown);
    expect(report.breakdownTotalMs).toBe(config.unresolvedBreakdownTotalMs);
    expect(report.summary).toEqual(config.unresolvedSummary);
  });
});

describe("resolveVerification is pure", () => {
  it("never mutates the authored configuration", () => {
    for (const missionId of PLAYABLE_MISSION_IDS) {
      const authored = getVerification(missionId) as MissionVerificationConfig;
      const before = snapshot(authored);
      resolveVerification(authored, true);
      resolveVerification(authored, false);
      expect(snapshot(authored)).toBe(before);
    }
  });
});

describe("every playable mission's verification", () => {
  it("has a check that fails when the fix does not resolve the incident", () => {
    for (const missionId of PLAYABLE_MISSION_IDS) {
      const authored = getVerification(missionId) as MissionVerificationConfig;
      const failed = resolveVerification(authored, false);
      expect(failed.checks.some((c) => !c.passed)).toBe(true);
    }
  });

  it("has exactly one fix option that resolves the root cause", () => {
    for (const missionId of PLAYABLE_MISSION_IDS) {
      const fix = getFix(missionId);
      const resolving = fix?.options.filter((o) => o.resolvesRootCause) ?? [];
      expect(resolving.map((o) => o.id)).toEqual([fix?.correctFixId]);
    }
  });
});
