"use server";

import { redirect } from "next/navigation";
import { getApprovedUser } from "@/lib/gate";
import { db } from "@/lib/db/client";
import { createCheckoutSession, createPortalSession } from "@/lib/billing";
import { getSiteUrl } from "@/lib/site-url";

/**
 * Starts a Stripe Checkout session for the paid plan and redirects to it.
 * Requires an actual approved account — a suspended account (isApproved
 * false, an admin kill-switch, not a queue) cannot pay its way back in.
 */
export async function startCheckoutAction() {
  const gate = await getApprovedUser();
  if (gate.status === "unauthenticated") {
    redirect("/login");
  }
  if (gate.status !== "approved") {
    throw new Error("Not authorized.");
  }

  const url = await createCheckoutSession(db, gate.user.id, gate.user.email, getSiteUrl());
  redirect(url);
}

/** Opens the Stripe Billing Portal so the user can manage or cancel their plan. */
export async function openBillingPortalAction() {
  const gate = await getApprovedUser();
  if (gate.status !== "approved") {
    throw new Error("Not authorized.");
  }

  const url = await createPortalSession(db, gate.user.id, gate.user.email, getSiteUrl());
  redirect(url);
}
