import { and, count, eq, gte } from "drizzle-orm";
import type { db as Db } from "@/lib/db/client";
import { messages } from "@/lib/db/schema";

/**
 * Maximum number of user messages a single user may send per day.
 * Best-effort for MVP: a concurrent-request race can exceed this by a
 * message or two, and that is an accepted tradeoff — no transactional
 * rate limiting here.
 */
export const DAILY_MESSAGE_CAP = 50;

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

/**
 * Counts how many user messages this user has sent today. Only rows with
 * role = 'user' count — assistant replies never count toward the cap.
 */
export async function countMessagesToday(
  db: typeof Db,
  userId: string,
): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(messages)
    .where(
      and(
        eq(messages.userId, userId),
        eq(messages.role, "user"),
        gte(messages.createdAt, startOfTodayUtc()),
      ),
    );

  return row?.value ?? 0;
}

export type DailyCapCheck = {
  allowed: boolean;
  count: number;
};

/**
 * Checks whether this user may send another message today. Runs
 * server-side, before the new message is persisted or the model is called.
 */
export async function checkDailyCap(
  db: typeof Db,
  userId: string,
): Promise<DailyCapCheck> {
  const messageCount = await countMessagesToday(db, userId);
  return { allowed: messageCount < DAILY_MESSAGE_CAP, count: messageCount };
}
