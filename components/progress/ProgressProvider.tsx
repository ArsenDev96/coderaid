"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { EMPTY_VIEW, type PlayerView } from "@/lib/availability";
import { DEFAULT_PLAYER_NAME, playerFrom, type Player } from "@/lib/dashboard";
import { AVATARS, loadDraft, type Avatar } from "@/lib/onboarding";
import {
  EMPTY_LEDGER,
  PROGRESS_EVENT,
  PROGRESS_KEY,
  loadLedger,
  markActiveToday,
  saveLedger,
  type Ledger,
} from "@/lib/progress";
import { startedMissionIds } from "@/lib/run";

/**
 * Hydrates the player's real progression ledger and shares it with every view.
 *
 * The ledger lives in `localStorage`, which the server can't read, so the tree
 * renders once with `EMPTY_LEDGER` — a genuinely valid new-player state, not a
 * placeholder — and re-renders with the real one after mount. Components read
 * it through `useProgress()` and never touch storage themselves, so the
 * dashboard, the skills page and the mission list can't disagree about how far
 * the player has got.
 *
 * Writes go through `update()`, which persists and notifies every consumer,
 * including other open tabs.
 */

type ProgressContextValue = {
  ledger: Ledger;
  view: PlayerView;
  player: Player;
  avatar: Avatar;
  slogan: string;
  /** True once the real ledger has been read — false during SSR and first paint. */
  hydrated: boolean;
  /** Applies a change to the ledger and persists it. */
  update: (fn: (ledger: Ledger) => Ledger) => Ledger;
  /** Re-reads storage. Used after a stage writes run telemetry. */
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

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [ledger, setLedger] = useState<Ledger>(EMPTY_LEDGER);
  const [started, setStarted] = useState<string[]>([]);
  const [identity, setIdentity] = useState<Identity>(DEFAULT_IDENTITY);
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(() => {
    setLedger(loadLedger());
    setStarted(startedMissionIds());
    setIdentity(readIdentity());
  }, []);

  useEffect(() => {
    // Opening the app is activity: it is what a streak actually measures.
    const stored = loadLedger();
    const withToday = markActiveToday(stored);
    if (withToday !== stored) saveLedger(withToday);

    setLedger(withToday);
    setStarted(startedMissionIds());
    setIdentity(readIdentity());
    setHydrated(true);

    const onChange = () => refresh();
    // Same-tab writes fire the custom event; other tabs fire `storage`.
    window.addEventListener(PROGRESS_EVENT, onChange);
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key.startsWith("coderaid:")) refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(PROGRESS_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  const update = useCallback((fn: (current: Ledger) => Ledger) => {
    // Read-modify-write against storage, not state, so two updates in the same
    // tick can't drop one another's changes.
    const next = fn(loadLedger());
    saveLedger(next);
    setLedger(next);
    setStarted(startedMissionIds());
    return next;
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
      update,
      refresh,
    };
  }, [ledger, started, identity, hydrated, update, refresh]);

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
    update: () => EMPTY_LEDGER,
    refresh: () => {},
  };
}

export { PROGRESS_KEY };
