"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, PlayCircle } from "lucide-react";
import { HERO_HIGHLIGHTS } from "@/lib/data";
import { GamePreview } from "./GamePreview";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] },
  },
};

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* subtle grid backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-grid-fade opacity-[0.5] [background-size:44px_44px] [mask-image:radial-gradient(70%_60%_at_50%_20%,black,transparent)]"
      />

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-2 lg:gap-10 lg:px-8 lg:pb-24 lg:pt-20">
        {/* Left: copy */}
        <motion.div variants={container} initial="hidden" animate="visible">
          <motion.div variants={item}>
            <span className="chip uppercase tracking-[0.18em] text-[0.68rem] text-violet-200">
              Node.js Backend Debugging, Simulated
            </span>
          </motion.div>

          <motion.h1
            variants={item}
            className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            Master Node.js Through
            <br />
            <span className="text-gradient">Real Production Incidents.</span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-5 max-w-md text-base leading-relaxed text-slate-400 sm:text-lg"
          >
            Investigate logs, metrics, traces, and backend code. Diagnose
            failures, apply fixes, and build the practical Node.js skills
            interviews and production systems demand.
          </motion.p>

          <motion.div
            variants={item}
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <Link
              href="/start"
              className="group inline-flex items-center justify-center gap-2 rounded-xl border border-violet-400/40 bg-gradient-to-r from-violet-600 to-electric-500 px-6 py-3 text-sm font-semibold text-white shadow-neon transition-transform hover:scale-[1.03]"
            >
              Start Your First Mission
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/missions"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-6 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-white/25 hover:text-white"
            >
              <PlayCircle className="h-4 w-4" />
              Explore Node.js Missions
            </Link>
          </motion.div>

          {/* Value bullets */}
          <motion.ul
            variants={item}
            className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-3"
          >
            {HERO_HIGHLIGHTS.map((highlight) => {
              const Icon = highlight.icon;
              return (
                <li
                  key={highlight.label}
                  className="flex items-center gap-2.5 text-sm text-slate-300"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
                    <Icon
                      className={`h-4 w-4 ${highlight.accent}`}
                      strokeWidth={1.9}
                    />
                  </span>
                  <span className="max-w-[7.5rem] text-xs leading-tight sm:text-[0.8rem]">
                    {highlight.label}
                  </span>
                </li>
              );
            })}
          </motion.ul>
        </motion.div>

        {/* Right: preview */}
        <div className="min-w-0 lg:pl-4">
          <GamePreview />
        </div>
      </div>
    </section>
  );
}
