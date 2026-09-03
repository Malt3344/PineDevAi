import { and, count, eq } from "drizzle-orm";
import type { db as Db } from "@/lib/db/client";
import { conversations, messages, strategies } from "@/lib/db/schema";
import { capForSubscription, countMessagesToday } from "@/lib/daily-cap";
import type { SubscriptionStatus } from "@/lib/gate";

export type UsageSummary = {
  messagesToday: number;
  dailyMessageCap: number;
  totalMessagesSent: number;
  totalConversations: number;
  totalStrategiesSaved: number;
};

async function countRows(
  db: typeof Db,
  table: typeof messages | typeof conversations | typeof strategies,
  userId: string,
  extra?: ReturnType<typeof eq>,
): Promise<number> {
  const conditions = [eq(table.userId, userId)];
  if (extra) conditions.push(extra);

  const [row] = await db
    .select({ value: count() })
    .from(table)
    .where(and(...conditions));

  return row?.value ?? 0;
}

/**
 * Pulls together the real, current usage numbers for a user's account
 * page: today's message count against the daily cap, lifetime totals, and
 * how many strategies they've saved. No estimates or placeholders — every
 * number here is a live count from the database.
 */
export async function getUsageSummary(
  db: typeof Db,
  userId: string,
  subscriptionStatus: SubscriptionStatus,
): Promise<UsageSummary> {
  const [messagesToday, totalMessagesSent, totalConversations, totalStrategiesSaved] =
    await Promise.all([
      countMessagesToday(db, userId),
      countRows(db, messages, userId, eq(messages.role, "user")),
      countRows(db, conversations, userId),
      countRows(db, strategies, userId),
    ]);

  return {
    messagesToday,
    dailyMessageCap: capForSubscription(subscriptionStatus),
    totalMessagesSent,
    totalConversations,
    totalStrategiesSaved,
  };
}
