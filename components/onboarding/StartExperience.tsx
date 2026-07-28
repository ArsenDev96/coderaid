"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { OnboardingAside } from "@/components/onboarding/OnboardingAside";
import { OnboardingSuccess } from "@/components/onboarding/OnboardingSuccess";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { useProgress } from "@/components/progress/ProgressProvider";
import { resumeFor } from "@/components/missions/map/useMissionResume";
import {
  DEFAULT_DRAFT,
  loadDraft,
  saveDraft,
  type ProfileDraft,
} from "@/lib/onboarding";
import { startDestination, storageNote } from "@/lib/start";

/**
 * Everything `/start` renders, and the decision about which of its three states
 * to be in. There is deliberately **no second route**: the success state and
 * the returning-player redirect both live here.
 *
 * The states, decided by `startDestination()` in `lib/start.ts`:
 *
 *   - **onboarding** — the four-step wizard beside the marketing column.
 *   - **success** — a compact, centred, one-time card. The marketing column and
 *     the header's "Already have progress? Continue" action are gone: the
 *     player has finished setting up, so continuing to sell the product and
 *     offering a fourth competing action is noise.
 *   - **resume / dashboard** — a returning player is *redirected*. Showing
 *     "You're ready!" to someone who set their profile up last week, every time
 *     they open `/start`, is the specific problem this split exists to fix.
 *
 * `justCompleted` is React state and is never persisted — see `StartState` in
 * `lib/start.ts` for why that is the load-bearing part.
 */
export function StartExperience() {
  const router = useRouter();
  const { view, hydrated: progressHydrated, authenticated } = useProgress();

  const [draft, setDraft] = useState<ProfileDraft>(DEFAULT_DRAFT);
  const [hydrated, setHydrated] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  /** A redirect must only ever be issued once, even if progress re-renders. */
  const redirected = useRef(false);

  // Read after mount, never during render — the hydration-safe pattern used by
  // every stateful component in this repo (§4.4).
  useEffect(() => {
    const saved = loadDraft();
    if (saved) setDraft(saved);
    setHydrated(true);
  }, []);

  // Persist only after hydration, so a default draft never overwrites a real
  // one on first paint.
  useEffect(() => {
    if (hydrated) saveDraft(draft);
  }, [draft, hydrated]);

  const update = useCallback(
    <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) =>
      setDraft((d) => ({ ...d, [key]: value })),
    [],
  );

  const onComplete = useCallback(() => {
    setJustCompleted(true);
    setDraft((d) => ({ ...d, completed: true }));
  }, []);

  const destination = startDestination(
    {
      completed: draft.completed,
      justCompleted,
      experienceId: draft.experienceId,
    },
    view,
  );

  /*
    Redirect a returning player.

    Waits for `progressHydrated` as well as the local draft: the destination
    depends on which missions this player has finished, and before the ledger
    resolves that list is empty — so redirecting early would send someone who
    has completed everything to mission one instead of the dashboard.

    `resumeFor` rather than the `useMissionResume` hook, so the stage is known
    before navigating instead of after a render.
  */
  useEffect(() => {
    if (redirected.current) return;
    if (!hydrated || !progressHydrated) return;
    if (destination.kind === "resume") {
      redirected.current = true;
      router.replace(resumeFor(destination.mission.id).href);
    } else if (destination.kind === "dashboard") {
      redirected.current = true;
      router.replace("/dashboard");
    }
  }, [hydrated, progressHydrated, destination, router]);

  const showingSuccess = destination.kind === "success";
  const leaving = destination.kind === "resume" || destination.kind === "dashboard";
  const note = storageNote(authenticated);

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* subtle grid backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-grid-fade opacity-[0.4] [background-size:44px_44px] [mask-image:radial-gradient(80%_60%_at_50%_0%,black,transparent)]"
      />

      {/* Top bar */}
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label="CodeRaid home">
          <span className="grid h-9 w-9 place-items-center rounded-lg border border-violet-500/30 bg-gradient-to-br from-violet-600/30 to-electric-500/20 shadow-neon">
            <Zap className="h-5 w-5 text-violet-300" strokeWidth={2.2} fill="currentColor" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-lg font-semibold tracking-tight text-white">
              Code<span className="text-gradient">Raid</span>
            </span>
            <span className="mt-0.5 text-[0.6rem] uppercase tracking-[0.2em] text-slate-500">
              Node.js Debugging Simulator
            </span>
          </span>
        </Link>

        {/*
          "Already have progress? Continue" only while onboarding is still in
          front of the player — it jumps to the wizard, which is exactly where
          a returning mid-onboarding player wants to be. Once setup is done the
          page already offers Start Mission and View Dashboard, so a third
          action pointing at a card that is no longer there is redundant.
        */}
        {!showingSuccess && !leaving && (
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-400 sm:inline">
              Already have progress?
            </span>
            <a
              href="#wizard"
              className="rounded-xl border border-white/12 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-white/25 hover:text-white"
            >
              Continue
            </a>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-10 pt-4 sm:px-6 lg:px-8 lg:pt-8">
        {leaving ? (
          // Briefly on screen while the redirect resolves. A short, honest line
          // rather than a spinner that implies work is happening.
          <p
            role="status"
            className="mx-auto max-w-xl pt-16 text-center text-sm text-slate-500"
          >
            Taking you back to your training…
          </p>
        ) : showingSuccess ? (
          <div className="flex justify-center pt-4 sm:pt-8">
            <OnboardingSuccess
              name={draft.name.trim()}
              experienceId={draft.experienceId}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2 lg:gap-12">
            <div className="order-2 lg:order-1 lg:pt-6">
              <OnboardingAside />
            </div>
            <div id="wizard" className="order-1 lg:order-2 scroll-mt-24">
              <OnboardingWizard
                draft={draft}
                update={update}
                onComplete={onComplete}
              />
            </div>
          </div>
        )}
      </main>

      {/* Bottom status bar */}
      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 sm:flex-row sm:px-6 lg:px-8">
          <Link
            href="/#how-it-works"
            className="group inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white"
          >
            <span className="text-slate-500">Need help getting started?</span>
            <span className="font-semibold text-violet-300">
              How CodeRaid Works
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-violet-300 transition-transform group-hover:translate-x-0.5" />
          </Link>

          {/*
            This used to read "Your progress is saved in this browser / No
            account required for MVP" for everyone. Both halves are now wrong
            for a signed-in player: their scores, XP, skills and rank are
            derived in Postgres from graded runs (§16). The copy follows the
            real auth state, and waits for it rather than guessing.

            Suppressed on the success state, where the card carries the same
            sentence — saying it twice on one screen is the kind of noise this
            pass exists to remove.
          */}
          {progressHydrated && !showingSuccess && (
            <div className="flex items-center gap-2.5 text-sm">
              <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400" />
              <div className="max-w-md leading-tight">
                <div className="font-medium text-slate-200">{note.primary}</div>
                <div className="text-xs text-slate-500">{note.secondary}</div>
              </div>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
