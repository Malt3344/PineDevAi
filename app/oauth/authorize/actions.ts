"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { getApprovedUser } from "@/lib/gate";
import { getClient, issueCode } from "@/lib/oauth";

function withParams(base: string, params: Record<string, string>): string {
  const url = new URL(base);
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
  return url.toString();
}

/**
 * The user's answer on the consent screen. Everything from the form is
 * re-checked against the registered client — the hidden fields are just
 * the request the page was rendered for, not something to trust.
 */
export async function answerConsent(formData: FormData) {
  const clientId = String(formData.get("client_id") ?? "");
  const redirectUri = String(formData.get("redirect_uri") ?? "");
  const codeChallenge = String(formData.get("code_challenge") ?? "");
  const state = String(formData.get("state") ?? "");
  const decision = String(formData.get("decision") ?? "");

  const client = await getClient(db, clientId);
  if (!client || !client.redirectUris.includes(redirectUri) || !codeChallenge) {
    redirect("/chat/connect?error=invalid_request");
  }

  if (decision !== "allow") {
    redirect(withParams(redirectUri, { error: "access_denied", state }));
  }

  const gate = await getApprovedUser();
  if (gate.status !== "approved") redirect("/login");

  const code = await issueCode(db, { clientId, userId: gate.user.id, redirectUri, codeChallenge });
  redirect(withParams(redirectUri, { code, state }));
}
