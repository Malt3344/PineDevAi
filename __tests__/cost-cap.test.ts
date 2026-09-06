import { describe, it, expect, vi } from "vitest";
import {
  budgetForSubscription,
  checkMonthlyBudget,
  estimateCostMicroUsd,
  recordUsage,
  sumSpendThisMonth,
  FREE_MONTHLY_BUDGET_MICRO_USD,
  PAID_MONTHLY_BUDGET_MICRO_USD,
  MICRO_USD_PER_USD,
} from "@/lib/cost-cap";

/** Postgres SUM comes back as a numeric string, or null when nothing matched. */
function makeDb(sumValue: string | null) {
  const where = vi.fn().mockResolvedValue([{ value: sumValue }]);
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));
  const values = vi.fn().mockResolvedValue(undefined);
  const insert = vi.fn(() => ({ values }));
  return { db: { select, insert } as never, where, values };
}

describe("budgetForSubscription", () => {
  it("gives an active subscriber the paid budget", () => {
    expect(budgetForSubscription("active")).toBe(PAID_MONTHLY_BUDGET_MICRO_USD);
  });

  it("treats free, past_due and canceled alike", () => {
    expect(budgetForSubscription("free")).toBe(FREE_MONTHLY_BUDGET_MICRO_USD);
    expect(budgetForSubscription("past_due")).toBe(FREE_MONTHLY_BUDGET_MICRO_USD);
    expect(budgetForSubscription("canceled")).toBe(FREE_MONTHLY_BUDGET_MICRO_USD);
  });

  it("leaves real margin on a $39 plan", () => {
    expect(PAID_MONTHLY_BUDGET_MICRO_USD).toBeLessThan(39 * MICRO_USD_PER_USD * 0.35);
  });
});

describe("estimateCostMicroUsd", () => {
  it("prices a call from the registry's per-million-token rates", () => {
    // Claude Sonnet 5: $2/M in, $10/M out. 1M in + 1M out = $12.
    expect(estimateCostMicroUsd("claude-sonnet-5", 1_000_000, 1_000_000)).toBe(
      12 * MICRO_USD_PER_USD,
    );
  });

  it("makes the economy default far cheaper than the premium model for the same turn", () => {
    const economy = estimateCostMicroUsd("deepseek-v3", 4000, 1500);
    const premium = estimateCostMicroUsd("claude-opus-5", 4000, 1500);

    expect(economy).toBeGreaterThan(0);
    expect(economy * 20).toBeLessThan(premium);
  });

  it("rounds up, so accumulated rounding never under-counts spend", () => {
    expect(estimateCostMicroUsd("deepseek-v3", 1, 0)).toBe(1);
  });

  it("costs nothing for a free model, so the budget never blocks one", () => {
    expect(estimateCostMicroUsd("minimax-m3", 500_000, 500_000)).toBe(0);
    expect(estimateCostMicroUsd("nemotron-ultra", 500_000, 500_000)).toBe(0);
  });

  it("treats missing token counts as zero rather than NaN", () => {
    expect(estimateCostMicroUsd("deepseek-v3", undefined, undefined)).toBe(0);
  });

  it("charges nothing for an unknown model instead of blocking the user over an accounting gap", () => {
    expect(estimateCostMicroUsd("retired-model", 100_000, 100_000)).toBe(0);
  });
});

describe("sumSpendThisMonth", () => {
  it("reads the numeric string Postgres returns", async () => {
    const { db } = makeDb("1250000");
    await expect(sumSpendThisMonth(db, "u1")).resolves.toBe(1_250_000);
  });

  it("treats a user with no usage rows as having spent nothing", async () => {
    const { db } = makeDb(null);
    await expect(sumSpendThisMonth(db, "u1")).resolves.toBe(0);
  });
});

describe("checkMonthlyBudget", () => {
  it("allows a paid user who is under budget", async () => {
    const { db } = makeDb(String(PAID_MONTHLY_BUDGET_MICRO_USD - 1));

    const result = await checkMonthlyBudget(db, "u1", "active");

    expect(result.allowed).toBe(true);
    expect(result.budgetMicroUsd).toBe(PAID_MONTHLY_BUDGET_MICRO_USD);
  });

  it("denies once spend has reached the budget", async () => {
    const { db } = makeDb(String(PAID_MONTHLY_BUDGET_MICRO_USD));

    const result = await checkMonthlyBudget(db, "u1", "active");

    expect(result.allowed).toBe(false);
    expect(result.spentMicroUsd).toBe(PAID_MONTHLY_BUDGET_MICRO_USD);
  });

  it("stops a free user far sooner than a paying one at identical spend", async () => {
    const spend = String(FREE_MONTHLY_BUDGET_MICRO_USD + 1);

    await expect(checkMonthlyBudget(makeDb(spend).db, "u1", "free")).resolves.toMatchObject(
      { allowed: false },
    );
    await expect(
      checkMonthlyBudget(makeDb(spend).db, "u1", "active"),
    ).resolves.toMatchObject({ allowed: true });
  });
});

describe("recordUsage", () => {
  it("stores the tokens and the cost derived from them", async () => {
    const { db, values } = makeDb("0");

    await recordUsage(db, {
      userId: "u1",
      modelId: "claude-sonnet-5",
      inputTokens: 1_000_000,
      outputTokens: 0,
    });

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        modelId: "claude-sonnet-5",
        inputTokens: 1_000_000,
        costMicroUsd: 2 * MICRO_USD_PER_USD,
      }),
    );
  });

  it("never throws — accounting must not fail a reply the user already has", async () => {
    const values = vi.fn().mockRejectedValue(new Error("db down"));
    const db = { insert: vi.fn(() => ({ values })) } as never;
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      recordUsage(db, {
        userId: "u1",
        modelId: "deepseek-v3",
        inputTokens: 10,
        outputTokens: 10,
      }),
    ).resolves.toBeUndefined();

    consoleError.mockRestore();
  });
});
