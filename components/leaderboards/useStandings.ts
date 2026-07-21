"use client";

import { useEffect, useState } from "react";
import type { StandingsRow } from "@/lib/leaderboards";

/**
 * The real standings, fetched from Postgres.
 *
 * This replaced `useCurrentPlayerEntry`, which built the player's own row from
 * their local ledger and ranked it against a fixed roster of thirty invented
 * people. Every row now belongs to somebody, including the player's — the
 * server marks which one is theirs, so the client never decides its own rank.
 *
 * `unauthenticated` is a distinct state rather than an empty board: standings
 * carry other players' names, so they are only shown to signed-in players, and
 * the page needs to say so rather than imply nobody has played.
 */
export type StandingsState =
  | { status: "loading" }
  | { status: "ready"; rows: StandingsRow[] }
  | { status: "unauthenticated" }
  | { status: "failed" };

export function useStandings(): StandingsState {
  const [state, setState] = useState<StandingsState>({ status: "loading" });

  useEffect(() => {
    let live = true;

    void (async () => {
      try {
        const response = await fetch("/api/leaderboard", { cache: "no-store" });
        if (!live) return;

        if (response.status === 401) return setState({ status: "unauthenticated" });
        if (!response.ok) return setState({ status: "failed" });

        const { standings } = (await response.json()) as {
          standings?: StandingsRow[];
        };
        if (!live) return;
        setState(
          Array.isArray(standings)
            ? { status: "ready", rows: standings }
            : { status: "failed" },
        );
      } catch {
        if (live) setState({ status: "failed" });
      }
    })();

    return () => {
      live = false;
    };
  }, []);

  return state;
}
