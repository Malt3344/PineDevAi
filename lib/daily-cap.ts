import { and, count, eq, gte } from "drizzle-orm";
import type { db as Db } from "@/lib/db/client";
import { messages } from "@/lib/db/schema";
import type { SubscriptionStatus } from "@/lib/gate";

/**
 * Maximum number of user messages a free-plan user may send per day.
 * Best-effort for MVP: a concurrent-request race can exceed this by a
 * message or two, and that is an accepted tradeoff — no transactional
 * rate limiting here.
 *
 * This is the anti-spam guard, deliberately not the budget guard: it
 * bounds request volume, while lib/cost-cap.ts bounds actual spend. A
 * message count cannot protect a budget on its own, because one turn can
 * cost anywhere from a tenth of a cent to several cents depending on the
 * model and how long the conversation has grown.
 */
export const DAILY_MESSAGE_CAP = 20;

/**
 * Cap for a user with an active paid subscription. Sized as a generous
 * ceiling on a heavy day of real work, not as the spend limit — at the old
 * value of 1000 a single user on a premium model could run up more in one
 * day than their subscription brings in over a month.
 */
export const PAID_DAILY_MESSAGE_CAP = 150;

/** Picks the right daily cap for a user's current subscription status. */
export function capForSubscription(status: SubscriptionStatus): number {
  return status === "active" ? PAID_DAILY_MESSAGE_CAP : DAILY_MESSAGE_CAP;
}

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
  cap: number;
};

/**
 * Checks whether this user may send another message today. Runs
 * server-side, before the new message is persisted or the model is called.
 */
export async function checkDailyCap(
  db: typeof Db,
  userId: string,
  subscriptionStatus: SubscriptionStatus,
): Promise<DailyCapCheck> {
  const cap = capForSubscription(subscriptionStatus);
  const messageCount = await countMessagesToday(db, userId);
  return { allowed: messageCount < cap, count: messageCount, cap };
}
