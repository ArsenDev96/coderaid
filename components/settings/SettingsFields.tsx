"use client";

import { ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * One labelled preference row: icon, title, description, control. Stacks on
 * mobile so the control gets full width instead of being squeezed.
 */
export function SettingRow({
  icon: Icon,
  title,
  description,
  htmlFor,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Points the row's label at its control, so the title is clickable. */
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-white/[0.06] py-4 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-400">
          <Icon className="h-4 w-4" strokeWidth={1.9} />
        </span>
        <div className="min-w-0">
          <label
            htmlFor={htmlFor}
            className="block text-sm font-semibold text-white"
          >
            {title}
          </label>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
      <div className="shrink-0 sm:w-64">{children}</div>
    </div>
  );
}

export function SelectField({
  id,
  value,
  onChange,
  options,
  label,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string; swatch?: string }[];
  label: string;
}) {
  const active = options.find((o) => o.id === value);

  return (
    <div className="relative">
      {/* Swatch sits over the select; the native control stays the input. */}
      {active?.swatch && (
        <span
          aria-hidden
          className={`pointer-events-none absolute left-3.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full ${active.swatch}`}
        />
      )}
      <select
        id={id}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full appearance-none rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pr-9 text-sm font-medium text-slate-200 outline-none transition-colors hover:border-white/20 focus:border-violet-400/60 ${
          active?.swatch ? "pl-8" : "pl-3.5"
        }`}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id} className="bg-base-900">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
    </div>
  );
}

/**
 * An accessible switch — a real button with `role="switch"`, not a styled div.
 *
 * The track is a flex row and the knob a normal in-flow child, so the knob's
 * resting place is the track's left padding edge. It is deliberately *not*
 * absolutely positioned: an absolute knob with no `left` resolves to its static
 * position, which a button's default `text-align: center` shifts to the middle
 * of the track — leaving the knob mid-track when off and hanging off the end
 * when on.
 */
export function Toggle({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <div className="sm:flex sm:justify-end">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`inline-flex h-7 w-12 shrink-0 items-center rounded-full border p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-base-950 ${
          checked
            ? "border-violet-400/50 bg-violet-500 shadow-neon"
            : "border-white/10 bg-white/[0.06]"
        }`}
      >
        {/* 22px of travel = 42px of track content (48 − 2 border − 4 padding)
            minus the 20px knob, so it seats flush at both ends. */}
        <span
          className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? "translate-x-[1.375rem]" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
