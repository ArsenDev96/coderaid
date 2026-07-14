import { Braces, Brain, Rocket, ShieldCheck } from "lucide-react";
import { Reveal } from "./ui/Reveal";

const ITEMS = [
  { label: "Real-world incidents", icon: ShieldCheck, accent: "text-violet-300" },
  { label: "Backend focused", icon: Braces, accent: "text-electric-300" },
  { label: "Learn by solving", icon: Brain, accent: "text-emerald-300" },
  { label: "Level up your career", icon: Rocket, accent: "text-amber-300" },
];

export function TrustBar() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <Reveal className="surface p-6 sm:p-8">
        <p className="text-center text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Built for developers. Loved by engineers.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex flex-col items-center gap-2.5 text-center sm:flex-row sm:text-left"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
                  <Icon className={`h-5 w-5 ${item.accent}`} strokeWidth={1.9} />
                </span>
                <span className="text-sm font-medium leading-tight text-slate-200">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}
