import { describe, expect, it } from "vitest";
import { countsAfterReset, resetInstant } from "@/lib/reset";

/**
 * The reset tombstone — §12 item 7.
 *
 * `players.reset_at` marks the moment a player started over, and every
 * derivation reads past it rather than deleting anything. `best_runs` applies
 * the filter in SQL (migration 0004), so the rules here cover the two sources
 * the view does not reach: the active days a streak is counted from, and the
 * achievement unlock stamps.
 *
 * The module is pure precisely so these semantics can be pinned without a
 * database — which matters more than usual here, because the failure mode this
 * guards against is *silently discarding progress a player actually earned*.
 */

/** The tombstone used throughout: 2026-07-30, 14:00 UTC. */
const RESET_ISO = "2026-07-30T14:00:00.000Z";
const RESET_MS = Date.parse(RESET_ISO);

describe("resetInstant", () => {
  it("reads an ISO instant as epoch milliseconds", () => {
    expect(resetInstant(RESET_ISO)).toBe(RESET_MS);
  });

  it("reads the shapes PostgREST actually sends for a timestamptz", () => {
    // Not hypothetical: the column reaches this function through the REST API,
    // which renders `timestamptz` with an offset rather than a `Z`, and with
    // microsecond precision when the value has any.
    expect(resetInstant("2026-07-30T14:00:00+00:00")).toBe(RESET_MS);
    expect(resetInstant("2026-07-30 14:00:00+00")).toBe(RESET_MS);
    expect(resetInstant("2026-07-30T14:00:00.000123+00:00")).toBe(RESET_MS);
  });

  /**
   * Null is the "never reset" answer, and it is also the answer to every
   * failure. That direction is chosen deliberately: a missing column on a
   * deploy where 0004 has not been applied yet, or a read that simply failed,
   * must show the player the progress they earned rather than blank it.
   */
  it("answers null for anything that is not a parseable timestamp", () => {
    for (const bad of [null, undefined, "", "never", "yesterday", 42, {}, []]) {
      expect(resetInstant(bad)).toBeNull();
    }
  });

  it("answers null for a Date object, which this column never carries", () => {
    // The guard is `typeof value === "string"` on purpose — the value comes off
    // a JSON body, so a Date here would mean something upstream changed.
    expect(resetInstant(new Date(RESET_ISO))).toBeNull();
    expect(resetInstant(RESET_MS)).toBeNull();
  });
});

describe("countsAfterReset — a player who has never reset", () => {
  /**
   * The short-circuit, and the most important case in the file: a null
   * tombstone must keep *everything*, unconditionally, without even looking at
   * the value. Almost every player is in this state.
   */
  it("keeps everything, including values it could not parse", () => {
    for (const value of [
      "2020-01-01",
      "2026-07-30",
      "2099-12-31T23:59:59.999Z",
      "1970-01-01T00:00:00.000Z",
      "not a date at all",
      "",
    ]) {
      expect(countsAfterReset(value, null)).toBe(true);
    }
  });
});

describe("countsAfterReset — calendar days", () => {
  /**
   * `player_active_days.day` is a `date`, and a date has no time to compare
   * against a tombstone that does. So a day counts if it is the reset day or
   * later: a player who reset at 14:00 was genuinely here that day, and
   * discarding it would break a streak they actually kept.
   */
  it("counts the reset day itself", () => {
    expect(countsAfterReset("2026-07-30", RESET_MS)).toBe(true);
  });

  it("does not count the day before the reset", () => {
    expect(countsAfterReset("2026-07-29", RESET_MS)).toBe(false);
  });

  it("counts every day after the reset", () => {
    expect(countsAfterReset("2026-07-31", RESET_MS)).toBe(true);
    expect(countsAfterReset("2026-08-01", RESET_MS)).toBe(true);
  });

  it("drops the whole history before it", () => {
    for (const day of ["2026-07-01", "2026-01-15", "2025-12-31"]) {
      expect(countsAfterReset(day, RESET_MS)).toBe(false);
    }
  });

  /**
   * The reset day counts however late in the day the reset happened — the
   * comparison is against the *start* of the reset's UTC day, not the instant.
   * A player who resets at 23:59 has still been here today.
   */
  it("counts the reset day from either end of it", () => {
    for (const at of [
      "2026-07-30T00:00:00.000Z",
      "2026-07-30T12:00:00.000Z",
      "2026-07-30T23:59:59.999Z",
    ]) {
      expect(countsAfterReset("2026-07-30", Date.parse(at))).toBe(true);
      expect(countsAfterReset("2026-07-29", Date.parse(at))).toBe(false);
    }
  });
});

describe("countsAfterReset — instants", () => {
  /**
   * An achievement's `unlocked_at` is a real instant, so it is compared as one:
   * strictly after the tombstone. A stamp written in the same millisecond as
   * the reset was earned before it.
   */
  it("does not count a stamp made exactly at the tombstone", () => {
    expect(countsAfterReset(RESET_ISO, RESET_MS)).toBe(false);
  });

  it("counts a stamp one millisecond after it", () => {
    expect(countsAfterReset(new Date(RESET_MS + 1).toISOString(), RESET_MS)).toBe(true);
  });

  it("does not count a stamp one millisecond before it", () => {
    expect(countsAfterReset(new Date(RESET_MS - 1).toISOString(), RESET_MS)).toBe(false);
  });

  /**
   * The distinction the two branches exist for. 14:00 on the reset day is
   * *before* a 14:00 tombstone as an instant — and the same day is kept as a
   * calendar day. Both are correct, for different columns.
   */
  it("treats a day and an instant on that day differently, on purpose", () => {
    expect(countsAfterReset("2026-07-30", RESET_MS)).toBe(true);
    expect(countsAfterReset("2026-07-30T09:00:00.000Z", RESET_MS)).toBe(false);
  });
});

describe("countsAfterReset — values it cannot read", () => {
  /**
   * Kept, on the same principle as a failed `reset_at` read: showing a player
   * something they no longer own is a smaller error than blanking something
   * they earned. Nothing here is a value the schema can produce — the point is
   * which way the code falls when it meets one.
   */
  it("keeps anything unparsable rather than discarding it", () => {
    for (const bad of ["", "never", "2026-13-45", "not a date at all"]) {
      expect(countsAfterReset(bad, RESET_MS)).toBe(true);
    }
  });

  /**
   * The calendar-day branch is chosen by length, so a ten-character string that
   * is not a date must still take the safe route rather than comparing as NaN.
   */
  it("keeps a ten-character value that is not a date", () => {
    expect(countsAfterReset("2026-99-99", RESET_MS)).toBe(true);
  });
});
