"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { signOut } from "@/lib/auth/auth";
import { getApprovedUser } from "@/lib/gate";
import { db } from "@/lib/db/client";
import { chats } from "@/lib/db/schema";
import { DEFAULT_AGENT_MODEL_ID, resolveAgentModelId } from "@/lib/agent/models";

/**
 * Creates a new, empty chat for the current user and navigates to it.
 * No model is chosen up front — it starts on the default and can be changed
 * from the composer at any point, including mid-conversation.
 */
export async function createChat() {
  const gate = await getApprovedUser();
  if (gate.status !== "approved") {
    throw new Error("Not authorized to create a chat.");
  }

  const [row] = await db
    .insert(chats)
    .values({
      userId: gate.user.id,
      title: "New study",
      modelId: DEFAULT_AGENT_MODEL_ID,
    })
    .returning({ id: chats.id });

  if (!row) {
    throw new Error("Could not create a new chat.");
  }

  redirect(`/chat/${row.id}`);
}

/**
 * Signs the current user out, clearing the session cookie server-side, and
 * sends them back to the landing page.
 */
export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

/**
 * Switches which model a chat talks to. Validated against the registry here
 * rather than trusted from the client, and scoped to the caller's own chats
 * so an id from someone else's account does nothing.
 */
export async function setChatModel(chatId: string, modelId: string) {
  const gate = await getApprovedUser();
  if (gate.status !== "approved") {
    throw new Error("Not authorized to change the model.");
  }

  await db
    .update(chats)
    .set({ modelId: resolveAgentModelId(modelId) })
    .where(and(eq(chats.id, chatId), eq(chats.userId, gate.user.id)));

  revalidatePath(`/chat/${chatId}`);
}

/** Renames a chat. Scoped to the caller's own chats, same as setChatModel. */
export async function renameChat(chatId: string, title: string) {
  const gate = await getApprovedUser();
  if (gate.status !== "approved") {
    throw new Error("Not authorized to rename this chat.");
  }

  const trimmed = title.trim().slice(0, 200);
  if (!trimmed) return;

  await db
    .update(chats)
    .set({ title: trimmed })
    .where(and(eq(chats.id, chatId), eq(chats.userId, gate.user.id)));

  revalidatePath("/chat", "layout");
}

/**
 * Deletes a chat and everything under it (messages, votes — cascaded by the
 * schema's ON DELETE CASCADE). Any documents saved from it are kept (their
 * chatId is set null), since a saved strategy is meant to outlive the
 * conversation it came from.
 */
export async function deleteChat(chatId: string) {
  const gate = await getApprovedUser();
  if (gate.status !== "approved") {
    throw new Error("Not authorized to delete this chat.");
  }

  await db.delete(chats).where(and(eq(chats.id, chatId), eq(chats.userId, gate.user.id)));

  revalidatePath("/chat", "layout");
  redirect("/chat");
}

/**
 * Flips a chat between private (default) and public. A public chat is
 * viewable, read-only, by anyone with the link at /share/[id] — no
 * authentication required to view.
 */
export async function setChatVisibility(chatId: string, visibility: "private" | "public") {
  const gate = await getApprovedUser();
  if (gate.status !== "approved") {
    throw new Error("Not authorized to change this chat's visibility.");
  }

  await db
    .update(chats)
    .set({ visibility })
    .where(and(eq(chats.id, chatId), eq(chats.userId, gate.user.id)));

  revalidatePath(`/chat/${chatId}`);
}
