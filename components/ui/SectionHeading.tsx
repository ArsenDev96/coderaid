import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

type SectionHeadingProps = {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
  align?: "center" | "left";
};

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: SectionHeadingProps) {
  const alignment =
    align === "center" ? "items-center text-center mx-auto" : "items-start text-left";

  return (
    <Reveal
      className={`flex max-w-2xl flex-col gap-3 ${alignment} ${
        align === "center" ? "mx-auto" : ""
      }`}
    >
      {eyebrow && (
        <span className="chip uppercase tracking-[0.18em] text-[0.68rem] text-violet-300">
          {eyebrow}
        </span>
      )}
      <h2 className="text-3xl font-semibold leading-tight text-white sm:text-4xl">
        {title}
      </h2>
      {subtitle && (
        <p className="text-base leading-relaxed text-slate-400 sm:text-lg">
          {subtitle}
        </p>
      )}
    </Reveal>
  );
}
