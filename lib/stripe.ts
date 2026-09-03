import Stripe from "stripe";

let cachedClient: Stripe | null = null;

/**
 * Server-only Stripe client, constructed lazily on first use rather than
 * at module load. Stripe's SDK throws synchronously if constructed with
 * an empty key, which would otherwise break the build and every route in
 * the app before Stripe is even configured — this keeps that failure
 * contained to the moment a Stripe feature is actually called.
 */
export function getStripeClient(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it to your environment to enable billing.",
    );
  }

  if (!cachedClient) {
    cachedClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-08-26.dahlia",
    });
  }

  return cachedClient;
}

export const PAID_PLAN_PRICE_ID = process.env.STRIPE_PRICE_ID ?? "";
