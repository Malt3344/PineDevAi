import { describe, it, expect, vi } from "vitest";
import { getUsageSummary } from "@/lib/usage";
import { DAILY_MESSAGE_CAP, PAID_DAILY_MESSAGE_CAP } from "@/lib/daily-cap";

function makeDb(results: number[]) {
  const where = vi.fn();
  results.forEach((value) => where.mockResolvedValueOnce([{ value }]));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));
  return { select } as never;
}

describe("getUsageSummary", () => {
  it("returns the real counts, in order: today, lifetime messages, conversations, strategies", async () => {
    const db = makeDb([7, 42, 5, 3]);

    const summary = await getUsageSummary(db, "u1", "free");

    expect(summary).toEqual({
      messagesToday: 7,
      dailyMessageCap: DAILY_MESSAGE_CAP,
      totalMessagesSent: 42,
      totalConversations: 5,
      totalStrategiesSaved: 3,
    });
  });

  it("uses the paid cap for an active subscriber", async () => {
    const db = makeDb([1, 1, 1, 1]);

    const summary = await getUsageSummary(db, "u1", "active");

    expect(summary.dailyMessageCap).toBe(PAID_DAILY_MESSAGE_CAP);
  });

  it("defaults every count to zero for a brand-new account", async () => {
    const db = makeDb([0, 0, 0, 0]);

    const summary = await getUsageSummary(db, "new-user", "free");

    expect(summary.messagesToday).toBe(0);
    expect(summary.totalMessagesSent).toBe(0);
    expect(summary.totalConversations).toBe(0);
    expect(summary.totalStrategiesSaved).toBe(0);
  });
});
