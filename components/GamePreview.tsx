"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, SquareDashedBottomCode } from "lucide-react";

const TABS = ["Code", "Logs", "Metrics"];

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

export function GamePreview() {
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

        {/* Tabs */}
        <div className="flex gap-6 border-b border-white/[0.06] px-5">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              type="button"
              className={`-mb-px border-b-2 pb-2.5 text-[0.68rem] font-semibold uppercase tracking-[0.14em] transition-colors ${
                i === 0
                  ? "border-violet-400 text-white"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Code + clues */}
        <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1.7fr_1fr]">
          <div className="min-w-0 border-b border-white/[0.06] p-4 lg:border-b-0 lg:border-r">
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

        {/* CTA */}
        <div className="border-t border-white/[0.06] p-4">
          <button
            type="button"
            className="group flex w-full items-center justify-center gap-2 rounded-xl border border-violet-400/40 bg-gradient-to-r from-violet-600 to-electric-500 px-4 py-2.5 text-sm font-semibold text-white shadow-neon transition-transform hover:scale-[1.01]"
          >
            Start Investigation
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
