import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  ClipboardList,
  ShieldCheck,
  Stethoscope,
  Wrench,
} from "lucide-react";
import { Reveal } from "./ui/Reveal";

const STEPS = [
  { label: "Briefing", icon: ClipboardList },
  { label: "Investigation", icon: Boxes },
  { label: "Diagnosis", icon: Stethoscope },
  { label: "Fix", icon: Wrench },
  { label: "Verification", icon: ShieldCheck },
];

const ACTIVE_STEP = "Investigation";

const LOG_LINES: { t: string; tag: string; msg: string; ms: string; warn?: boolean }[] = [
  { t: "10:02:11", tag: "GET", msg: "/orders?userId=123", ms: "2450ms" },
  { t: "10:02:12", tag: "GET", msg: "/orders?userId=456", ms: "2431ms" },
  { t: "10:02:13", tag: "GET", msg: "/orders?userId=789", ms: "2468ms" },
  {
    t: "10:02:14",
    tag: "DB",
    msg: "Slow query detected",
    ms: "2451ms",
    warn: true,
  },
  { t: "10:02:15", tag: "GET", msg: "/orders?userId=321", ms: "2467ms" },
];

const SQL_LINES: { text: string; tone: "keyword" | "plain" }[] = [
  { text: "SELECT * FROM orders", tone: "keyword" },
  { text: "WHERE user_id = 123", tone: "plain" },
  { text: "ORDER BY created_at DESC;", tone: "keyword" },
];

// Flat-but-noisy query-time series, hovering around the 2.4s mark.
const CHART_POINTS =
  "0,22 14,26 28,18 42,30 56,21 70,33 84,19 98,28 112,23 126,31 140,20 154,27 168,24";

export function MissionPreview() {
  return (
    <section id="mission" className="min-w-0">
      <Reveal className="surface flex h-full flex-col p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-white sm:text-2xl">
          Mission Preview
        </h2>
        <p className="mt-1.5 text-sm text-slate-400">
          Step inside a real mission.
        </p>

        <div className="mt-6 grid min-w-0 flex-1 grid-cols-1 gap-4 sm:grid-cols-[auto_1fr] lg:grid-cols-[auto_1.4fr_1fr]">
          {/* Step rail */}
          <ol className="flex gap-2 overflow-x-auto sm:flex-col sm:gap-1 sm:overflow-visible">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = step.label === ACTIVE_STEP;
              return (
                <li key={step.label}>
                  <span
                    className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${
                      isActive
                        ? "border border-violet-400/40 bg-violet-500/10 text-violet-200"
                        : "border border-transparent text-slate-500"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.9} />
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>

          {/* Logs */}
          <div className="flex min-w-0 flex-col rounded-xl border border-white/[0.06] bg-base-950/60">
            <div className="border-b border-white/[0.06] px-3 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Application Logs
            </div>
            <div className="thin-scroll flex-1 overflow-x-auto p-3 font-mono text-[0.62rem] leading-relaxed">
              {LOG_LINES.map((line, i) => (
                <div key={i} className="flex items-center gap-2 whitespace-nowrap py-0.5">
                  <span className={line.warn ? "text-rose-400" : "text-slate-600"}>
                    {line.t}
                  </span>
                  <span
                    className={`w-7 shrink-0 font-semibold ${
                      line.warn ? "text-rose-400" : "text-slate-500"
                    }`}
                  >
                    {line.tag}
                  </span>
                  <span
                    className={`flex-1 ${
                      line.warn ? "text-rose-300" : "text-electric-400/80"
                    }`}
                  >
                    {line.msg}
                  </span>
                  <span
                    className={`shrink-0 font-semibold ${
                      line.warn ? "text-rose-400" : "text-slate-400"
                    }`}
                  >
                    {line.ms}
                  </span>
                </div>
              ))}
              <div className="pt-1 text-slate-600">…</div>
            </div>
          </div>

          {/* Database read replica */}
          <div className="min-w-0 rounded-xl border border-white/[0.06] bg-base-950/60">
            <div className="border-b border-white/[0.06] px-3 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Database (Read Replica)
            </div>
            <div className="p-3">
              <div className="thin-scroll overflow-x-auto font-mono text-[0.62rem] leading-relaxed">
                {SQL_LINES.map((line) => (
                  <div
                    key={line.text}
                    className={`whitespace-nowrap ${
                      line.tone === "keyword"
                        ? "text-electric-300"
                        : "text-slate-400"
                    }`}
                  >
                    {line.text}
                  </div>
                ))}
              </div>

              <div className="mt-4 border-t border-white/[0.06] pt-3">
                <div className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Query Execution Time
                </div>
                <div className="mt-1 text-lg font-bold text-rose-400">2,430ms</div>

                <div className="mt-2 flex gap-2">
                  <div className="flex flex-col justify-between py-0.5 font-mono text-[0.5rem] text-slate-600">
                    <span>3s</span>
                    <span>1.5s</span>
                    <span>0</span>
                  </div>
                  <svg
                    viewBox="0 0 168 40"
                    preserveAspectRatio="none"
                    className="h-12 flex-1"
                    aria-hidden
                  >
                    <defs>
                      <linearGradient id="qt-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <polygon
                      points={`0,40 ${CHART_POINTS} 168,40`}
                      fill="url(#qt-fill)"
                    />
                    <polyline
                      points={CHART_POINTS}
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="1.4"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                </div>
                <div className="mt-1 flex justify-between pl-6 font-mono text-[0.5rem] text-slate-600">
                  <span>10:00</span>
                  <span>10:30</span>
                  <span>11:00</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Link
          href="/demo"
          className="group mt-6 inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-white/25 hover:text-white"
        >
          Explore Mission
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </Reveal>
    </section>
  );
}
