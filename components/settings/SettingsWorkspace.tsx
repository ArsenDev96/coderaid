"use client";

import { useState } from "react";
import { DEFAULT_DRAFT } from "@/lib/onboarding";
import { ExperienceSection } from "./ExperienceSection";
import { ProfilePreview } from "./ProfilePreview";
import { ProfileSection, type ProfileValues } from "./ProfileSection";
import { ProgressSection } from "./ProgressSection";

export function SettingsWorkspace() {
  // Held here so the preview can mirror the profile form as it's edited.
  const [profile, setProfile] = useState<ProfileValues>({
    name: DEFAULT_DRAFT.name,
    avatarId: DEFAULT_DRAFT.avatarId,
  });

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]">
      {/* 1 → 2 → 3: profile, experience, progress */}
      <div className="flex min-w-0 flex-col gap-6">
        <ProfileSection onDraftChange={setProfile} />
        <ExperienceSection />
        <ProgressSection />
      </div>

      {/* Preview sits alongside on desktop, below the form under xl */}
      <aside className="xl:sticky xl:top-24 xl:self-start">
        <ProfilePreview profile={profile} />
      </aside>
    </div>
  );
}
