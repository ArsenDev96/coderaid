import Link from "next/link";
import { Github, Linkedin, MessageCircle, Twitter } from "lucide-react";
import { Logo } from "./ui/Logo";

const FOOTER_COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "How It Works", href: "#how-it-works" },
      { label: "Missions", href: "#mission" },
      { label: "Career Path", href: "#career" },
      { label: "Skills", href: "#skills" },
      { label: "Pricing", href: "#pricing" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Docs", href: "/demo" },
      { label: "Blog", href: "/demo" },
      { label: "Guides", href: "/demo" },
      { label: "Changelog", href: "/demo" },
      { label: "Help Center", href: "/demo" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/demo" },
      { label: "Careers", href: "/demo" },
      { label: "Contact", href: "/demo" },
      { label: "Privacy Policy", href: "/demo" },
      { label: "Terms of Service", href: "/demo" },
    ],
  },
];

const SOCIALS = [
  { label: "GitHub", href: "/demo", icon: Github },
  { label: "Discord", href: "/demo", icon: MessageCircle },
  { label: "Twitter", href: "/demo", icon: Twitter },
  { label: "LinkedIn", href: "/demo", icon: Linkedin },
];

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-base-950/60">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4 lg:grid-cols-6">
          {/* Brand */}
          <div className="col-span-2">
            <Logo withTagline />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
              Level up your engineering skills through real-world missions.
            </p>
            <div className="mt-5 flex gap-2">
              {SOCIALS.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    className="grid h-9 w-9 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.02] text-slate-400 transition-colors hover:border-white/20 hover:text-white"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Link columns */}
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-slate-400 transition-colors hover:text-white"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Stay updated */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Stay Updated
            </h4>
            <p className="mt-4 text-sm text-slate-400">
              Get mission drops and product updates.
            </p>
            <form
              className="mt-3 flex gap-2"
              // Static MVP form — no submission wired up.
            >
              <input
                type="email"
                required
                aria-label="Email address"
                placeholder="Enter your email"
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-base-950/70 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/20"
              />
              <button
                type="submit"
                className="shrink-0 rounded-lg border border-violet-400/40 bg-gradient-to-r from-violet-600 to-electric-500 px-4 py-2 text-sm font-semibold text-white shadow-neon transition-transform hover:scale-[1.03]"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/[0.06] pt-6 sm:flex-row">
          <p className="text-xs text-slate-500">
            © 2026 CodeRaid. All rights reserved.
          </p>
          <p className="font-mono text-xs text-slate-600">
            Play like a software engineer.
          </p>
        </div>
      </div>
    </footer>
  );
}
