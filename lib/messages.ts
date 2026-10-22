import type { db as Db } from "@/lib/db/client";
import { messages } from "@/lib/db/schema";

export type MessageRole = "user" | "assistant";

export type InsertMessageInput = {
  /**
   * Optional explicit id. The assistant path passes the same id the
   * client's stream already used for this message (see
   * lib/agent/generate-response.ts), so the row a vote refers to exists
   * under the exact id the client holds — otherwise the client's UIMessage
   * id and the persisted row's id would be two unrelated random values.
   * Omitted for the user path, which has no such id to reuse.
   */
  id?: string;
  chatId: string;
  userId: string;
  role: MessageRole;
  parts: unknown[];
};

/**
 * Inserts one message row. Used both for the incoming user message (before
 * calling the model) and for the assistant's reply (from streamText's
 * onFinish, once generation completes). `parts` is the AI SDK v5
 * `UIMessage["parts"]` shape (e.g. `[{ type: "text", text: "..." }]`), stored
 * as jsonb so richer content can round-trip without another migration.
 */
export async function insertMessage(db: typeof Db, input: InsertMessageInput) {
  await db.insert(messages).values({
    ...(input.id ? { id: input.id } : {}),
    chatId: input.chatId,
    userId: input.userId,
    role: input.role,
    parts: input.parts,
  });
}
