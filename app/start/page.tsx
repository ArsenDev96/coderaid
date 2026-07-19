import Link from "next/link";
import { ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { OnboardingAside } from "@/components/onboarding/OnboardingAside";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export const metadata = {
  title: "Create Your Profile — CodeRaid",
  description:
    "Set up your CodeRaid profile and start your first Node.js debugging mission. No account required.",
};

export default function StartPage() {
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
      </header>

      {/* Main two-column layout */}
      <main className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 items-start gap-8 px-4 pb-10 pt-4 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:px-8 lg:pt-8">
        <div className="order-2 lg:order-1 lg:pt-6">
          <OnboardingAside />
        </div>
        <div id="wizard" className="order-1 lg:order-2 scroll-mt-24">
          <OnboardingWizard />
        </div>
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

          <div className="flex items-center gap-2.5 text-sm">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <div className="leading-tight">
              <div className="font-medium text-slate-200">
                Your progress is saved in this browser
              </div>
              <div className="text-xs text-slate-500">
                No account required for MVP
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
