import { describe, expect, it } from "vitest";
import {
  nextActionFor,
  SPARK_HEIGHT,
  SPARK_WIDTH,
  sparklinePoints,
} from "@/lib/dashboard";
import { PLAYABLE_MISSION_IDS } from "@/lib/availability";
import { getInvestigation } from "@/lib/investigation";
import { getMission, MISSIONS } from "@/lib/missions";

/**
 * The dashboard's Next Action card.
 *
 * These cover what replaced `RESPONSE_SERIES` — a hardcoded 21-point squiggle
 * rendered beside a *real* headline metric and byte-identical for all fourteen
 * missions. The sparkline is now derived from the same investigation config the
 * headline comes from, so the two describe one incident.
 */

function pairs(points: string): { x: number; y: number }[] {
  return points.split(" ").map((p) => {
    const [x, y] = p.split(",").map(Number);
    return { x, y };
  });
}

describe("sparklinePoints", () => {
  it("spans the full width, oldest sample to newest", () => {
    const points = pairs(sparklinePoints([1, 2, 3, 4])!);
    expect(points).toHaveLength(4);
    expect(points[0].x).toBe(0);
    expect(points[3].x).toBe(SPARK_WIDTH);
    // Monotonic in x, or the polyline doubles back on itself.
    for (let i = 1; i < points.length; i++) {
      expect(points[i].x).toBeGreaterThan(points[i - 1].x);
    }
  });

  it("puts the largest sample at the top and the smallest at the bottom", () => {
    const points = pairs(sparklinePoints([10, 50, 30])!);
    // SVG y grows downward, so the biggest value has the smallest y.
    expect(points[1].y).toBeLessThan(points[2].y);
    expect(points[2].y).toBeLessThan(points[0].y);
  });

  it("stays inside the viewBox", () => {
    for (const { y } of pairs(sparklinePoints([0, 9999, 5, 120, 3])!)) {
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(SPARK_HEIGHT);
    }
  });

  it("normalises to the series' own range, not an absolute scale", () => {
    // Same shape, wildly different magnitudes — a sparkline compares shape.
    expect(sparklinePoints([1, 2, 3])).toBe(sparklinePoints([1000, 2000, 3000]));
  });

  it("draws a flat series through the middle rather than dividing by zero", () => {
    for (const { y } of pairs(sparklinePoints([7, 7, 7])!)) {
      expect(y).toBe(SPARK_HEIGHT / 2);
    }
  });

  it("returns null for a series too short or too broken to draw", () => {
    expect(sparklinePoints([])).toBeNull();
    expect(sparklinePoints([42])).toBeNull();
    expect(sparklinePoints([1, NaN, 3])).toBeNull();
    expect(sparklinePoints([1, Infinity])).toBeNull();
  });
});

describe("the Next Action card", () => {
  it("draws each mission's own latency samples", () => {
    for (const id of PLAYABLE_MISSION_IDS) {
      const mission = getMission(id)!;
      const investigation = getInvestigation(id)!;
      expect(nextActionFor(mission).spark).toBe(
        sparklinePoints(investigation.metrics.latency.series),
      );
    }
  });

  it("gives no two playable missions the same sparkline", () => {
    // The precise failure `RESPONSE_SERIES` had: one shape for every mission,
    // beside fourteen different headline numbers.
    const shapes = PLAYABLE_MISSION_IDS.map((id) => nextActionFor(getMission(id)!).spark);
    expect(new Set(shapes).size).toBe(shapes.length);
  });

  it("omits the chart for a mission with no investigation content", () => {
    const unwritten = MISSIONS.find((m) => !getInvestigation(m.id));
    expect(unwritten).toBeDefined();
    expect(nextActionFor(unwritten!).spark).toBeNull();
  });
});
