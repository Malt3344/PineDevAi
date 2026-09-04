import { eq } from "drizzle-orm";
import type { db as Db } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";
import { getStripeClient, PAID_PLAN_PRICE_ID } from "@/lib/stripe";

/**
 * Gets this user's Stripe customer id, creating one on first use. The id
 * is persisted so every future checkout/portal call reuses the same
 * Stripe customer instead of creating duplicates.
 */
export async function getOrCreateStripeCustomerId(
  db: typeof Db,
  userId: string,
  email: string,
): Promise<string> {
  const [profile] = await db
    .select({ stripeCustomerId: profiles.stripeCustomerId })
    .from(profiles)
    .where(eq(profiles.id, userId));

  if (profile?.stripeCustomerId) {
    return profile.stripeCustomerId;
  }

  const customer = await getStripeClient().customers.create({
    email,
    metadata: { userId },
  });

  await db
    .update(profiles)
    .set({ stripeCustomerId: customer.id })
    .where(eq(profiles.id, userId));

  return customer.id;
}

/** Creates a Stripe Checkout session for the paid plan and returns its URL. */
export async function createCheckoutSession(
  db: typeof Db,
  userId: string,
  email: string,
  siteUrl: string,
): Promise<string> {
  const customerId = await getOrCreateStripeCustomerId(db, userId, email);

  const session = await getStripeClient().checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: PAID_PLAN_PRICE_ID, quantity: 1 }],
    success_url: `${siteUrl}/chat/account/billing?checkout=success`,
    cancel_url: `${siteUrl}/chat/account/billing?checkout=canceled`,
    client_reference_id: userId,
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL.");
  }

  return session.url;
}

/** Creates a Stripe Billing Portal session so the user can manage their subscription. */
export async function createPortalSession(
  db: typeof Db,
  userId: string,
  email: string,
  siteUrl: string,
): Promise<string> {
  const customerId = await getOrCreateStripeCustomerId(db, userId, email);

  const session = await getStripeClient().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${siteUrl}/chat/account/billing`,
  });

  return session.url;
}

/**
 * Applies a Stripe subscription object's status to the matching profile
 * row, found by Stripe customer id. Called only from the webhook handler,
 * after the event's signature has been verified — this is the one place
 * subscriptionStatus is ever written.
 *
 * A newly active subscription also grants isApproved — paying for Pro is
 * itself a way past the manual-approval waitlist, not just a plan upgrade
 * for someone already let in. Losing or canceling the subscription later
 * does not revoke approval; it only drops the message cap back to free.
 */
export async function syncSubscriptionStatus(
  db: typeof Db,
  stripeCustomerId: string,
  status: "active" | "past_due" | "canceled" | "free",
  stripeSubscriptionId: string | null,
): Promise<void> {
  await db
    .update(profiles)
    .set({
      subscriptionStatus: status,
      stripeSubscriptionId,
      ...(status === "active" ? { isApproved: true } : {}),
    })
    .where(eq(profiles.stripeCustomerId, stripeCustomerId));
}
