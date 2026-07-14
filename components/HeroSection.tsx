"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { PlayCircle, Terminal } from "lucide-react";
import { TECH_TAGS } from "@/lib/data";
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
            <span className="chip">
              <Terminal className="h-3.5 w-3.5 text-electric-400" />
              Software Engineer Simulator
            </span>
          </motion.div>

          <motion.h1
            variants={item}
            className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            Play Like a{" "}
            <span className="text-gradient">Software Engineer.</span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-5 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg"
          >
            Investigate real production incidents, diagnose the root cause,
            apply the right fix, and level up your backend engineering skills.
          </motion.p>

          <motion.div
            variants={item}
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <Link
              href="/start"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-400/40 bg-gradient-to-r from-violet-600 to-electric-500 px-6 py-3 text-sm font-semibold text-white shadow-neon transition-transform hover:scale-[1.03]"
            >
              Start Your First Mission
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-6 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-white/25 hover:text-white"
            >
              <PlayCircle className="h-4 w-4" />
              Watch Demo
            </Link>
          </motion.div>

          {/* Tech tags */}
          <motion.div variants={item} className="mt-8">
            <div className="mb-2.5 text-xs uppercase tracking-[0.16em] text-slate-500">
              Built around
            </div>
            <div className="flex flex-wrap gap-2">
              {TECH_TAGS.map((tag) => (
                <span key={tag} className="chip font-mono">
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* Right: preview */}
        <div className="min-w-0 lg:pl-4">
          <GamePreview />
        </div>
      </div>
    </section>
  );
}
