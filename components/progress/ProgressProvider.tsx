"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { EMPTY_VIEW, type PlayerView } from "@/lib/availability";
import { DEFAULT_PLAYER_NAME, playerFrom, type Player } from "@/lib/dashboard";
import { fetchLedger, recordActivity } from "@/lib/ledger-client";
import { avatarFor, type ServerProfile } from "@/lib/profile-client";
import { AVATARS, loadDraft, type Avatar } from "@/lib/onboarding";
import {
  EMPTY_LEDGER,
  PROGRESS_EVENT,
  PROGRESS_KEY,
  loadLedger,
  today,
  type Ledger,
} from "@/lib/progress";
import { startedMissionIds } from "@/lib/run";

/**
 * Hydrates the player's real progression ledger and shares it with every view.
 *
 * **The ledger is server-derived.** XP, level, rank, streak, skills and
 * achievements are all computed in Postgres from the runs the player actually
 * finished — the browser can no longer add to any of them, which is the same
 * property that moving the answers and the grading server-side established for
 * the score. `Ledger` is unchanged as a wire shape, so every consumer of
 * `useProgress()` reads exactly what it read before.
 *
 * Two sources, and which one is in use is itself a fact worth exposing:
 *
 *   - **signed in** — `/api/ledger`, authoritative. Opening the app POSTs the
 *     local date first, because showing up is activity and that is what a
 *     streak measures.
 *   - **signed out** — the pre-migration `localStorage` ledger, **read-only**.
 *     Nothing writes to it any more. It exists so a player who earned progress
 *     before accounts existed still sees it, and can claim it on first sign-in
 *     rather than being shown a zero that reads as a reset.
 *
 * The tree still renders once with `EMPTY_LEDGER` — a genuinely valid
 * new-player state, not a placeholder — and re-renders once the real ledger
 * arrives.
 */

type LedgerSource = "pending" | "server" | "local";

type ProgressContextValue = {
  ledger: Ledger;
  view: PlayerView;
  player: Player;
  avatar: Avatar;
  slogan: string;
  /** True once a real ledger has been resolved — false during SSR and first paint. */
  hydrated: boolean;
  /** Where the ledger came from. `local` means signed out and read-only. */
  source: LedgerSource;
  /** True when progress is server-backed, i.e. the player is signed in. */
  authenticated: boolean;
  /**
   * A pre-account `localStorage` ledger that has not been imported yet, or
   * null. Only ever set for a signed-in player who genuinely has one, so the
   * import can be offered without asking everyone else a question about a
   * migration they were never part of.
   */
  claimable: Ledger | null;
  /**
   * Adopts a ledger the server just returned — the response to grading a run
   * carries one, so the dashboard updates without a second round trip. There
   * is deliberately no way to hand this a ledger the client computed.
   */
  adopt: (ledger: Ledger, claimed?: boolean) => void;
  /** Re-reads the ledger from whichever source is authoritative. */
  refresh: () => void;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

const DEFAULT_AVATAR = AVATARS[0];
const DEFAULT_SLOGAN = "Code. Debug. Deploy. Repeat.";

type Identity = { name: string; slogan: string; avatar: Avatar };

const DEFAULT_IDENTITY: Identity = {
  name: DEFAULT_PLAYER_NAME,
  slogan: DEFAULT_SLOGAN,
  avatar: DEFAULT_AVATAR,
};

function readIdentity(): Identity {
  const draft = loadDraft();
  if (!draft) return DEFAULT_IDENTITY;
  return {
    name: draft.name.trim() || DEFAULT_PLAYER_NAME,
    slogan: draft.slogan || DEFAULT_SLOGAN,
    avatar: AVATARS.find((a) => a.id === draft.avatarId) ?? DEFAULT_AVATAR,
  };
}

/**
 * The identity a signed-in player has, which is the server's copy.
 *
 * This is what closes the gap the profile route opened: the leaderboard renders
 * `players.display_name`, so the top bar and greeting must render the same
 * string or the player sees one name and everyone else sees another. A device
 * that has never seen this player's `localStorage` now gets their real name
 * instead of "Operative".
 *
 * Falls back per field rather than wholesale: a column never written is null,
 * and a null slogan should keep the local one rather than blank it.
 */
function identityFromProfile(profile: ServerProfile, local: Identity): Identity {
  return {
    name: profile.name.trim() || local.name,
    slogan: profile.slogan || local.slogan,
    avatar: profile.avatarId ? avatarFor(profile.avatarId) : local.avatar,
  };
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [ledger, setLedger] = useState<Ledger>(EMPTY_LEDGER);
  const [source, setSource] = useState<LedgerSource>("pending");
  const [started, setStarted] = useState<string[]>([]);
  const [identity, setIdentity] = useState<Identity>(DEFAULT_IDENTITY);
  const [hydrated, setHydrated] = useState(false);
  const [claimable, setClaimable] = useState<Ledger | null>(null);
  /** Guards against a late response from a superseded fetch overwriting a newer one. */
  const generation = useRef(0);

  /**
   * The local ledger, if it holds anything worth importing.
   *
   * Only offered when the server says this player has never claimed. A ledger
   * with no completed missions is nothing to import, so it is treated as
   * absent rather than prompting about an empty history.
   */
  const resolveClaimable = useCallback((claimed: boolean) => {
    if (claimed) return setClaimable(null);
    const local = loadLedger();
    setClaimable(Object.keys(local.missions).length > 0 ? local : null);
  }, []);

  /**
   * Everything that lives in `localStorage` and still legitimately does.
   *
   * Returns the identity it read as well as setting it, so a server profile can
   * be layered on top field by field — `setIdentity` is asynchronous, so the
   * caller cannot read back what it just stored.
   */
  const readLocalState = useCallback((): Identity => {
    setStarted(startedMissionIds());
    const local = readIdentity();
    setIdentity(local);
    return local;
  }, []);

  const load = useCallback(async () => {
    const mine = ++generation.current;
    const local = readLocalState();

    // Opening the app is activity: it is what a streak actually measures. The
    // local date goes with it because streaks are counted in local days, and
    // the server bounds it — so this states a timezone, not a fact.
    const result = await recordActivity(today());
    if (mine !== generation.current) return;

    if (result.status === "ok") {
      setLedger(result.ledger);
      setSource("server");
      // The server owns identity for a signed-in player: it is what the
      // leaderboard renders, so the top bar must agree with it.
      if (result.profile) setIdentity(identityFromProfile(result.profile, local));
      resolveClaimable(result.claimed);
    } else {
      // Signed out, or the server is unreachable. Either way the local ledger
      // is the best truth available and is shown read-only — nothing extends
      // it, so this can never diverge into a second set of earned numbers.
      setLedger(loadLedger());
      setSource("local");
      setClaimable(null);
    }
    setHydrated(true);
  }, [readLocalState, resolveClaimable]);

  const refresh = useCallback(() => {
    const mine = ++generation.current;
    const local = readLocalState();
    void fetchLedger().then((result) => {
      if (mine !== generation.current) return;
      if (result.status === "ok") {
        setLedger(result.ledger);
        setSource("server");
        if (result.profile) setIdentity(identityFromProfile(result.profile, local));
        resolveClaimable(result.claimed);
      } else if (result.status === "unauthenticated") {
        setLedger(loadLedger());
        setSource("local");
        setClaimable(null);
      }
      // A failed refresh keeps what is on screen: a transient error should not
      // look like progress disappearing.
    });
  }, [readLocalState, resolveClaimable]);

  useEffect(() => {
    void load();

    // Stage state (run telemetry, saved picks) still lives in `localStorage`,
    // so a write in this tab or another one still means "re-read the parts
    // that are local". The ledger itself is refetched rather than re-read.
    const onChange = () => refresh();
    window.addEventListener(PROGRESS_EVENT, onChange);
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key.startsWith("coderaid:")) onChange();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(PROGRESS_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
    // `load` runs once on mount; `refresh` is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const adopt = useCallback((next: Ledger, claimed?: boolean) => {
    generation.current += 1;
    setLedger(next);
    setSource("server");
    setStarted(startedMissionIds());
    if (claimed) setClaimable(null);
  }, []);

  const value = useMemo<ProgressContextValue>(() => {
    const view: PlayerView = { ledger, startedMissionIds: started };
    return {
      ledger,
      view,
      player: playerFrom(ledger, identity.name),
      avatar: identity.avatar,
      slogan: identity.slogan,
      hydrated,
      source,
      authenticated: source === "server",
      claimable,
      adopt,
      refresh,
    };
  }, [ledger, started, identity, hydrated, source, claimable, adopt, refresh]);

  return (
    <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
  );
}

/**
 * The player's progress. Safe outside a provider — it returns the zero state,
 * which is what a player with no history genuinely has.
 */
export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (ctx) return ctx;
  return {
    ledger: EMPTY_LEDGER,
    view: EMPTY_VIEW,
    player: playerFrom(EMPTY_LEDGER),
    avatar: DEFAULT_AVATAR,
    slogan: DEFAULT_SLOGAN,
    hydrated: false,
    source: "pending",
    authenticated: false,
    claimable: null,
    adopt: () => {},
    refresh: () => {},
  };
}

export { PROGRESS_KEY };
