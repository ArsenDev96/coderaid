"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, LogIn, LogOut, Settings, Star } from "lucide-react";
import { useProgress } from "@/components/progress/ProgressProvider";

/**
 * The account menu in the dashboard top bar.
 *
 * It used to be a `<button aria-label="Account menu">` with a chevron and no
 * handler — the worst shape decoration can take, because the label *announced*
 * a menu that could not be opened and the chevron promised a dropdown to
 * everyone else. It appears on every page inside `DashboardShell`.
 *
 * The last item depends on whether there is a session to end. Missions play
 * without an account, so a signed-out visitor genuinely reaches these pages,
 * and offering them "Log out" would replace one piece of theatre with another.
 * `useProgress().authenticated` is true exactly when the ledger came from the
 * server, which is the same question.
 *
 * Log out is a form POSTing to `/auth/sign-out`, matching `DashboardSidebar`:
 * the route is deliberately POST-only, so a `<Link>` could never reach it.
 */
export function AccountMenu() {
  const { avatar, authenticated } = useProgress();
  const AvatarIcon = avatar.icon;
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  // Close on an outside press or Escape. `pointerdown` rather than `click` so
  // the menu is gone before whatever was clicked underneath reacts.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      if (!container.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const itemClass =
    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white";

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1.5 transition-colors hover:border-white/20"
      >
        <span
          className={`grid h-9 w-9 place-items-center rounded-lg border border-violet-400/40 bg-gradient-to-br ${avatar.gradient}`}
        >
          <AvatarIcon className="h-5 w-5 text-white" strokeWidth={1.8} />
        </span>
        <ChevronDown
          className={`h-4 w-4 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-white/10 bg-base-950/95 p-1.5 shadow-xl backdrop-blur-xl"
        >
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={itemClass}
          >
            <Settings className="h-[1.05rem] w-[1.05rem]" strokeWidth={1.9} />
            Settings
          </Link>
          <Link
            href="/achievements"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={itemClass}
          >
            <Star className="h-[1.05rem] w-[1.05rem]" strokeWidth={1.9} />
            Achievements
          </Link>

          <div className="my-1.5 h-px bg-white/[0.08]" />

          {authenticated ? (
            <form action="/auth/sign-out" method="post">
              <button type="submit" role="menuitem" className={itemClass}>
                <LogOut className="h-[1.05rem] w-[1.05rem]" strokeWidth={1.9} />
                Log out
              </button>
            </form>
          ) : (
            <Link
              href="/sign-in"
              role="menuitem"
              onClick={() => setOpen(false)}
              className={itemClass}
            >
              <LogIn className="h-[1.05rem] w-[1.05rem]" strokeWidth={1.9} />
              Sign in
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
