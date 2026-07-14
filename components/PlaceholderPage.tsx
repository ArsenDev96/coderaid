import Link from "next/link";
import { ArrowLeft, Zap } from "lucide-react";

type PlaceholderPageProps = {
  title: string;
  description: string;
};

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="surface-strong w-full max-w-md p-8 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-600/30 to-electric-500/20 shadow-neon">
          <Zap className="h-6 w-6 text-violet-300" strokeWidth={2.2} fill="currentColor" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold text-white">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          {description}
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-white/25 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to landing
        </Link>
      </div>
    </main>
  );
}
