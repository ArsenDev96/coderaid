import { avatarFor } from "@/lib/leaderboards";

/**
 * A player's avatar, drawn from the shared onboarding avatar set (gradient tile
 * + icon) so leaderboard faces match every other avatar in the app.
 */
export function PlayerAvatar({
  avatar,
  size = "sm",
  className = "",
}: {
  avatar?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { icon: Icon, gradient, label } = avatarFor(avatar);
  const box = {
    sm: "h-8 w-8",
    md: "h-14 w-14",
    lg: "h-[4.5rem] w-[4.5rem]",
  }[size];
  const glyph = {
    sm: "h-4 w-4",
    md: "h-7 w-7",
    lg: "h-9 w-9",
  }[size];

  return (
    <span
      role="img"
      aria-label={label}
      className={`grid shrink-0 place-items-center rounded-full border bg-gradient-to-br text-white ${gradient} ${box} ${className}`}
    >
      <Icon className={glyph} strokeWidth={1.8} />
    </span>
  );
}
