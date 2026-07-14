"use client";

import { motion } from "framer-motion";
import { AlertTriangle, TrendingUp, Zap } from "lucide-react";

const CODE_LINES: { n: number; content: string; warn?: boolean }[] = [
  { n: 1, content: "async function getOrders(req, res) {" },
  { n: 2, content: "  const userId = req.user.id;" },
  { n: 3, content: "  const orders = await db.query(" },
  { n: 4, content: "    'SELECT * FROM orders WHERE user_id = $1'," },
  { n: 5, content: "    [userId]" },
  { n: 6, content: "  );" },
  { n: 7, content: "  let result = [];" },
  { n: 8, content: "  for (const order of orders.rows) {" },
  { n: 9, content: "    const items = await db.query(", warn: true },
  { n: 10, content: "      'SELECT * FROM order_items WHERE order_id = $1',", warn: true },
  { n: 11, content: "      [order.id]" },
  { n: 12, content: "    );" },
  { n: 13, content: "    result.push({ ...order, items: items.rows });" },
  { n: 14, content: "  }" },
  { n: 15, content: "  res.json(result);" },
  { n: 16, content: "}" },
];

// Jagged, upward-trending response-time series.
const CHART_POINTS =
  "0,52 17,47 34,50 51,41 68,45 85,35 102,40 119,28 136,33 153,20 170,25 187,13 200,17";

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
        <div className="grid grid-cols-1 gap-0 xl:grid-cols-[1.55fr_1fr]">
          {/* Left: mission + code */}
          <div className="min-w-0 border-b border-white/[0.06] p-5 xl:border-b-0 xl:border-r">
            <div className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Mission
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-white">
                The Slow API Incident
              </h3>
              <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[0.62rem] font-semibold text-rose-300">
                <AlertTriangle className="h-2.5 w-2.5" /> High Severity
              </span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
              Users are experiencing high latency when fetching orders.
              Investigate and fix the issue.
            </p>

            {/* Code block */}
            <div className="mt-3 overflow-hidden rounded-xl border border-white/[0.06] bg-base-950/70">
              <div className="border-b border-white/[0.06] px-3 py-1.5 font-mono text-[0.66rem] text-slate-500">
                GET /api/orders
              </div>
              <div className="p-3 font-mono text-[0.66rem] leading-[1.5] text-slate-300">
                {CODE_LINES.map((line) => (
                  <div
                    key={line.n}
                    className={`flex items-start gap-3 ${line.warn ? "rounded bg-rose-500/[0.12]" : ""}`}
                  >
                    <span className="w-4 shrink-0 select-none text-right text-slate-600">
                      {line.n}
                    </span>
                    <span
                      className={`min-w-0 flex-1 whitespace-pre-wrap break-words ${line.warn ? "text-rose-200" : ""}`}
                    >
                      {line.content}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: metrics */}
          <div className="grid min-w-0 grid-cols-1 gap-4 p-5 sm:grid-cols-3 xl:grid-cols-1">
            {/* Response time */}
            <div className="rounded-xl border border-white/[0.06] bg-base-950/50 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Response Time
                </span>
                <span className="flex items-center gap-1 text-[0.62rem] font-semibold text-rose-400">
                  <TrendingUp className="h-3 w-3" /> High
                </span>
              </div>
              <div className="mt-1 text-2xl font-bold text-rose-400">2,850ms</div>
              <div className="mt-2 flex gap-2">
                <div className="flex flex-col justify-between py-0.5 font-mono text-[0.55rem] text-slate-600">
                  <span>3s</span>
                  <span>2s</span>
                  <span>1s</span>
                </div>
                <svg
                  viewBox="0 0 200 70"
                  preserveAspectRatio="none"
                  className="h-16 flex-1"
                  aria-hidden
                >
                  <defs>
                    <linearGradient id="rt-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <polygon points={`0,70 ${CHART_POINTS} 200,70`} fill="url(#rt-fill)" />
                  <polyline
                    points={CHART_POINTS}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              </div>
              <div className="mt-1 flex justify-between pl-5 font-mono text-[0.55rem] text-slate-600">
                <span>10:15</span>
                <span>10:30</span>
                <span>10:45</span>
              </div>
            </div>

            {/* Mission progress */}
            <div className="rounded-xl border border-white/[0.06] bg-base-950/50 p-3.5">
              <div className="mb-2 flex items-center justify-between text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                <span>Mission Progress</span>
                <span className="font-mono normal-case tracking-normal text-slate-400">
                  7 steps
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "43%" }}
                  transition={{ duration: 1, delay: 0.6, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-electric-400 to-violet-500"
                />
              </div>
            </div>

            {/* Reward + CTA */}
            <div className="rounded-xl border border-white/[0.06] bg-base-950/50 p-3.5">
              <div className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Reward
              </div>
              <div className="mt-2 flex flex-col gap-2">
                <span className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-2.5 py-1.5 text-xs font-semibold text-violet-200">
                  <Zap className="h-3.5 w-3.5" /> +250 XP
                </span>
                <button
                  type="button"
                  className="w-full whitespace-nowrap rounded-lg border border-violet-400/40 bg-gradient-to-r from-violet-600 to-electric-500 px-3.5 py-2 text-xs font-semibold text-white shadow-neon transition-transform hover:scale-[1.02]"
                >
                  Start Investigation
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
