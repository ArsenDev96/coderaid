import {
  EMPTY_VIEW,
  canStart,
  missionAvailability,
  recommendedMission,
  type PlayerView,
} from "./availability";
import { NODE_MISSIONS, getMission, type Mission } from "./missions";
import { recommendedStartingMission } from "./onboarding";

/**
 * What `/start` should show, and where it should send a returning player.
 *
 * Pure over plain data, in the same spirit as `lib/stage-access.ts`: the rules
 * live here and the component supplies the `localStorage` reads and the
 * navigation. That is what makes the returning-player redirect testable in a
 * Node environment, where a router is not available.
 *
 * None of this duplicates the recommendation logic — every mission decision
 * below delegates to `lib/availability.ts`, which is the single source of truth
 * for what a player can do next.
 */

export type StartDestination =
  /** Onboarding has not been completed — run the wizard. */
  | { kind: "onboarding" }
  /** Completed *just now*, in this interaction — show the compact success card. */
  | { kind: "success" }
  /** Completed on an earlier visit — resume the mission they should be playing. */
  | { kind: "resume"; mission: Mission }
  /** Completed, and every playable mission is finished. */
  | { kind: "dashboard" };

export type StartState = {
  /** `ProfileDraft.completed` — persisted, so true on every later visit. */
  completed: boolean;
  /**
   * Whether the player finished onboarding in *this* interaction.
   *
   * Deliberately **not** persisted. It is the whole difference between "you
   * just set up your profile" and "you set it up last week", and persisting it
   * would recreate the problem it exists to solve: `/start` greeting a
   * returning player with a success screen for something they did days ago.
   */
  justCompleted: boolean;
  /** `ProfileDraft.experienceId` — what the success card recommended. */
  experienceId: string;
};

/**
 * The mission a returning player should be sent back to, in priority order:
 *
 *   1. one they have **started** and not finished,
 *   2. the incident their onboarding answers recommended, if unfinished,
 *   3. any other unfinished playable mission,
 *   4. nothing — everything is done, so the caller sends them to the dashboard.
 *
 * Rule 2 is why this does not simply call `recommendedMission()`. That helper
 * ranks by catalogue order once nothing is in progress, so a Junior player told
 * "start Promise.all Failure Cascade" on the success card would be redirected
 * to Event Loop Overload the next time they opened `/start` — contradicting the
 * only instruction the app had given them. Everything below still delegates to
 * `lib/availability.ts` for what "playable" and "completed" mean.
 */
export function returningMission(
  view: PlayerView = EMPTY_VIEW,
  experienceId?: string,
): Mission | undefined {
  const playable = NODE_MISSIONS.filter((m) => canStart(m, view));
  const unfinished = (m: Mission) => missionAvailability(m, view) !== "completed";

  const inProgress = playable.find(
    (m) => missionAvailability(m, view) === "current",
  );
  if (inProgress) return inProgress;

  if (experienceId !== undefined) {
    const recommended = firstIncident(experienceId, view);
    if (recommended && unfinished(recommended)) return recommended;
  }

  return playable.find(unfinished);
}

/** What `/start` should render or do, given the draft and the player's progress. */
export function startDestination(
  state: StartState,
  view: PlayerView = EMPTY_VIEW,
): StartDestination {
  if (!state.completed) return { kind: "onboarding" };
  if (state.justCompleted) return { kind: "success" };

  const mission = returningMission(view, state.experienceId);
  return mission ? { kind: "resume", mission } : { kind: "dashboard" };
}

/**
 * The mission the success card offers as the first incident.
 *
 * The onboarding suggestion is a static map from experience level
 * (`recommendedStartingMission`), so it can name a mission that is not
 * playable — today it never does, but it is authored content and nothing stops
 * it. So it is only used when `canStart()` agrees, and otherwise falls through
 * to the same `recommendedMission()` every other surface uses. Returns
 * `undefined` only if nothing at all is playable, which the caller renders as a
 * link to the mission list rather than a dead CTA.
 */
export function firstIncident(
  experienceId: string,
  view: PlayerView = EMPTY_VIEW,
): Mission | undefined {
  const preferred = getMission(recommendedStartingMission(experienceId).id);
  if (preferred && canStart(preferred, view)) return preferred;
  return recommendedMission(view);
}

/**
 * What is actually stored where, told truthfully for this player.
 *
 * The old copy said "Your profile is saved in this browser" to everyone. For a
 * signed-in player that is misleading by omission: their scores, XP, skills,
 * achievements and rank are derived in Postgres from graded runs (§16), and
 * only their profile *preferences* are local. For a signed-out player it was
 * accurate but incomplete — it never said what an account is for, which is the
 * one thing they need to know before running verification.
 */
export type StorageNote = { primary: string; secondary: string };

export function storageNote(authenticated: boolean): StorageNote {
  return authenticated
    ? {
        primary: "Your scores and progress are saved to your account.",
        secondary:
          "Your local profile preferences remain available in this browser.",
      }
    : {
        primary:
          "You can investigate missions without an account. Sign in when you run verification to save your score and progress.",
        secondary:
          "Your profile and unfinished mission state are saved in this browser.",
      };
}
