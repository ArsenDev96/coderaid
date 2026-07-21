import { redirect } from "next/navigation";
import { SignInCard } from "@/components/auth/SignInCard";
import { currentUser } from "@/lib/supabase/server";

/**
 * Signing in is a session read, so this route can't be statically generated —
 * an already-authenticated player is sent straight on rather than shown a
 * login form they don't need.
 */
export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: { error?: string; next?: string };
}) {
  const user = await currentUser();
  if (user) redirect(searchParams.next ?? "/dashboard");

  return <SignInCard error={searchParams.error} next={searchParams.next} />;
}
