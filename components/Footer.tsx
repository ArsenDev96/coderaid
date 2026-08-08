import { Logo } from "./ui/Logo";

/*
  Every link here goes somewhere real.

  Removed: Privacy Policy and Terms of Service, which both pointed at `/demo`
  — a placeholder page reading "Watch the demo" — plus GitHub, Twitter and
  Discord, which pointed at the same placeholder. Now that there are real
  accounts and a real database behind them, a Terms link that is not terms is
  worse than no link: it implies an agreement that does not exist. They come
  back when the pages do.
*/
const PRODUCT_LINKS = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Mission Preview", href: "#mission" },
  { label: "Node.js Skills", href: "/skills" },
  { label: "Career Path", href: "#career" },
  { label: "Missions", href: "/missions" },
  { label: "Leaderboards", href: "/leaderboards" },
];

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-base-950/60">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-8 lg:flex-row lg:justify-between lg:gap-10">
          <Logo withTagline tagline="Node.js Debugging Simulator" />

          {/* Links */}
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 lg:gap-x-7">
            {PRODUCT_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-xs text-slate-400 transition-colors hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Derived, not typed in: a hardcoded year is correct until it silently
            is not, and this is a server component, so it resolves at build. */}
        <p className="mt-8 border-t border-white/[0.06] pt-5 text-center text-xs text-slate-600">
          © {new Date().getFullYear()} CodeRaid. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
