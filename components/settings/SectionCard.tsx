import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** The shared shell for each settings section: icon, title, blurb, body. */
export function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="surface p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-violet-400/25 bg-violet-500/10 text-violet-300">
          <Icon className="h-5 w-5" strokeWidth={1.9} />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-white">{title}</h2>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>

      <div className="mt-5">{children}</div>
    </section>
  );
}
