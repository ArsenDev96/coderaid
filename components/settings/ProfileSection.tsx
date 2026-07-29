"use client";

import { useEffect, useState } from "react";
import { Check, UserRound } from "lucide-react";
import { useProgress } from "@/components/progress/ProgressProvider";
import {
  AVATARS,
  DEFAULT_DRAFT,
  NAME_MAX,
  loadDraft,
  saveDraft,
  type ProfileDraft,
} from "@/lib/onboarding";
import { saveProfile } from "@/lib/profile-client";
import { SectionCard } from "./SectionCard";

export type ProfileValues = { name: string; avatarId: string };

/**
 * Display name and avatar.
 *
 * Written to `coderaid:profile` — the record that already owns the player's
 * identity — and, for a signed-in player, to `players.display_name` and
 * `players.avatar_id` via `POST /api/profile`. The rest of the draft (path,
 * experience, onboarding step) is preserved on save, so editing a name here
 * can't reopen onboarding.
 *
 * Both writes, not one. The local copy is what a signed-out player has and what
 * the app renders before the ledger resolves; the server copy is what the
 * leaderboard shows everyone else. This used to be local only, which is why the
 * caption below it — "this is how other backend developers see you" — was the
 * last untrue sentence in the app (§12 item 17).
 *
 * The server write is best-effort by design: a failed request leaves the local
 * save intact rather than discarding the edit, and the player is told which of
 * the two happened rather than being shown an unqualified "Saved".
 */
export function ProfileSection({
  onDraftChange,
}: {
  /** Lets the preview panel mirror the field before it's saved. */
  onDraftChange: (values: ProfileValues) => void;
}) {
  const { authenticated, refresh } = useProgress();
  const [draft, setDraft] = useState<ProfileDraft>(DEFAULT_DRAFT);
  const [name, setName] = useState("");
  const [avatarId, setAvatarId] = useState(DEFAULT_DRAFT.avatarId);
  /** null = nothing to report yet. */
  const [saved, setSaved] = useState<"local" | "server" | "failed" | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const stored = loadDraft() ?? DEFAULT_DRAFT;
    setDraft(stored);
    setName(stored.name);
    setAvatarId(stored.avatarId);
    onDraftChange({ name: stored.name, avatarId: stored.avatarId });
    // Runs once on mount; `onDraftChange` is only used to seed the preview.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trimmed = name.trim();
  const dirty = trimmed !== draft.name || avatarId !== draft.avatarId;
  const canSave = dirty && trimmed.length > 0;

  function change(next: Partial<ProfileValues>) {
    const values = { name, avatarId, ...next };
    if (next.name !== undefined) setName(next.name);
    if (next.avatarId !== undefined) setAvatarId(next.avatarId);
    setSaved(null);
    onDraftChange(values);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave || saving) return;

    // Spread the stored draft so unrelated onboarding fields survive the save.
    const next: ProfileDraft = { ...draft, name: trimmed, avatarId };
    saveDraft(next);
    setDraft(next);
    setName(trimmed);
    onDraftChange({ name: trimmed, avatarId });

    // Signed out there is nowhere to send it, and saying so is the honest
    // version of what this button has always actually done.
    if (!authenticated) {
      setSaved("local");
      return;
    }

    setSaving(true);
    const stored = await saveProfile(next);
    setSaving(false);

    if (!stored) {
      setSaved("failed");
      return;
    }

    // The server may have shortened the name or stripped characters from it.
    // Adopt what it stored so the field shows what other players will see.
    if (stored.name !== trimmed) {
      const reconciled = { ...next, name: stored.name };
      saveDraft(reconciled);
      setDraft(reconciled);
      setName(stored.name);
      onDraftChange({ name: stored.name, avatarId });
    }

    setSaved("server");
    // Re-read so the top bar and greeting show the new name at once rather
    // than on the next navigation.
    refresh();
  }

  return (
    <SectionCard
      icon={UserRound}
      title="Profile"
      description="Manage your public profile."
    >
      <form onSubmit={submit}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          {/* Avatar picker — the shared onboarding avatar set */}
          <fieldset className="min-w-0">
            <legend className="mb-2 text-xs text-slate-400">Avatar</legend>
            <div className="flex flex-wrap gap-2">
              {AVATARS.map((a) => {
                const Icon = a.icon;
                const active = a.id === avatarId;
                return (
                  <button
                    key={a.id}
                    type="button"
                    aria-pressed={active}
                    aria-label={a.label}
                    onClick={() => change({ avatarId: a.id })}
                    className={`relative grid h-12 w-12 place-items-center rounded-xl border bg-gradient-to-br transition-transform hover:scale-105 ${a.gradient} ${
                      active
                        ? "border-violet-400/70 shadow-neon"
                        : "border-white/10"
                    }`}
                  >
                    <Icon className="h-5 w-5 text-white" strokeWidth={1.8} />
                    {active && (
                      <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-violet-500 text-white">
                        <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Display name */}
          <div className="min-w-0 flex-1">
            <label
              htmlFor="display-name"
              className="mb-2 block text-xs text-slate-400"
            >
              Display name
            </label>
            <input
              id="display-name"
              value={name}
              maxLength={NAME_MAX}
              onChange={(e) => change({ name: e.target.value })}
              placeholder="Your engineer name"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition-colors hover:border-white/20 focus:border-violet-400/60"
            />
            <p className="mt-2 text-xs text-slate-500">
              {authenticated
                ? "This is how other backend developers see you on the CodeRaid leaderboard."
                : "Saved in this browser. Sign in to show this name on the leaderboard."}
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          {/*
            Three outcomes, not one. "Saved" alone was accurate when the only
            destination was localStorage; now it would hide the difference
            between a name everyone can see and a name only this browser has.
          */}
          {saved === "server" && (
            <span
              role="status"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300"
            >
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
              Saved to your profile
            </span>
          )}
          {saved === "local" && (
            <span role="status" className="text-xs font-medium text-slate-400">
              Saved in this browser
            </span>
          )}
          {saved === "failed" && (
            <span role="status" className="text-xs font-medium text-amber-300">
              Saved locally — couldn&apos;t reach the server
            </span>
          )}
          <button
            type="submit"
            disabled={!canSave || saving}
            className="w-full rounded-xl border border-violet-400/40 bg-gradient-to-r from-violet-600 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-neon transition-transform hover:scale-[1.02] disabled:pointer-events-none disabled:opacity-40 sm:w-auto"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </SectionCard>
  );
}
