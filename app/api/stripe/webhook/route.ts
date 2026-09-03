import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe";
import { syncSubscriptionStatus } from "@/lib/billing";
import { db } from "@/lib/db/client";

function mapStripeStatus(
  status: Stripe.Subscription.Status,
): "active" | "past_due" | "canceled" {
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due" || status === "unpaid") return "past_due";
  return "canceled";
}

/**
 * Receives Stripe subscription lifecycle events. This is the ONLY place
 * profiles.subscriptionStatus is ever written — never trust a client
 * request to change it directly. The signature check below is what makes
 * that safe: only a request signed with our Stripe webhook secret reaches
 * the update below.
 */
export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing webhook signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripeClient().webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

      const status =
        event.type === "customer.subscription.deleted"
          ? "canceled"
          : mapStripeStatus(subscription.status);

      await syncSubscriptionStatus(
        db,
        customerId,
        status,
        status === "canceled" ? null : subscription.id,
      );
      break;
    }
    default:
      // Other event types are ignored — nothing else in the app depends on them.
      break;
  }

  return NextResponse.json({ received: true });
}
