import { describe, it, expect, vi } from "vitest";
import { syncSubscriptionStatus } from "@/lib/billing";

function makeDb() {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn(() => ({ where }));
  const update = vi.fn(() => ({ set }));
  return { db: { update } as never, set };
}

describe("syncSubscriptionStatus", () => {
  it("grants isApproved when a subscription becomes active — paying skips the waitlist", async () => {
    const { db, set } = makeDb();

    await syncSubscriptionStatus(db, "cus_1", "active", "sub_1");

    expect(set).toHaveBeenCalledWith({
      subscriptionStatus: "active",
      stripeSubscriptionId: "sub_1",
      isApproved: true,
    });
  });

  it("does not touch isApproved when a subscription lapses to past_due", async () => {
    const { db, set } = makeDb();

    await syncSubscriptionStatus(db, "cus_1", "past_due", "sub_1");

    expect(set).toHaveBeenCalledWith({
      subscriptionStatus: "past_due",
      stripeSubscriptionId: "sub_1",
    });
  });

  it("does not revoke isApproved when a subscription is canceled", async () => {
    const { db, set } = makeDb();

    await syncSubscriptionStatus(db, "cus_1", "canceled", null);

    expect(set).toHaveBeenCalledWith({
      subscriptionStatus: "canceled",
      stripeSubscriptionId: null,
    });
  });
});
