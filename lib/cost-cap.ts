import { and, eq, gte, sum } from "drizzle-orm";
import type { db as Db } from "@/lib/db/client";
import { usageEvents } from "@/lib/db/schema";
import type { SubscriptionStatus } from "@/lib/gate";
import { getAgentModel } from "@/lib/agent/models";

/** Costs are stored and compared as whole micro-USD to avoid float drift. */
export const MICRO_USD_PER_USD = 1_000_000;

/**
 * Monthly model-spend budget for a paying subscriber.
 *
 * The plan is $39/month, roughly $37.50 after Stripe's cut. At a 20% cost
 * of goods that leaves about $8 of model spend per subscriber, which is
 * what this is set to. On the default economy model a full turn (draft +
 * premium review) costs on the order of $0.01, so $8 buys several hundred
 * turns a month — far beyond normal use, while still bounding the damage
 * from one user looping a script through Opus all weekend.
 */
export const PAID_MONTHLY_BUDGET_MICRO_USD = 8 * MICRO_USD_PER_USD;

/** Free accounts get a token amount, enough to evaluate the product. */
export const FREE_MONTHLY_BUDGET_MICRO_USD = 0.5 * MICRO_USD_PER_USD;

export function budgetForSubscription(status: SubscriptionStatus): number {
  return status === "active"
    ? PAID_MONTHLY_BUDGET_MICRO_USD
    : FREE_MONTHLY_BUDGET_MICRO_USD;
}

/**
 * What a call cost, in micro-USD, from the registry's list prices. Rounded
 * up so accumulated rounding always errs in our favour rather than the
 * budget's. An unknown model id costs 0 — it cannot be priced, and
 * blocking a user over an accounting gap would be the wrong failure.
 */
export function estimateCostMicroUsd(
  modelId: string,
  inputTokens: number | undefined,
  outputTokens: number | undefined,
): number {
  const model = getAgentModel(modelId);
  if (!model) return 0;

  const input = ((inputTokens ?? 0) / 1_000_000) * model.inputUsdPerMTok;
  const output = ((outputTokens ?? 0) / 1_000_000) * model.outputUsdPerMTok;

  return Math.ceil((input + output) * MICRO_USD_PER_USD);
}

function startOfThisMonthUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** Total micro-USD this user has spent on model calls in the current UTC month. */
export async function sumSpendThisMonth(
  db: typeof Db,
  userId: string,
): Promise<number> {
  const [row] = await db
    .select({ value: sum(usageEvents.costMicroUsd) })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.userId, userId),
        gte(usageEvents.createdAt, startOfThisMonthUtc()),
      ),
    );

  // Postgres SUM returns a numeric string, and null when no rows matched.
  return Number(row?.value ?? 0);
}

export type BudgetCheck = {
  allowed: boolean;
  spentMicroUsd: number;
  budgetMicroUsd: number;
};

/**
 * Whether this user has budget left this month. Checked before the model
 * is called; the spend it compares against is what previous calls actually
 * cost, so a user can cross the line on their last call but never keep
 * going past it.
 */
export async function checkMonthlyBudget(
  db: typeof Db,
  userId: string,
  subscriptionStatus: SubscriptionStatus,
): Promise<BudgetCheck> {
  const budgetMicroUsd = budgetForSubscription(subscriptionStatus);
  const spentMicroUsd = await sumSpendThisMonth(db, userId);

  return { allowed: spentMicroUsd < budgetMicroUsd, spentMicroUsd, budgetMicroUsd };
}

/**
 * Records what one model call cost. Never throws: usage accounting must
 * not be able to fail a reply the user has already been given.
 */
export async function recordUsage(
  db: typeof Db,
  event: {
    userId: string;
    modelId: string;
    inputTokens: number | undefined;
    outputTokens: number | undefined;
  },
): Promise<void> {
  try {
    await db.insert(usageEvents).values({
      userId: event.userId,
      modelId: event.modelId,
      inputTokens: event.inputTokens ?? 0,
      outputTokens: event.outputTokens ?? 0,
      costMicroUsd: estimateCostMicroUsd(
        event.modelId,
        event.inputTokens,
        event.outputTokens,
      ),
    });
  } catch (error) {
    console.error("Failed to record usage event", error);
  }
}
