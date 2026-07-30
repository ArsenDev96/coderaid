import { describe, expect, it } from "vitest";
import {
  REPLAY_LIMIT,
  REPLAY_WINDOW_MS,
  replayVerdict,
  retryLabel,
} from "@/lib/replay-limit";

/**
 * The replay limit — the closure of the open half of §12 item 19.
 *
 * The policy is pure, so every case here is exercised without a database: the
 * route supplies timestamps, this decides what they mean.
 */

const NOW = new Date("2026-07-30T12:00:00.000Z");

/** `n` attempts, `minutesAgo` apart, ending `minutesAgo` before NOW. */
function attempts(count: number, minutesAgo = 1): string[] {
  return Array.from({ length: count }, (_, i) =>
    new Date(NOW.getTime() - (minutesAgo + i) * 60_000).toISOString(),
  );
}

describe("replayVerdict", () => {
  it("allows a first run", () => {
    const verdict = replayVerdict([], NOW);
    expect(verdict.limited).toBe(false);
    expect(verdict.attempts).toBe(0);
    expect(verdict.retryAfterMs).toBe(0);
  });

  it("allows a legitimate retry pattern — wrong fix, re-read, try again", () => {
    // The behaviour the limit must not punish. Four runs in an hour is heavy
    // practice, not enumeration.
    expect(replayVerdict(attempts(4), NOW).limited).toBe(false);
  });

  it("allows exactly up to the limit, then stops", () => {
    expect(replayVerdict(attempts(REPLAY_LIMIT - 1), NOW).limited).toBe(false);
    expect(replayVerdict(attempts(REPLAY_LIMIT), NOW).limited).toBe(true);
  });

  it("stays limited as attempts pile up past it", () => {
    const verdict = replayVerdict(attempts(REPLAY_LIMIT + 20), NOW);
    expect(verdict.limited).toBe(true);
    expect(verdict.attempts).toBe(REPLAY_LIMIT + 20);
  });

  it("ignores attempts older than the window", () => {
    // A caller that over-fetches must still get the right answer, so the filter
    // lives here rather than being trusted to the query.
    const old = Array.from({ length: 50 }, (_, i) =>
      new Date(NOW.getTime() - REPLAY_WINDOW_MS - (i + 1) * 60_000).toISOString(),
    );
    const verdict = replayVerdict(old, NOW);
    expect(verdict.limited).toBe(false);
    expect(verdict.attempts).toBe(0);
  });

  it("treats an attempt exactly at the window edge as expired", () => {
    const edge = [new Date(NOW.getTime() - REPLAY_WINDOW_MS).toISOString()];
    expect(replayVerdict(edge, NOW).attempts).toBe(0);
  });

  it("counts the window as rolling, not as a fixed bucket", () => {
    // Eight attempts an hour ago and one now is allowed: the old ones aged out.
    const stale = Array.from({ length: REPLAY_LIMIT }, (_, i) =>
      new Date(NOW.getTime() - REPLAY_WINDOW_MS - i * 1000).toISOString(),
    );
    expect(replayVerdict(stale, NOW).limited).toBe(false);
  });

  it("reports retry time from the oldest counted attempt, not the newest", () => {
    // The slot that frees up first is the oldest one's. Ten minutes in means
    // fifty minutes to wait.
    const verdict = replayVerdict(attempts(REPLAY_LIMIT, 10), NOW);
    expect(verdict.limited).toBe(true);
    // The oldest of the eight is 10 + 7 = 17 minutes old, so 43 minutes remain.
    expect(Math.round(verdict.retryAfterMs / 60_000)).toBe(43);
  });

  it("survives malformed timestamps rather than counting them", () => {
    const verdict = replayVerdict(["not a date", "", NOW.toISOString()], NOW);
    expect(verdict.attempts).toBe(1);
    expect(verdict.limited).toBe(false);
  });

  it("accepts Date and epoch-millisecond forms too", () => {
    const mixed = [NOW.getTime() - 60_000, new Date(NOW.getTime() - 120_000)];
    expect(replayVerdict(mixed, NOW).attempts).toBe(2);
  });
});

describe("retryLabel", () => {
  it("rounds up to whole minutes", () => {
    expect(retryLabel(90_000)).toBe("in 2 minutes");
    expect(retryLabel(12 * 60_000)).toBe("in 12 minutes");
  });

  it("collapses anything under a minute", () => {
    expect(retryLabel(0)).toBe("in under a minute");
    expect(retryLabel(30_000)).toBe("in under a minute");
  });
});

describe("the policy itself", () => {
  it("is generous enough for practice and tight enough to bound a search", () => {
    // Pinned deliberately: these two numbers ARE the product decision, and a
    // later change to either should be a conscious edit to this test.
    expect(REPLAY_LIMIT).toBe(8);
    expect(REPLAY_WINDOW_MS).toBe(60 * 60 * 1000);
  });
});
