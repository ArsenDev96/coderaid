import { Github, MessageCircle, Twitter } from "lucide-react";
import { Logo } from "./ui/Logo";

const PRODUCT_LINKS = [
  { label: "Product", href: "#how-it-works" },
  { label: "Mission Preview", href: "#mission" },
  { label: "Skills", href: "#skills" },
  { label: "Career Path", href: "#career" },
  { label: "About", href: "/demo" },
  { label: "Contact", href: "/demo" },
];

const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "/demo" },
  { label: "Terms of Service", href: "/demo" },
];

const SOCIALS = [
  { label: "GitHub", href: "/demo", icon: Github },
  { label: "Twitter", href: "/demo", icon: Twitter },
  { label: "Discord", href: "/demo", icon: MessageCircle },
];

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-base-950/60">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-8 lg:flex-row lg:justify-between lg:gap-10">
          <Logo withTagline tagline="Play. Learn. Level Up." />

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
            <span aria-hidden className="hidden h-4 w-px bg-white/10 lg:block" />
            {LEGAL_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-xs text-slate-500 transition-colors hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Socials */}
          <div className="flex gap-2">
            {SOCIALS.map((social) => {
              const Icon = social.icon;
              return (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.02] text-slate-400 transition-colors hover:border-white/20 hover:text-white"
                >
                  <Icon className="h-3.5 w-3.5" />
                </a>
              );
            })}
          </div>
        </div>

        <p className="mt-8 border-t border-white/[0.06] pt-5 text-center text-xs text-slate-600">
          © 2026 CodeRaid. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
