import { Clock, Hammer, Lock } from "lucide-react";

import { AVAILABILITY_META, type Availability } from "@/lib/availability";

/** Small leading icon for the states that need to read as "not yet". */
const STATE_ICON = {
  locked: Lock,
  "in-development": Hammer,
  "coming-soon": Clock,
} as const;

type Props = {
  status: Availability;
  /** `sm` matches the existing chip scale used in list rows. */
  size?: "sm" | "md";
  className?: string;
};

/**
 * The one badge used for mission and track availability across the browser,
 * the map, the detail panel, the dashboard and the skills page, so the same
 * state never reads as two different things in two places.
 */
export function AvailabilityBadge({ status, size = "sm", className = "" }: Props) {
  const meta = AVAILABILITY_META[status];
  const Icon = STATE_ICON[status as keyof typeof STATE_ICON];

  return (
    <span
      className={`chip inline-flex items-center gap-1.5 font-medium ${meta.cls} ${
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
      } ${className}`}
    >
      {Icon ? <Icon className="h-3 w-3" aria-hidden="true" /> : null}
      {meta.label}
    </span>
  );
}

/**
 * The explanatory line rendered beside a disabled CTA. Announced politely so
 * screen-reader users learn why the action is unavailable without the badge
 * alone having to carry the meaning.
 */
export function AvailabilityNote({
  status,
  note,
  className = "",
}: {
  status: Availability;
  /** Overrides the default copy (e.g. the "review being prepared" case). */
  note?: string | null;
  className?: string;
}) {
  const text = note ?? AVAILABILITY_META[status].note;
  if (!text) return null;

  return (
    <p className={`text-xs text-slate-400 ${className}`} role="note">
      {text}
    </p>
  );
}
