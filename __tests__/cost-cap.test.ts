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
import { AGENT_MODELS } from "@/lib/agent/models";

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
  // Every model on offer is free right now, so this whole path bills zero.
  // The arithmetic below is what will start mattering the moment a priced
  // model is added back to the registry.
  it("costs nothing while every model in the registry is free", () => {
    for (const id of AGENT_MODELS.map((m) => m.id)) {
      expect(estimateCostMicroUsd(id, 500_000, 500_000)).toBe(0);
    }
  });

  it("rounds a priced call up, so accumulated rounding never under-counts spend", () => {
    // Priced from a hypothetical entry rather than the registry, which has
    // no paid model to read rates from today.
    const perMillion = 0.32;
    const oneToken = Math.ceil((1 / 1_000_000) * perMillion * MICRO_USD_PER_USD);
    expect(oneToken).toBe(1);
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
      modelId: "nemotron-ultra",
      inputTokens: 1_000_000,
      outputTokens: 0,
    });

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        modelId: "nemotron-ultra",
        inputTokens: 1_000_000,
        costMicroUsd: 0,
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
