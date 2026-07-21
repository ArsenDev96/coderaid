"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Github, Loader2, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const ERRORS: Record<string, string> = {
  missing_code: "GitHub didn't send a sign-in code back. Please try again.",
  exchange_failed:
    "That sign-in link has already been used or has expired. Please try again.",
};

/**
 * GitHub is the only provider on purpose: CodeRaid's players are backend
 * engineers, it means no password handling, and the account already carries a
 * display name and avatar the onboarding profile can start from.
 */
export function SignInCard({ error, next }: { error?: string; next?: string }) {
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string | null>(
    error ? (ERRORS[error] ?? "Sign-in failed. Please try again.") : null,
  );

  async function signIn() {
    setPending(true);
    setFailure(null);

    const redirectTo = new URL("/auth/callback", window.location.origin);
    if (next) redirectTo.searchParams.set("next", next);

    const { error: oauthError } = await createClient().auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: redirectTo.toString() },
    });

    // On success the browser has already left for GitHub, so reaching here
    // with no error means the redirect is in flight — keep the button spinning.
    if (oauthError) {
      setFailure("Couldn't reach GitHub. Check your connection and try again.");
      setPending(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="surface-strong w-full max-w-md p-8 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-600/30 to-electric-500/20 shadow-neon">
          <Zap
            className="h-6 w-6 text-violet-300"
            strokeWidth={2.2}
            fill="currentColor"
          />
        </span>

        <h1 className="mt-5 text-2xl font-semibold text-white">
          Sign in to CodeRaid
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Your missions, XP, rank and skill progress follow your account across
          devices.
        </p>

        {failure && (
          <p
            role="alert"
            className="mt-5 rounded-lg border border-rose-400/25 bg-rose-500/[0.08] px-3 py-2 text-xs text-rose-200"
          >
            {failure}
          </p>
        )}

        <button
          type="button"
          onClick={signIn}
          disabled={pending}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-violet-400/40 bg-gradient-to-r from-violet-600 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-neon transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Opening GitHub…
            </>
          ) : (
            <>
              <Github className="h-4 w-4" />
              Continue with GitHub
            </>
          )}
        </button>

        <Link
          href="/"
          className="mt-5 inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to landing
        </Link>
      </div>
    </main>
  );
}
