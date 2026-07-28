/**
 * The dashboard's derived figures.
 *
 * The card next to them shows a real headline metric taken from the mission's
 * investigation content, and for a long time it also showed a sparkline that
 * was 21 hardcoded points — the same squiggle for every mission, described in
 * its own comment as a "noisy, elevated latency series". A fabricated chart
 * beside a derived number is the exact failure §4.10 exists to prevent, so the
 * samples now come from the mission's own authored chart and these tests hold
 * them to it.
 */

import { describe, expect, it } from "vitest";
import { nextActionFor, sparklinePoints } from "@/lib/dashboard";
import { PLAYABLE_MISSION_IDS } from "@/lib/availability";
import { getInvestigation } from "@/lib/investigation";
import { getMission } from "@/lib/missions";

/** `"12,30 24,18"` → `[[12, 30], [24, 18]]`. */
function parse(points: string): Array<[number, number]> {
  return points
    .split(" ")
    .map((pair) => pair.split(",").map(Number) as [number, number]);
}

describe("sparklinePoints", () => {
  it("draws nothing when there is nothing to draw", () => {
    expect(sparklinePoints([])).toBeNull();
    expect(sparklinePoints([42])).toBeNull();
  });

  it("spans the full width, oldest to newest", () => {
    const parsed = parse(sparklinePoints([1, 2, 3, 4, 5])!);
    expect(parsed).toHaveLength(5);
    expect(parsed[0][0]).toBe(0);
    expect(parsed[4][0]).toBe(240);
    // Strictly left to right — a series drawn out of order would misreport
    // which way the incident went.
    for (let i = 1; i < parsed.length; i += 1) {
      expect(parsed[i][0]).toBeGreaterThan(parsed[i - 1][0]);
    }
  });

  it("puts the peak at the top and the trough at the bottom", () => {
    // SVG y grows downward, so the largest sample must have the smallest y.
    const parsed = parse(sparklinePoints([10, 500, 10])!);
    expect(parsed[1][1]).toBeLessThan(parsed[0][1]);
    expect(parsed[0][1]).toBe(parsed[2][1]);
  });

  it("keeps every point inside the box", () => {
    const parsed = parse(sparklinePoints([0, 9999, 3, 74, 1])!);
    for (const [x, y] of parsed) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(240);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(40);
    }
  });

  it("draws a flat series down the middle rather than pinned to an edge", () => {
    const parsed = parse(sparklinePoints([48, 48, 48])!);
    for (const [, y] of parsed) expect(y).toBeCloseTo(20, 0);
  });

  it("reflects the shape of the samples it was given", () => {
    // A steady climb must render as a steady climb, not as noise.
    const climbing = parse(sparklinePoints([1, 2, 3, 4, 5, 6])!);
    for (let i = 1; i < climbing.length; i += 1) {
      expect(climbing[i][1]).toBeLessThan(climbing[i - 1][1]);
    }
  });
});

describe("the next-action card", () => {
  it("carries the mission's own latency samples", () => {
    for (const id of PLAYABLE_MISSION_IDS) {
      const card = nextActionFor(getMission(id)!);
      const series = getInvestigation(id)!.metrics.latency.series;

      expect(card.sparkline).toBe(sparklinePoints(series));
      expect(card.sparkline).not.toBeNull();
    }
  });

  it("gives different missions different shapes", () => {
    // The old constant was identical everywhere. If this ever collapses to one
    // value again, something has gone back to drawing a decoration.
    const shapes = new Set(
      PLAYABLE_MISSION_IDS.map((id) => nextActionFor(getMission(id)!).sparkline),
    );
    expect(shapes.size).toBeGreaterThan(1);
  });
});
