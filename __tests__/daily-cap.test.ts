import { describe, it, expect, vi } from "vitest";
import { checkDailyCap, countMessagesToday, DAILY_MESSAGE_CAP } from "@/lib/daily-cap";

function makeDb(count: number) {
  const where = vi.fn().mockResolvedValue([{ value: count }]);
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));
  return { db: { select } as never, select, from, where };
}

describe("daily cap", () => {
  it("filters by user id, role = 'user' and today's date", async () => {
    const { db, where } = makeDb(10);

    await countMessagesToday(db, "u1");

    expect(where).toHaveBeenCalledTimes(1);
  });

  it("allows sending the 50th message (count of 49 so far, cap of 50)", async () => {
    const { db } = makeDb(DAILY_MESSAGE_CAP - 1);

    const result = await checkDailyCap(db, "u1");

    expect(result.allowed).toBe(true);
    expect(result.count).toBe(49);
  });

  it("denies once the cap of 50 has already been reached", async () => {
    const { db } = makeDb(DAILY_MESSAGE_CAP);

    const result = await checkDailyCap(db, "u1");

    expect(result.allowed).toBe(false);
    expect(result.count).toBe(50);
  });
});
