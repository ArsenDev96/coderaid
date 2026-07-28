"use client";

import Link from "next/link";
import { LogOut, X } from "lucide-react";
import { SIDEBAR_ITEMS } from "@/lib/dashboard";
import { Logo } from "@/components/ui/Logo";

export function DashboardSidebar({
  active = "Dashboard",
  open = false,
  onClose,
}: {
  active?: string;
  open?: boolean;
  onClose?: () => void;
}) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col overflow-y-auto border-r border-white/[0.06] bg-base-950/95 p-4 transition-transform duration-300 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-[15.5rem] lg:translate-x-0 lg:bg-base-950/40 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <Logo withTagline />
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-slate-300 lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="mt-6 flex flex-col gap-1">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.label === active;
            const className = `flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors ${
              isActive
                ? "border border-violet-400/40 bg-violet-500/[0.12] text-white shadow-neon"
                : "border border-transparent text-slate-400 hover:bg-white/5 hover:text-white"
            }`;
            const inner = (
              <>
                <Icon className="h-[1.15rem] w-[1.15rem] shrink-0" strokeWidth={1.9} />
                {item.label}
              </>
            );
            return item.href ? (
              <Link
                key={item.label}
                href={item.href}
                onClick={onClose}
                aria-current={isActive ? "page" : undefined}
                className={className}
              >
                {inner}
              </Link>
            ) : (
              <button key={item.label} type="button" className={className}>
                {inner}
              </button>
            );
          })}
        </nav>

        {/*
          Log out — a form, not a link.

          This used to be <Link href="/">, which navigated to the landing page
          and left the session entirely intact: coming back to /dashboard was
          still signed in, and on a shared machine the next person inherited
          the account. The route that actually ends the session already
          existed; nothing called it.

          It is a POST because a GET sign-out would let any page on the
          internet log the player out with an <img> tag, and a plain form
          rather than a fetch because the redirect it returns reloads the
          document — which is what clears the signed-in ledger the provider is
          holding in memory. It also works with JavaScript disabled.
        */}
        {/* `mt-auto` moved here from the deleted Premium block — it is what
            holds the sidebar's last item against the bottom. */}
        <form action="/auth/sign-out" method="post" className="mt-auto pt-4">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.9} />
            Log out
          </button>
        </form>
      </aside>
    </>
  );
}
