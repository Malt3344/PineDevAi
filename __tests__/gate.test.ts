import { describe, it, expect, vi } from "vitest";

const { mockGetUser, mockWhere } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockWhere: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/db/client", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({ where: mockWhere })),
    })),
  },
}));

import { getApprovedUser } from "@/lib/gate";

describe("getApprovedUser", () => {
  it("returns the approved user when logged in and approved", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "a@b.com" } } });
    mockWhere.mockResolvedValue([{ isApproved: true, subscriptionStatus: "free" }]);

    const result = await getApprovedUser();

    expect(result.status).toBe("approved");
    if (result.status === "approved") {
      expect(result.user).toEqual({
        id: "u1",
        email: "a@b.com",
        subscriptionStatus: "free",
      });
    }
  });

  it("returns a deny signal when logged in but not approved", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "a@b.com" } } });
    mockWhere.mockResolvedValue([{ isApproved: false, subscriptionStatus: "free" }]);

    const result = await getApprovedUser();

    expect(result.status).toBe("unapproved");
  });

  it("passes through an active subscription status", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "a@b.com" } } });
    mockWhere.mockResolvedValue([{ isApproved: true, subscriptionStatus: "active" }]);

    const result = await getApprovedUser();

    expect(result.status).toBe("approved");
    if (result.status === "approved") {
      expect(result.user.subscriptionStatus).toBe("active");
    }
  });

  it("returns unauthenticated when there is no session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockWhere.mockResolvedValue([]);

    const result = await getApprovedUser();

    expect(result.status).toBe("unauthenticated");
  });
});
