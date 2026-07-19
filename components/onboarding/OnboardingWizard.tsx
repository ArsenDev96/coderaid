"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  PartyPopper,
  Quote,
  User as UserIcon,
  type LucideIcon,
} from "lucide-react";
import { canStart, recommendedMission } from "@/lib/availability";
import { getMission } from "@/lib/missions";
import {
  AVATARS,
  DEFAULT_DRAFT,
  EXPERIENCE_LEVELS,
  NAME_MAX,
  PATHS,
  SLOGANS,
  STEPS,
  loadDraft,
  recommendedStartingMission,
  saveDraft,
  type ProfileDraft,
} from "@/lib/onboarding";

export function OnboardingWizard() {
  const [draft, setDraft] = useState<ProfileDraft>(DEFAULT_DRAFT);
  const [hydrated, setHydrated] = useState(false);

  // Load any saved progress once on mount (avoids hydration mismatch).
  useEffect(() => {
    const saved = loadDraft();
    if (saved) setDraft(saved);
    setHydrated(true);
  }, []);

  // Persist to localStorage whenever the draft changes (after hydration).
  useEffect(() => {
    if (hydrated) saveDraft(draft);
  }, [draft, hydrated]);

  const update = <K extends keyof ProfileDraft>(
    key: K,
    value: ProfileDraft[K],
  ) => setDraft((d) => ({ ...d, [key]: value }));

  const nameOk = draft.name.trim().length > 0;
  const canProceed = draft.step === 0 ? nameOk : true;
  const isLast = draft.step === STEPS.length - 1;

  const goNext = () => {
    if (!canProceed) return;
    if (isLast) {
      update("completed", true);
      return;
    }
    update("step", Math.min(draft.step + 1, STEPS.length - 1));
  };
  const goBack = () => update("step", Math.max(draft.step - 1, 0));

  const selectedPath = useMemo(
    () => PATHS.find((p) => p.id === draft.pathId) ?? PATHS[0],
    [draft.pathId],
  );
  const selectedExp = useMemo(
    () =>
      EXPERIENCE_LEVELS.find((e) => e.id === draft.experienceId) ??
      EXPERIENCE_LEVELS[0],
    [draft.experienceId],
  );

  const recommended = recommendedStartingMission(selectedExp.id);

  if (draft.completed) {
    return (
      <CompletedCard
        name={draft.name.trim()}
        missionTitle={recommended.title}
        missionId={recommended.id}
      />
    );
  }

  return (
    <div className="surface-strong flex flex-col p-6 sm:p-8">
      <header>
        <h2 className="text-lg font-bold uppercase tracking-wide text-white">
          Let&apos;s set up your profile
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Step {draft.step + 1} of {STEPS.length}
        </p>
      </header>

      <Stepper current={draft.step} onSelect={(i) => update("step", i)} />

      <div className="mt-8 flex-1">
        {draft.step === 0 && (
          <IdentityStep draft={draft} update={update} nameOk={nameOk} />
        )}
        {draft.step === 1 && (
          <ChoiceGrid
            items={PATHS.map((p) => ({
              id: p.id,
              title: p.title,
              description: p.description,
              icon: p.icon,
              meta: p.focus,
            }))}
            selectedId={selectedPath.id}
            onSelect={(id) => update("pathId", id)}
            heading="What do you want to get better at?"
            sub="Every goal runs on Node.js — this just shapes which incidents we surface first. You can change it any time."
          />
        )}
        {draft.step === 2 && (
          <ChoiceGrid
            items={EXPERIENCE_LEVELS.map((e) => ({
              id: e.id,
              title: e.title,
              description: e.description,
              meta: e.personalization,
            }))}
            selectedId={selectedExp.id}
            onSelect={(id) => update("experienceId", id)}
            heading="How much Node.js experience do you have?"
            sub="This isn't a rank — it only personalizes which missions we recommend and how difficult they start."
          />
        )}
        {draft.step === 3 && (
          <ConfirmStep
            draft={draft}
            pathTitle={selectedPath.title}
            expTitle={selectedExp.title}
            missionTitle={recommended.title}
          />
        )}
      </div>

      {/* Actions */}
      <div className="mt-8 flex items-center justify-between gap-3">
        {draft.step > 0 ? (
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-white/25 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        ) : (
          <span />
        )}

        <button
          type="button"
          onClick={goNext}
          disabled={!canProceed}
          className="inline-flex items-center gap-2 rounded-xl border border-violet-400/40 bg-gradient-to-r from-violet-600 to-electric-500 px-6 py-2.5 text-sm font-semibold text-white shadow-neon transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
        >
          {isLast ? "Enter CodeRaid" : "Continue"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------- Stepper -------------------------------- */

function Stepper({
  current,
  onSelect,
}: {
  current: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="mt-6 flex items-start">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        const reachable = i <= current;
        return (
          <div key={label} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              {/* left connector */}
              <span
                className={`h-px flex-1 ${
                  i === 0
                    ? "opacity-0"
                    : done || active
                      ? "bg-violet-500/60"
                      : "bg-white/10"
                }`}
              />
              <button
                type="button"
                onClick={() => reachable && onSelect(i)}
                disabled={!reachable}
                aria-current={active ? "step" : undefined}
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border text-xs font-semibold transition-colors ${
                  active
                    ? "border-violet-400 bg-violet-500/20 text-white shadow-neon"
                    : done
                      ? "border-violet-500/60 bg-violet-500/20 text-violet-200"
                      : "border-white/15 bg-white/[0.03] text-slate-500"
                } ${reachable ? "cursor-pointer" : "cursor-not-allowed"}`}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </button>
              {/* right connector */}
              <span
                className={`h-px flex-1 ${
                  i === STEPS.length - 1
                    ? "opacity-0"
                    : done
                      ? "bg-violet-500/60"
                      : "bg-white/10"
                }`}
              />
            </div>
            <span
              className={`mt-2 text-center text-[0.7rem] font-medium sm:text-xs ${
                active
                  ? "text-violet-300"
                  : done
                    ? "text-slate-300"
                    : "text-slate-500"
              }`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------------- Step 1: Identity ------------------------- */

function IdentityStep({
  draft,
  update,
  nameOk,
}: {
  draft: ProfileDraft;
  update: <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => void;
  nameOk: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <label
          htmlFor="dev-name"
          className="text-base font-semibold text-white"
        >
          What should we call you, Engineer?
        </label>
        <p className="mt-1 text-sm text-slate-400">
          This name will be shown on your profile and leaderboard.
        </p>
        <div className="relative mt-3">
          <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            id="dev-name"
            type="text"
            value={draft.name}
            maxLength={NAME_MAX}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Enter your developer name"
            autoComplete="off"
            className="w-full rounded-xl border border-white/10 bg-base-950/70 py-3 pl-10 pr-16 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/20"
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-500">
            {draft.name.length}/{NAME_MAX}
          </span>
        </div>
        {!nameOk && (
          <p className="mt-2 text-xs text-slate-500">
            Pick any handle — it&apos;s saved locally in your browser.
          </p>
        )}
      </div>

      {/* Avatar picker */}
      <div>
        <span className="text-base font-semibold text-white">
          Choose your avatar
        </span>
        <div className="mt-3 grid grid-cols-5 gap-2.5 sm:gap-3">
          {AVATARS.map((avatar) => {
            const Icon = avatar.icon;
            const selected = draft.avatarId === avatar.id;
            return (
              <button
                key={avatar.id}
                type="button"
                onClick={() => update("avatarId", avatar.id)}
                aria-pressed={selected}
                aria-label={`Avatar ${avatar.label}`}
                className={`relative aspect-square overflow-hidden rounded-xl border bg-gradient-to-br ${avatar.gradient} transition-transform hover:scale-[1.04] ${
                  selected
                    ? "border-violet-400 shadow-neon"
                    : "border-white/10"
                }`}
              >
                <span className="grid h-full w-full place-items-center">
                  <Icon
                    className={`h-7 w-7 ${selected ? "text-white" : "text-slate-300"}`}
                    strokeWidth={1.7}
                  />
                </span>
                {selected && (
                  <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-violet-500 text-white">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Slogan */}
      <div>
        <span className="text-base font-semibold text-white">
          Choose your slogan{" "}
          <span className="text-sm font-normal text-slate-500">(optional)</span>
        </span>
        <div className="relative mt-3">
          <Quote className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-400" />
          <select
            value={SLOGANS.includes(draft.slogan) ? draft.slogan : SLOGANS[0]}
            onChange={(e) => update("slogan", e.target.value)}
            aria-label="Choose your slogan"
            className="w-full appearance-none rounded-xl border border-white/10 bg-base-950/70 py-3 pl-10 pr-10 text-sm text-white outline-none transition-colors focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/20"
          >
            {SLOGANS.map((s) => (
              <option key={s} value={s} className="bg-base-900 text-white">
                {s}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        </div>
      </div>
    </div>
  );
}

/* -------------------- Steps 2 & 3: reusable choice grid ----------------- */

type ChoiceItem = {
  id: string;
  title: string;
  description: string;
  meta?: string;
  icon?: LucideIcon;
};

function ChoiceGrid({
  items,
  selectedId,
  onSelect,
  heading,
  sub,
}: {
  items: ChoiceItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  heading: string;
  sub: string;
}) {
  return (
    <div>
      <h3 className="text-base font-semibold text-white">{heading}</h3>
      <p className="mt-1 text-sm text-slate-400">{sub}</p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const Icon = item.icon;
          const selected = item.id === selectedId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-pressed={selected}
              className={`flex h-full flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors ${
                selected
                  ? "border-violet-400/60 bg-violet-500/[0.1] shadow-neon"
                  : "border-white/[0.08] bg-white/[0.02] hover:border-white/20"
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span
                  className={`grid h-9 w-9 place-items-center rounded-lg border ${
                    selected
                      ? "border-violet-400/40 bg-violet-500/15 text-violet-200"
                      : "border-white/10 bg-white/[0.03] text-slate-400"
                  }`}
                >
                  {Icon ? (
                    <Icon className="h-5 w-5" strokeWidth={1.9} />
                  ) : (
                    <span className="text-xs font-bold">
                      {item.title.charAt(0)}
                    </span>
                  )}
                </span>
                {selected && (
                  <CheckCircle2 className="h-5 w-5 text-violet-300" />
                )}
              </div>
              <span className="text-sm font-semibold text-white">
                {item.title}
              </span>
              <span className="text-xs leading-relaxed text-slate-400">
                {item.description}
              </span>
              {item.meta && (
                <span className="mt-1 rounded-md bg-white/[0.04] px-2 py-0.5 font-mono text-[0.68rem] text-slate-400">
                  {item.meta}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ----------------------------- Step 4: Confirm -------------------------- */

function ConfirmStep({
  draft,
  pathTitle,
  expTitle,
  missionTitle,
}: {
  draft: ProfileDraft;
  pathTitle: string;
  expTitle: string;
  missionTitle: string;
}) {
  const avatar = AVATARS.find((a) => a.id === draft.avatarId) ?? AVATARS[0];
  const AvatarIcon = avatar.icon;
  const rows = [
    { label: "Learning goal", value: pathTitle },
    { label: "Experience", value: expTitle },
    { label: "Recommended mission", value: missionTitle },
  ];

  return (
    <div>
      <h3 className="text-base font-semibold text-white">
        Ready to start debugging
      </h3>
      <p className="mt-1 text-sm text-slate-400">
        Review the details below, then head into your first Node.js incident.
      </p>

      <div className="mt-4 rounded-xl border border-white/[0.08] bg-base-950/60 p-5">
        <div className="flex items-center gap-4">
          <span
            className={`grid h-14 w-14 place-items-center rounded-2xl border border-violet-400/40 bg-gradient-to-br ${avatar.gradient}`}
          >
            <AvatarIcon className="h-7 w-7 text-white" strokeWidth={1.7} />
          </span>
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold text-white">
              {draft.name.trim() || "Anonymous Engineer"}
            </div>
            <div className="truncate font-mono text-xs text-violet-300">
              &ldquo;
              {SLOGANS.includes(draft.slogan) ? draft.slogan : SLOGANS[0]}
              &rdquo;
            </div>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {rows.map((row) => (
            <div
              key={row.label}
              className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
            >
              <dt className="text-[0.68rem] uppercase tracking-wide text-slate-500">
                {row.label}
              </dt>
              <dd className="mt-0.5 text-sm font-medium text-white">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

/* ------------------------------ Completed ------------------------------- */

function CompletedCard({
  name,
  missionTitle,
  missionId,
}: {
  name: string;
  missionTitle: string;
  missionId: string;
}) {
  // Only ever link into a mission that can actually be played end to end.
  const suggested = getMission(missionId);
  const playable =
    suggested && canStart(suggested) ? suggested : recommendedMission();
  const missionHref = playable
    ? `/missions/${playable.id}/briefing`
    : "/missions";
  const missionLabel = playable
    ? `Start ${playable.title}`
    : "Browse missions";
  const playableIsRecommended = playable?.id === missionId;

  return (
    <div className="surface-strong flex flex-col items-center p-8 text-center sm:p-10">
      <span className="grid h-14 w-14 place-items-center rounded-2xl border border-emerald-400/30 bg-emerald-500/10 text-emerald-300 shadow-neon">
        <PartyPopper className="h-7 w-7" />
      </span>
      <h2 className="mt-5 text-2xl font-bold text-white">
        You&apos;re all set{name ? `, ${name}` : ""}!
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
        Your profile is saved in this browser. We recommend starting with{" "}
        <span className="text-violet-300">{missionTitle}</span>
        {playableIsRecommended
          ? "."
          : " — more Node.js incidents are being written, so pick a playable one to begin."}
      </p>
      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-400/40 bg-gradient-to-r from-violet-600 to-electric-500 px-6 py-2.5 text-sm font-semibold text-white shadow-neon transition-transform hover:scale-[1.03]"
        >
          Enter Dashboard
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href={missionHref}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-6 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-white/25 hover:text-white"
        >
          {missionLabel}
        </Link>
      </div>
    </div>
  );
}
