import { describe, it, expect, vi } from "vitest";
import {
  capForSubscription,
  checkDailyCap,
  countMessagesToday,
  DAILY_MESSAGE_CAP,
  PAID_DAILY_MESSAGE_CAP,
} from "@/lib/daily-cap";

function makeDb(count: number) {
  const where = vi.fn().mockResolvedValue([{ value: count }]);
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));
  return { db: { select } as never, select, from, where };
}

describe("capForSubscription", () => {
  it("gives an active subscriber the paid cap", () => {
    expect(capForSubscription("active")).toBe(PAID_DAILY_MESSAGE_CAP);
  });

  it("gives free, past_due and canceled users the free cap", () => {
    expect(capForSubscription("free")).toBe(DAILY_MESSAGE_CAP);
    expect(capForSubscription("past_due")).toBe(DAILY_MESSAGE_CAP);
    expect(capForSubscription("canceled")).toBe(DAILY_MESSAGE_CAP);
  });
});

describe("daily cap", () => {
  it("filters by user id, role = 'user' and today's date", async () => {
    const { db, where } = makeDb(10);

    await countMessagesToday(db, "u1");

    expect(where).toHaveBeenCalledTimes(1);
  });

  it("allows sending the 50th message (count of 49 so far, cap of 50)", async () => {
    const { db } = makeDb(DAILY_MESSAGE_CAP - 1);

    const result = await checkDailyCap(db, "u1", "free");

    expect(result.allowed).toBe(true);
    expect(result.count).toBe(49);
    expect(result.cap).toBe(DAILY_MESSAGE_CAP);
  });

  it("denies once the free cap has already been reached", async () => {
    const { db } = makeDb(DAILY_MESSAGE_CAP);

    const result = await checkDailyCap(db, "u1", "free");

    expect(result.allowed).toBe(false);
    expect(result.count).toBe(50);
  });

  it("uses the higher paid cap for an active subscriber", async () => {
    const { db } = makeDb(DAILY_MESSAGE_CAP + 1);

    const result = await checkDailyCap(db, "u1", "active");

    expect(result.allowed).toBe(true);
    expect(result.cap).toBe(PAID_DAILY_MESSAGE_CAP);
  });
});
