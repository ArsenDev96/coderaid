import { StartExperience } from "@/components/onboarding/StartExperience";

export const metadata = {
  title: "Create Your Profile — CodeRaid",
  description:
    "Set up your CodeRaid profile and start your first Node.js debugging mission. No account required.",
};

/**
 * `/start` is one route with three states — wizard, one-time success card, and
 * a redirect for a player who set up their profile on an earlier visit. All
 * three depend on `localStorage` and on the player's ledger, so the decision
 * lives in `StartExperience`; this stays a thin server component that owns only
 * the metadata.
 */
export default function StartPage() {
  return <StartExperience />;
}
