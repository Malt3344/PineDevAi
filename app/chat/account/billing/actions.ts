"use server";

import { redirect } from "next/navigation";
import { getApprovedUser } from "@/lib/gate";
import { db } from "@/lib/db/client";
import { createCheckoutSession, createPortalSession } from "@/lib/billing";

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/**
 * Starts a Stripe Checkout session for the paid plan and redirects to it.
 * Reachable while still unapproved (on the waitlist) — paying is itself a
 * way in, not a plan upgrade reserved for people already let past the
 * waitlist. Only an actual signed-in session is required.
 */
export async function startCheckoutAction() {
  const gate = await getApprovedUser();
  if (gate.status === "unauthenticated") {
    redirect("/login");
  }

  const url = await createCheckoutSession(db, gate.user.id, gate.user.email, siteUrl());
  redirect(url);
}

/** Opens the Stripe Billing Portal so the user can manage or cancel their plan. */
export async function openBillingPortalAction() {
  const gate = await getApprovedUser();
  if (gate.status !== "approved") {
    throw new Error("Not authorized.");
  }

  const url = await createPortalSession(db, gate.user.id, gate.user.email, siteUrl());
  redirect(url);
}
