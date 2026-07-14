import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { Reveal } from "./ui/Reveal";

const TABS = ["Logs", "Metrics", "Code", "Database"];

const LOG_LINES: { t: string; msg: string; ms: string; warn?: boolean }[] = [
  { t: "10:15:23", msg: "GET /api/orders", ms: "2.85s", warn: true },
  { t: "10:15:23", msg: "SELECT * FROM orders WHERE user_id = $1", ms: "3ms" },
  { t: "10:15:23", msg: "SELECT * FROM order_items WHERE order_id = $1", ms: "120ms" },
  { t: "10:15:24", msg: "SELECT * FROM order_items WHERE order_id = $1", ms: "118ms" },
  { t: "10:15:24", msg: "SELECT * FROM order_items WHERE order_id = $1", ms: "126ms" },
  { t: "10:15:24", msg: "SELECT * FROM order_items WHERE order_id = $1", ms: "121ms" },
];

const CLUES = [
  { text: "High response time detected", done: true },
  { text: "N+1 query pattern found", done: true },
];

export function MissionPreview() {
  return (
    <section id="mission" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_1.5fr] lg:gap-14">
        {/* Left: copy */}
        <Reveal>
          <span className="chip uppercase tracking-[0.18em] text-[0.68rem] text-violet-300">
            Real Missions. Real Skills.
          </span>
          <h2 className="mt-4 text-3xl font-semibold leading-tight text-white sm:text-4xl">
            Inside a Mission
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-slate-400">
            Use professional tools, analyze real data, and make the right call.
          </p>
          <Link
            href="/demo"
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-white/25 hover:text-white"
          >
            See How It Looks
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>

        {/* Right: tool panel */}
        <Reveal delay={0.1}>
          <div className="surface-strong overflow-hidden">
            {/* Tabs */}
            <div className="flex gap-1 border-b border-white/[0.06] p-1.5">
              {TABS.map((tab, i) => (
                <button
                  key={tab}
                  type="button"
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    i === 0
                      ? "bg-white/[0.06] text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-0 md:grid-cols-[1.7fr_1fr]">
              {/* Logs */}
              <div className="border-b border-white/[0.06] p-3.5 md:border-b-0 md:border-r">
                <div className="thin-scroll overflow-x-auto font-mono text-[0.68rem] leading-relaxed">
                  {LOG_LINES.map((line, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 py-0.5"
                    >
                      <span className="flex min-w-0 gap-2">
                        <span className="shrink-0 text-slate-600">{line.t}</span>
                        <span
                          className={`truncate ${line.warn ? "text-amber-300" : "text-electric-400/80"}`}
                        >
                          {line.msg}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 font-semibold ${line.warn ? "text-rose-400" : "text-slate-400"}`}
                      >
                        {line.ms}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clues */}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Clues Collected
                  </span>
                  <span className="font-mono text-xs font-semibold text-violet-300">
                    2 / 5
                  </span>
                </div>
                <ul className="mt-3 space-y-2">
                  {CLUES.map((clue) => (
                    <li key={clue.text} className="flex items-center gap-2 text-xs">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                      <span className="text-slate-300">{clue.text}</span>
                    </li>
                  ))}
                  <li className="flex items-center gap-2 text-xs opacity-50">
                    <Circle className="h-4 w-4 shrink-0 text-slate-600" />
                    <span className="text-slate-500">Analyzing further…</span>
                  </li>
                </ul>

                <div className="mt-4 border-t border-white/[0.06] pt-3">
                  <div className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Next Step
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-300">
                    Identify the root cause of the issue.
                  </p>
                  <button
                    type="button"
                    className="mt-3 w-full rounded-lg border border-violet-400/40 bg-gradient-to-r from-violet-600 to-electric-500 px-3 py-2 text-xs font-semibold text-white shadow-neon transition-transform hover:scale-[1.02]"
                  >
                    Go to Diagnosis
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
