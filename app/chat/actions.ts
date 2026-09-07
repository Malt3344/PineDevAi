"use server";

import { redirect } from "next/navigation";
import { getApprovedUser } from "@/lib/gate";
import { db } from "@/lib/db/client";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { conversations } from "@/lib/db/schema";
import { DEFAULT_AGENT_MODEL_ID, resolveAgentModelId } from "@/lib/agent/models";
import { createClient } from "@/lib/supabase/server";

/**
 * Creates a new, empty strategy for the current user and navigates to it.
 * No model is chosen up front — it starts on the default and can be changed
 * from the composer at any point, including mid-conversation.
 */
export async function createConversation() {
  const gate = await getApprovedUser();
  if (gate.status !== "approved") {
    throw new Error("Not authorized to create a conversation.");
  }

  const [row] = await db
    .insert(conversations)
    .values({
      userId: gate.user.id,
      title: "New strategy",
      model: DEFAULT_AGENT_MODEL_ID,
    })
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

/**
 * Switches which model a conversation talks to. Validated against the
 * registry here rather than trusted from the client, and scoped to the
 * caller's own conversations so an id from someone else's account does
 * nothing.
 */
export async function setConversationModel(conversationId: string, modelId: string) {
  const gate = await getApprovedUser();
  if (gate.status !== "approved") {
    throw new Error("Not authorized to change the model.");
  }

  await db
    .update(conversations)
    .set({ model: resolveAgentModelId(modelId) })
    .where(
      and(eq(conversations.id, conversationId), eq(conversations.userId, gate.user.id)),
    );

  revalidatePath(`/chat/${conversationId}`);
}
