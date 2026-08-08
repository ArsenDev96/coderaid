"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { NAV_LINKS } from "@/lib/data";
import { useProgress } from "@/components/progress/ProgressProvider";
import { Logo } from "./ui/Logo";

/**
 * The landing page's account actions.
 *
 * A signed-in player reaches `/` on the ordinary path — logging out redirects
 * here, and the logo links here from every page — and used to be offered
 * "Sign In" for the account they were already in, with no route to their
 * dashboard anywhere on the page.
 *
 * `hydrated` is what keeps the swap honest. It is false during SSR and first
 * paint, so the static markup stays the signed-out pair and there is no
 * hydration mismatch; the dashboard link appears once the ledger resolves.
 * Same source of truth as `AccountMenu` — `authenticated` is true exactly when
 * the ledger came from the server.
 */
function AccountActions({ mobile = false }: { mobile?: boolean }) {
  const { authenticated, hydrated } = useProgress();

  const secondary = mobile
    ? "rounded-lg border border-white/10 px-4 py-2.5 text-center text-sm font-medium text-slate-200"
    : "rounded-lg border border-white/12 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-white/25 hover:text-white";
  const primary = mobile
    ? "rounded-lg border border-violet-400/40 bg-gradient-to-r from-violet-600 to-electric-500 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-neon"
    : "rounded-lg border border-violet-400/40 bg-gradient-to-r from-violet-600 to-electric-500 px-4 py-2 text-sm font-semibold text-white shadow-neon transition-transform hover:scale-[1.03]";

  if (hydrated && authenticated) {
    // One action, not two: "Start Your First Mission" is the wrong invitation
    // for someone who may have finished several.
    return (
      <Link href="/dashboard" className={primary}>
        Go to Dashboard
      </Link>
    );
  }

  return (
    <>
      <Link href="/sign-in" className={secondary}>
        Sign In
      </Link>
      <Link href="/start" className={primary}>
        Start Your First Mission
      </Link>
    </>
  );
}

/** Ties the toggle's `aria-controls` to the panel it opens. */
const MENU_ID = "site-menu";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Escape closes the menu, matching `AccountMenu`. Without it the only way
  // out on a phone is the toggle, which the open panel can scroll away from.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        scrolled
          ? "border-b border-white/[0.06] bg-base-950/80 backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Logo />

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2 md:flex">
          <AccountActions />
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 text-slate-200 md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls={MENU_ID}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div
          id={MENU_ID}
          className="border-t border-white/[0.06] bg-base-950/95 backdrop-blur-xl md:hidden"
        >
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-white/[0.06] pt-3">
              <AccountActions mobile />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
