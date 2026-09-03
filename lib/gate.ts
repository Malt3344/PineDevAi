import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";

export type SubscriptionStatus = "free" | "active" | "past_due" | "canceled";

export type ApprovedUser = {
  id: string;
  email: string;
  subscriptionStatus: SubscriptionStatus;
};

export type GateResult =
  | { status: "approved"; user: ApprovedUser }
  | { status: "unauthenticated" }
  | { status: "unapproved"; user: ApprovedUser };

/**
 * The single source of truth for "is this request allowed to use the
 * product". Every server entry point that touches chat data calls this
 * itself — middleware redirecting unauthenticated visitors is only a UX
 * convenience and is never relied on for security.
 *
 * Checks the profiles.isApproved column for access, and also returns the
 * subscriptionStatus (set only by the Stripe webhook) so callers such as
 * the daily message cap can vary behavior by plan.
 */
export async function getApprovedUser(): Promise<GateResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return { status: "unauthenticated" };
  }

  const [profile] = await db
    .select({ isApproved: profiles.isApproved, subscriptionStatus: profiles.subscriptionStatus })
    .from(profiles)
    .where(eq(profiles.id, user.id));

  const approvedUser: ApprovedUser = {
    id: user.id,
    email: user.email,
    subscriptionStatus: profile?.subscriptionStatus ?? "free",
  };

  if (!profile?.isApproved) {
    return { status: "unapproved", user: approvedUser };
  }

  return { status: "approved", user: approvedUser };
}
