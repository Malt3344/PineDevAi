"use server";

import { redirect } from "next/navigation";
import { getApprovedUser } from "@/lib/gate";
import { db } from "@/lib/db/client";
import { conversations } from "@/lib/db/schema";
import { resolveAgentModelId } from "@/lib/agent/models";
import { createClient } from "@/lib/supabase/server";

/**
 * Creates a new, empty conversation for the current user and navigates to
 * it. The URL is the source of truth for which conversation is open, so we
 * redirect rather than return an id for the client to manage.
 */
export async function createConversation(formData: FormData) {
  const gate = await getApprovedUser();
  if (gate.status !== "approved") {
    throw new Error("Not authorized to create a conversation.");
  }

  const modelId = resolveAgentModelId(formData.get("model"));

  const [row] = await db
    .insert(conversations)
    .values({ userId: gate.user.id, title: "New chat", model: modelId })
    .returning({ id: conversations.id });

  if (!row) {
    throw new Error("Could not create a new conversation.");
  }

  redirect(`/chat/${row.id}`);
}

/**
 * Signs the current user out, clearing the session cookie server-side, and
 * sends them back to the landing page.
 */
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
