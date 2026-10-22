import { count, eq } from "drizzle-orm";
import type { db as Db } from "@/lib/db/client";
import { chats, messages } from "@/lib/db/schema";

const TITLE_LENGTH = 50;

/**
 * If this chat has no messages yet, sets its title from the first 50
 * characters of the user's first message. No LLM call involved.
 */
export async function setInitialTitleIfEmpty(
  db: typeof Db,
  chatId: string,
  firstMessageContent: string,
) {
  const [row] = await db
    .select({ value: count() })
    .from(messages)
    .where(eq(messages.chatId, chatId));

  if ((row?.value ?? 0) > 0) return;

  await db
    .update(chats)
    .set({ title: firstMessageContent.slice(0, TITLE_LENGTH) })
    .where(eq(chats.id, chatId));
}

export type ChatGroupLabel = "Today" | "Yesterday" | "Last 7 days" | "Last 30 days" | "Older";

export const CHAT_GROUP_ORDER: ChatGroupLabel[] = [
  "Today",
  "Yesterday",
  "Last 7 days",
  "Last 30 days",
  "Older",
];

/**
 * Buckets a list of chats into the sidebar's date groups, in the same
 * order the sidebar renders them (most recent first). `now` is injectable
 * for tests; defaults to the real current time. Chats are expected to
 * already be sorted newest-first — this only groups, it does not sort.
 */
export function groupChatsByDate<T extends { createdAt: Date }>(
  chats: T[],
  now: Date = new Date(),
): Record<ChatGroupLabel, T[]> {
  const groups: Record<ChatGroupLabel, T[]> = {
    Today: [],
    Yesterday: [],
    "Last 7 days": [],
    "Last 30 days": [],
    Older: [],
  };

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const sevenDaysAgo = new Date(startOfToday);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date(startOfToday);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  for (const chat of chats) {
    const createdAt = chat.createdAt;
    if (createdAt >= startOfToday) {
      groups.Today.push(chat);
    } else if (createdAt >= startOfYesterday) {
      groups.Yesterday.push(chat);
    } else if (createdAt >= sevenDaysAgo) {
      groups["Last 7 days"].push(chat);
    } else if (createdAt >= thirtyDaysAgo) {
      groups["Last 30 days"].push(chat);
    } else {
      groups.Older.push(chat);
    }
  }

  return groups;
}
