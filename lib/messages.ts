import type { db as Db } from "@/lib/db/client";
import { messages } from "@/lib/db/schema";

export type MessageRole = "user" | "assistant";

export type InsertMessageInput = {
  conversationId: string;
  userId: string;
  role: MessageRole;
  content: string;
};

/**
 * Inserts one message row. Used both for the incoming user message (before
 * calling the model) and for the assistant's reply (from streamText's
 * onFinish, once generation completes).
 */
export async function insertMessage(db: typeof Db, input: InsertMessageInput) {
  await db.insert(messages).values({
    conversationId: input.conversationId,
    userId: input.userId,
    role: input.role,
    content: input.content,
  });
}
