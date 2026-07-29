"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, SquareDashedBottomCode } from "lucide-react";

/**
 * The landing page's playable-looking preview of the investigation stage.
 *
 * Everything in it is an excerpt of a **real mission** — `user-signup-latency-spike`,
 * quoted from its own entry in `lib/investigation.ts` — and the CTA opens that
 * mission. It used to be a mockup: three tabs that didn't switch and a primary
 * button with no handler, styled exactly like the working CTA beside it in
 * `HeroSection`. A preview of a product that doesn't do what the product does
 * is a worse advert than a screenshot, because a screenshot doesn't invite the
 * click.
 *
 * It stays hand-authored rather than importing the investigation config: this
 * is marketing copy that happens to be true, and pulling the live catalogue in
 * would put the whole mission content into the landing page's bundle to render
 * eight lines of it.
 */

/** The mission this preview is an excerpt of. */
const PREVIEW_MISSION_ID = "user-signup-latency-spike";

const TABS = ["Code", "Logs", "Metrics"] as const;
type Tab = (typeof TABS)[number];

const CODE_LINES: string[] = [
  "router.post('/api/signup', async (req, res) => {",
  "  const input = validateSignup(req.body);",
  "  const hash = await hashPassword(input.password);",
  "  const user = await users.insert({",
  "    email: input.email, hash",
  "  });",
  "  // response waits on the SMTP round trip",
  "  await sendWelcomeEmail(user.email);",
  "  return res.status(201).json({ id: user.id });",
  "});",
];

const CLUES = [
  "p95 on POST /api/signup is 3.2s",
  "Trace: send welcome email 2671ms",
  "Email awaited inside the request handler",
];

/**
 * The tail of the mission's own `auth-service` log window — the three lines
 * that carry the `response-waits-for-email` evidence, which is the finding the
 * clue rail beside it is already quoting.
 */
const LOG_LINES: { time: string; level: string; message: string }[] = [
  { time: "10:41:20.302", level: "INFO", message: "Password hash completed in 154ms" },
  { time: "10:41:20.338", level: "INFO", message: "User record inserted in 31ms" },
  { time: "10:41:20.341", level: "INFO", message: "Sending welcome email" },
  { time: "10:41:23.012", level: "INFO", message: "Welcome email sent in 2671ms" },
  { time: "10:41:23.018", level: "INFO", message: "POST /api/signup completed in 2916ms" },
];

/**
 * Four of the mission's six metric cards — the two that explain the slowdown
 * and the two that rule out the obvious wrong answers, which is the shape of
 * the actual reasoning rather than just the alarming numbers.
 */
const METRIC_CARDS: {
  label: string;
  value: string;
  detail: string;
  tone: "critical" | "warning" | "normal";
}[] = [
  {
    label: "Signup API p95",
    value: "3.2s",
    detail: "Was 420ms before 4.2.0",
    tone: "critical",
  },
  {
    label: "Email provider",
    value: "2.7s",
    detail: "At the provider boundary",
    tone: "warning",
  },
  {
    label: "Database insert",
    value: "31ms",
    detail: "Unchanged across the spike",
    tone: "normal",
  },
  {
    label: "App CPU usage",
    value: "38%",
    detail: "Flat across the slowdown",
    tone: "normal",
  },
];

const TONE_CLASS: Record<"critical" | "warning" | "normal", string> = {
  critical: "border-rose-500/30 bg-rose-500/[0.07] text-rose-300",
  warning: "border-amber-400/30 bg-amber-500/[0.07] text-amber-300",
  normal: "border-white/[0.08] bg-white/[0.02] text-slate-300",
};

// Jagged, upward-trending signup-latency series for the header sparkline.
const SPARK_POINTS =
  "0,26 12,22 24,25 36,17 48,21 60,12 72,18 84,8 96,14 108,5 120,10 132,3 144,7";

const KEYWORD = /\b(?:async|function|const|await|for|of|return)\b/;
const TOKENS = /(\/\/[^\n]*|\b(?:async|function|const|await|for|of|return)\b)/g;

/** Minimal highlighter — keywords and comments only, enough to read as code. */
function highlight(line: string) {
  return line
    .split(TOKENS)
    .filter(Boolean)
    .map((part, i) => {
      if (part.startsWith("//")) {
        return (
          <span key={i} className="text-slate-600">
            {part}
          </span>
        );
      }
      if (KEYWORD.test(part)) {
        return (
          <span key={i} className="text-violet-300">
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
}

/** The left-hand panel for the selected tool tab. */
function ToolPanel({ tab }: { tab: Tab }) {
  if (tab === "Logs") {
    return (
      <div className="thin-scroll overflow-x-auto rounded-xl border border-white/[0.06] bg-base-950/70 p-3 font-mono text-[0.66rem] leading-[1.6]">
        {LOG_LINES.map((line) => (
          <div key={line.time} className="flex items-start gap-2.5 whitespace-nowrap">
            <span className="shrink-0 select-none text-slate-600">{line.time}</span>
            <span className="shrink-0 font-semibold text-emerald-400/80">
              {line.level}
            </span>
            <span className="text-slate-300">{line.message}</span>
          </div>
        ))}
      </div>
    );
  }

  if (tab === "Metrics") {
    return (
      <div className="grid grid-cols-2 gap-2">
        {METRIC_CARDS.map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border p-3 ${TONE_CLASS[card.tone]}`}
          >
            <div className="text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {card.label}
            </div>
            <div className="mt-1 text-lg font-bold leading-none">{card.value}</div>
            <div className="mt-1.5 text-[0.62rem] leading-tight text-slate-500">
              {card.detail}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="thin-scroll overflow-x-auto rounded-xl border border-white/[0.06] bg-base-950/70 p-3 font-mono text-[0.66rem] leading-[1.6] text-slate-300">
      {CODE_LINES.map((line, i) => (
        <div key={i} className="flex items-start gap-3">
          <span className="w-4 shrink-0 select-none text-right text-slate-600">
            {i + 1}
          </span>
          <span className="whitespace-pre">{highlight(line)}</span>
        </div>
      ))}
    </div>
  );
}

export function GamePreview() {
  const [tab, setTab] = useState<Tab>("Code");

  return (
    <div className="relative w-full">
      <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-radial-glow opacity-70 blur-2xl" />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, ease: [0.21, 0.47, 0.32, 0.98], delay: 0.15 }}
        className="surface-strong overflow-hidden"
      >
        {/* Window chrome */}
        <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        </div>

        {/* Mission header */}
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wide text-rose-300">
                <AlertTriangle className="h-2.5 w-2.5" /> High Severity
              </span>
              <h3 className="text-base font-semibold text-white">
                User Signup Latency Spike
              </h3>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
              Signups are crawling on the{" "}
              <span className="font-mono text-slate-300">POST /api/signup</span>{" "}
              endpoint of the Node.js auth service.
            </p>
          </div>

          {/* Avg response time */}
          <div className="shrink-0 sm:text-right">
            <div className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
              p95 Response Time
            </div>
            <div className="mt-1 flex items-center gap-3 sm:justify-end">
              <span className="text-xl font-bold text-rose-400">3,200ms</span>
              <svg
                viewBox="0 0 144 30"
                preserveAspectRatio="none"
                className="h-7 w-24"
                aria-hidden
              >
                <polyline
                  points={SPARK_POINTS}
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Tabs — the same three tools the investigation stage opens with */}
        <div role="tablist" aria-label="Investigation tools" className="flex gap-6 border-b border-white/[0.06] px-5">
          {TABS.map((name) => {
            const active = name === tab;
            return (
              <button
                key={name}
                type="button"
                role="tab"
                id={`preview-tab-${name.toLowerCase()}`}
                aria-selected={active}
                aria-controls="preview-tabpanel"
                onClick={() => setTab(name)}
                className={`-mb-px border-b-2 pb-2.5 text-[0.68rem] font-semibold uppercase tracking-[0.14em] transition-colors ${
                  active
                    ? "border-violet-400 text-white"
                    : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>

        {/* Selected tool + clues */}
        <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1.7fr_1fr]">
          <div
            id="preview-tabpanel"
            role="tabpanel"
            aria-labelledby={`preview-tab-${tab.toLowerCase()}`}
            className="min-w-0 border-b border-white/[0.06] p-4 lg:border-b-0 lg:border-r"
          >
            <ToolPanel tab={tab} />
          </div>

          <div className="p-4">
            <div className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Clues
            </div>
            <ul className="mt-3 space-y-3">
              {CLUES.map((clue) => (
                <li key={clue} className="flex items-start gap-2.5 text-xs">
                  <SquareDashedBottomCode
                    className="mt-px h-3.5 w-3.5 shrink-0 text-violet-300"
                    strokeWidth={1.9}
                  />
                  <span className="leading-tight text-slate-300">{clue}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/*
          CTA — opens the mission this preview is quoting. It was a handler-less
          <button> styled identically to the working "Start Your First Mission"
          Link a few hundred pixels to its left, which made the most prominent
          element on the landing page the one that did nothing.

          It goes to the briefing rather than /start: missions play without an
          account (the wall is at Run Verification), so this is the shortest
          honest path from the advert into the actual product.
        */}
        <div className="border-t border-white/[0.06] p-4">
          <Link
            href={`/missions/${PREVIEW_MISSION_ID}/briefing`}
            className="group flex w-full items-center justify-center gap-2 rounded-xl border border-violet-400/40 bg-gradient-to-r from-violet-600 to-electric-500 px-4 py-2.5 text-sm font-semibold text-white shadow-neon transition-transform hover:scale-[1.01]"
          >
            Start Investigation
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
