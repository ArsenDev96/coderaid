import { Logo } from "./ui/Logo";

const PRODUCT_LINKS = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Mission Preview", href: "#mission" },
  { label: "Node.js Skills", href: "/skills" },
  { label: "Career Path", href: "#career" },
  { label: "Missions", href: "/missions" },
  { label: "Leaderboards", href: "/leaderboards" },
];

/*
 * The legal and social links are gone rather than repointed.
 *
 * All five — Privacy Policy, Terms of Service, GitHub, Twitter, Discord —
 * pointed at `/demo`, a placeholder page reading "Watch the demo". The legal
 * pair is the one that acquired real weight once accounts and a database
 * existed: a Terms link that is not terms is worse than no link, because it
 * implies terms were agreed to. Writing that copy is not a call this codebase
 * can make, so the links wait for the pages rather than the other way round.
 */

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

        <p className="mt-8 border-t border-white/[0.06] pt-5 text-center text-xs text-slate-600">
          © 2026 CodeRaid. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
