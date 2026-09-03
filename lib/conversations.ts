import { count, eq } from "drizzle-orm";
import type { db as Db } from "@/lib/db/client";
import { conversations, messages } from "@/lib/db/schema";

const TITLE_LENGTH = 50;

/**
 * If this conversation has no messages yet, sets its title from the first
 * 50 characters of the user's first message. No LLM call involved.
 */
export async function setInitialTitleIfEmpty(
  db: typeof Db,
  conversationId: string,
  firstMessageContent: string,
) {
  const [row] = await db
    .select({ value: count() })
    .from(messages)
    .where(eq(messages.conversationId, conversationId));

  if ((row?.value ?? 0) > 0) return;

  await db
    .update(conversations)
    .set({ title: firstMessageContent.slice(0, TITLE_LENGTH) })
    .where(eq(conversations.id, conversationId));
}
