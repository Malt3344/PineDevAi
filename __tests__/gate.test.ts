import { describe, it, expect, vi } from "vitest";

const { mockAuth, mockWhere } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockWhere: vi.fn(),
}));

vi.mock("@/lib/auth/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db/client", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({ where: mockWhere })),
    })),
  },
}));

import { getApprovedUser } from "@/lib/gate";

process.env.TEAM_EMAILS = "a@b.com";

describe("getApprovedUser", () => {
  it("returns the approved user when logged in and approved", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
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
    mockAuth.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
    mockWhere.mockResolvedValue([{ isApproved: false, subscriptionStatus: "free" }]);

    const result = await getApprovedUser();

    expect(result.status).toBe("unapproved");
  });

  it("passes through an active subscription status", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
    mockWhere.mockResolvedValue([{ isApproved: true, subscriptionStatus: "active" }]);

    const result = await getApprovedUser();

    expect(result.status).toBe("approved");
    if (result.status === "approved") {
      expect(result.user.subscriptionStatus).toBe("active");
    }
  });

  it("returns unauthenticated when there is no session", async () => {
    mockAuth.mockResolvedValue(null);
    mockWhere.mockResolvedValue([]);

    const result = await getApprovedUser();

    expect(result.status).toBe("unauthenticated");
  });

  it("denies an approved account whose email is not on the team allowlist", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u2", email: "stranger@example.com" } });
    mockWhere.mockResolvedValue([{ isApproved: true, subscriptionStatus: "free" }]);

    expect((await getApprovedUser()).status).toBe("unapproved");
  });
});
