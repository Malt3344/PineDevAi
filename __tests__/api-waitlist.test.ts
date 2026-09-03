import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockInsert, mockValues } = vi.hoisted(() => {
  const values = vi.fn();
  const insert = vi.fn(() => ({ values }));
  return { mockInsert: insert, mockValues: values };
});

vi.mock("@/lib/db/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db/client")>();
  return {
    ...actual,
    db: { insert: mockInsert },
  };
});

import { POST } from "@/app/api/waitlist/route";
import { waitlist } from "@/lib/db/schema";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/waitlist", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/waitlist", () => {
  beforeEach(() => {
    mockInsert.mockClear();
    mockValues.mockReset();
  });

  it("inserts a valid email and returns success", async () => {
    mockValues.mockResolvedValue(undefined);

    const res = await POST(makeRequest({ email: "Test@Example.com" }));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.message).toMatch(/waitlist/i);
  });

  it("uses the waitlist table via the server-side db client", async () => {
    mockValues.mockResolvedValue(undefined);

    await POST(makeRequest({ email: "test@example.com" }));

    expect(mockInsert).toHaveBeenCalledWith(waitlist);
    expect(mockValues).toHaveBeenCalledWith({ email: "test@example.com" });
  });

  it("rejects an invalid email with 400 and an error message", async () => {
    const res = await POST(makeRequest({ email: "not-an-email" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBeTruthy();
    expect(mockValues).not.toHaveBeenCalled();
  });

  it("returns a friendly 'already on the list' response for a duplicate email", async () => {
    // Drizzle wraps the driver's error in a DrizzleQueryError, with the
    // real Postgres error (and its .code) nested under .cause — mirror
    // that shape here rather than a flat { code } object.
    mockValues.mockRejectedValue({
      message: "Failed query: insert into ...",
      cause: { code: "23505", message: "duplicate key value violates unique constraint" },
    });

    const res = await POST(makeRequest({ email: "dup@example.com" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toMatch(/already/i);
  });
});
