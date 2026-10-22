import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/gate", () => ({
  getApprovedUser: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  db: { select: vi.fn(), insert: vi.fn(), delete: vi.fn() },
}));

import { DELETE, GET, PATCH } from "@/app/api/vote/route";
import { getApprovedUser } from "@/lib/gate";
import { db } from "@/lib/db/client";

const approvedUser = { id: "real-user-id", email: "a@b.com", subscriptionStatus: "free" as const };

function selectResolving(...rows: unknown[][]) {
  const select = db.select as unknown as ReturnType<typeof vi.fn>;
  select.mockReset();
  for (const result of rows) {
    select.mockReturnValueOnce({ from: () => ({ where: () => Promise.resolve(result) }) });
  }
}

function mockInsertChain() {
  const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
  const values = vi.fn(() => ({ onConflictDoUpdate }));
  (db.insert as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ values });
  return { values, onConflictDoUpdate };
}

function mockDeleteChain() {
  const where = vi.fn().mockResolvedValue(undefined);
  (db.delete as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ where });
  return { where };
}

function getRequest(url: string) {
  return new Request(url);
}

function jsonRequest(url: string, method: string, body: unknown) {
  return new Request(url, { method, body: JSON.stringify(body) });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/vote", () => {
  it("rejects unauthenticated requests", async () => {
    (getApprovedUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "unauthenticated",
    });

    const res = await GET(getRequest("http://localhost/api/vote?chatId=c1"));

    expect(res.status).toBe(401);
  });

  it("rejects unapproved users", async () => {
    (getApprovedUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "unapproved",
      user: approvedUser,
    });

    const res = await GET(getRequest("http://localhost/api/vote?chatId=c1"));

    expect(res.status).toBe(403);
  });

  it("requires a chatId", async () => {
    (getApprovedUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "approved",
      user: approvedUser,
    });

    const res = await GET(getRequest("http://localhost/api/vote"));

    expect(res.status).toBe(400);
  });

  it("404s when the chat does not belong to the caller", async () => {
    (getApprovedUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "approved",
      user: approvedUser,
    });
    selectResolving([]); // ownedChat finds nothing

    const res = await GET(getRequest("http://localhost/api/vote?chatId=c1"));

    expect(res.status).toBe(404);
  });

  it("returns the chat's votes once ownership is confirmed", async () => {
    (getApprovedUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "approved",
      user: approvedUser,
    });
    selectResolving([{ id: "c1" }], [{ messageId: "m1", isUpvoted: true }]);

    const res = await GET(getRequest("http://localhost/api/vote?chatId=c1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ votes: [{ messageId: "m1", isUpvoted: true }] });
  });
});

describe("PATCH /api/vote", () => {
  it("rejects unauthenticated requests", async () => {
    (getApprovedUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "unauthenticated",
    });

    const res = await PATCH(
      jsonRequest("http://localhost/api/vote", "PATCH", { chatId: "c1", messageId: "m1", isUpvoted: true }),
    );

    expect(res.status).toBe(401);
  });

  it("validates the body", async () => {
    (getApprovedUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "approved",
      user: approvedUser,
    });

    const res = await PATCH(jsonRequest("http://localhost/api/vote", "PATCH", { chatId: "c1" }));

    expect(res.status).toBe(400);
  });

  it("404s when the chat is not the caller's", async () => {
    (getApprovedUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "approved",
      user: approvedUser,
    });
    selectResolving([]); // ownedChat finds nothing

    const res = await PATCH(
      jsonRequest("http://localhost/api/vote", "PATCH", { chatId: "c1", messageId: "m1", isUpvoted: true }),
    );

    expect(res.status).toBe(404);
  });

  it("404s when the message does not belong to that chat", async () => {
    (getApprovedUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "approved",
      user: approvedUser,
    });
    selectResolving([{ id: "c1" }], []); // chat owned, message lookup empty

    const res = await PATCH(
      jsonRequest("http://localhost/api/vote", "PATCH", { chatId: "c1", messageId: "m1", isUpvoted: true }),
    );

    expect(res.status).toBe(404);
  });

  it("upserts the vote via onConflictDoUpdate targeting the (chatId, messageId) pair", async () => {
    (getApprovedUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "approved",
      user: approvedUser,
    });
    selectResolving([{ id: "c1" }], [{ id: "m1" }]);
    const { values, onConflictDoUpdate } = mockInsertChain();

    const res = await PATCH(
      jsonRequest("http://localhost/api/vote", "PATCH", { chatId: "c1", messageId: "m1", isUpvoted: true }),
    );

    expect(res.status).toBe(200);
    expect(values).toHaveBeenCalledWith({ chatId: "c1", messageId: "m1", isUpvoted: true });
    expect(onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ set: { isUpvoted: true } }),
    );
  });
});

describe("DELETE /api/vote", () => {
  it("rejects unauthenticated requests", async () => {
    (getApprovedUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "unauthenticated",
    });

    const res = await DELETE(
      jsonRequest("http://localhost/api/vote", "DELETE", { chatId: "c1", messageId: "m1" }),
    );

    expect(res.status).toBe(401);
  });

  it("404s when the chat is not the caller's", async () => {
    (getApprovedUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "approved",
      user: approvedUser,
    });
    selectResolving([]);

    const res = await DELETE(
      jsonRequest("http://localhost/api/vote", "DELETE", { chatId: "c1", messageId: "m1" }),
    );

    expect(res.status).toBe(404);
  });

  it("removes the vote row once ownership is confirmed", async () => {
    (getApprovedUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "approved",
      user: approvedUser,
    });
    selectResolving([{ id: "c1" }]);
    const { where } = mockDeleteChain();

    const res = await DELETE(
      jsonRequest("http://localhost/api/vote", "DELETE", { chatId: "c1", messageId: "m1" }),
    );

    expect(res.status).toBe(200);
    expect(where).toHaveBeenCalledTimes(1);
  });
});
