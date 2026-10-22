import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

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
 * Checks the users.isApproved column for access — true for everyone by
 * default; false only if an admin has manually suspended the account — and
 * also returns the subscriptionStatus (set only by the Stripe webhook) so
 * callers such as the daily message cap can vary behavior by plan. Free
 * accounts are "approved" the moment they sign up; only the paid plan
 * requires Stripe, and that is a subscriptionStatus check, not this one.
 */
export async function getApprovedUser(): Promise<GateResult> {
  const session = await auth();
  const sessionUser = session?.user;

  if (!sessionUser?.id || !sessionUser.email) {
    return { status: "unauthenticated" };
  }

  const [user] = await db
    .select({ isApproved: users.isApproved, subscriptionStatus: users.subscriptionStatus })
    .from(users)
    .where(eq(users.id, sessionUser.id));

  const approvedUser: ApprovedUser = {
    id: sessionUser.id,
    email: sessionUser.email,
    subscriptionStatus: user?.subscriptionStatus ?? "free",
  };

  if (!user?.isApproved) {
    return { status: "unapproved", user: approvedUser };
  }

  return { status: "approved", user: approvedUser };
}
