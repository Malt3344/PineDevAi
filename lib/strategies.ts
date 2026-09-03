import { desc, eq } from "drizzle-orm";
import type { db as Db } from "@/lib/db/client";
import { strategies } from "@/lib/db/schema";

const MAX_TITLE_LENGTH = 80;

export type SaveStrategyInput = {
  userId: string;
  title: string;
  code: string;
  sourceConversationId?: string | null;
};

/**
 * Saves a Pine Script snippet to the user's strategy library, independent
 * of the conversation it came from. `sourceConversationId` is kept only as
 * a soft reference for traceability; deleting that conversation later does
 * not delete the saved strategy.
 */
export async function saveStrategy(db: typeof Db, input: SaveStrategyInput) {
  const [row] = await db
    .insert(strategies)
    .values({
      userId: input.userId,
      title: input.title.slice(0, MAX_TITLE_LENGTH) || "Untitled strategy",
      code: input.code,
      sourceConversationId: input.sourceConversationId ?? null,
    })
    .returning();

  return row;
}

/** Lists a user's saved strategies, most recently saved first. */
export async function listStrategies(db: typeof Db, userId: string) {
  return db
    .select()
    .from(strategies)
    .where(eq(strategies.userId, userId))
    .orderBy(desc(strategies.createdAt));
}
