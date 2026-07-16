import { CircleCheckBig, Lightbulb } from "lucide-react";

export function WhatYouLearned({ lessons }: { lessons: string[] }) {
  return (
    <section className="flex h-full flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-white sm:text-base">
        <Lightbulb className="h-4 w-4 text-amber-300" strokeWidth={2.2} />
        What you learned
      </h3>

      <ul className="mt-4 space-y-3">
        {lessons.map((lesson) => (
          <li key={lesson} className="flex items-start gap-2.5">
            <CircleCheckBig
              aria-hidden
              className="mt-px h-4 w-4 shrink-0 text-emerald-400"
              strokeWidth={2.2}
            />
            <span className="text-sm leading-relaxed text-slate-300">
              {lesson}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
