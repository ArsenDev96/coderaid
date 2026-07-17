import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { SettingsWorkspace } from "@/components/settings/SettingsWorkspace";

export const metadata = {
  title: "Settings — CodeRaid",
  description: "Customize your experience and manage your account.",
};

export default function SettingsPage() {
  return (
    <DashboardShell active="Settings">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Settings
        </h1>
        <p className="mt-1.5 text-sm text-slate-400 sm:text-base">
          Customize your experience and manage your account.
        </p>
      </div>

      <SettingsWorkspace />
    </DashboardShell>
  );
}
