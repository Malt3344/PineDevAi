import { describe, it, expect, vi, beforeEach } from "vitest";
import type { UIMessage } from "ai";

vi.mock("@/lib/gate", () => ({
  getApprovedUser: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  db: { select: vi.fn() },
}));

vi.mock("@/lib/daily-cap", () => ({
  checkDailyCap: vi.fn(),
  DAILY_MESSAGE_CAP: 20,
}));

vi.mock("@/lib/cost-cap", () => ({
  checkMonthlyBudget: vi.fn(),
  recordUsage: vi.fn(),
}));

vi.mock("@/lib/messages", () => ({
  insertMessage: vi.fn(),
}));

vi.mock("@/lib/conversations", () => ({
  setInitialTitleIfEmpty: vi.fn(),
}));

vi.mock("@/lib/agent/generate-response", () => ({
  generateResponse: vi.fn(() => Promise.resolve(new Response("stream", { status: 200 }))),
}));

import { POST } from "@/app/api/chat/route";
import { getApprovedUser } from "@/lib/gate";
import { db } from "@/lib/db/client";
import { checkDailyCap } from "@/lib/daily-cap";
import { checkMonthlyBudget } from "@/lib/cost-cap";
import { insertMessage } from "@/lib/messages";
import { setInitialTitleIfEmpty } from "@/lib/conversations";
import { generateResponse } from "@/lib/agent/generate-response";
import { AGENT_MODELS, DEFAULT_AGENT_MODEL_ID } from "@/lib/agent/models";

function mockConversationLookup(rows: { id: string; model: string }[]) {
  const where = vi.fn().mockResolvedValue(rows);
  const from = vi.fn(() => ({ where }));
  (db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ from });
}

const userMessages: UIMessage[] = [
  { id: "m1", role: "user", parts: [{ type: "text", text: "hello there" }] },
];

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const approvedUser = {
  id: "real-user-id",
  email: "real@example.com",
  subscriptionStatus: "free" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/chat", () => {
  it("rejects unauthenticated requests with 401", async () => {
    (getApprovedUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "unauthenticated",
    });

    const res = await POST(
      makeRequest({ conversationId: "c1", messages: userMessages }),
    );

    expect(res.status).toBe(401);
    expect(insertMessage).not.toHaveBeenCalled();
  });

  it("rejects unapproved users with 403", async () => {
    (getApprovedUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "unapproved",
      user: approvedUser,
    });

    const res = await POST(
      makeRequest({ conversationId: "c1", messages: userMessages }),
    );

    expect(res.status).toBe(403);
    expect(insertMessage).not.toHaveBeenCalled();
  });

  it("rejects over-cap users with a 429 and the cap message", async () => {
    (getApprovedUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "approved",
      user: approvedUser,
    });
    mockConversationLookup([{ id: "c1", model: "claude-sonnet-4-6" }]);
    (checkDailyCap as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: false,
      count: 20,
    });

    const res = await POST(
      makeRequest({ conversationId: "c1", messages: userMessages }),
    );
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.error).toMatch(/limit/i);
    expect(insertMessage).not.toHaveBeenCalled();
    expect(generateResponse).not.toHaveBeenCalled();
  });

  it("rejects a user who is under the message cap but out of monthly budget", async () => {
    (getApprovedUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "approved",
      user: approvedUser,
    });
    mockConversationLookup([{ id: "c1", model: "claude-sonnet-4-6" }]);
    (checkDailyCap as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: true,
      count: 1,
    });
    (checkMonthlyBudget as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: false,
      spentMicroUsd: 8_000_000,
      budgetMicroUsd: 8_000_000,
    });

    const res = await POST(
      makeRequest({ conversationId: "c1", messages: userMessages }),
    );
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.error).toMatch(/model usage/i);
    // Nothing is persisted and no model is called once the budget is gone.
    expect(insertMessage).not.toHaveBeenCalled();
    expect(generateResponse).not.toHaveBeenCalled();
  });

  it("ignores any client-supplied user_id and persists the user message + calls the model on the happy path", async () => {
    (getApprovedUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "approved",
      user: approvedUser,
    });
    mockConversationLookup([{ id: "c1", model: "claude-sonnet-4-6" }]);
    (checkDailyCap as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: true,
      count: 0,
    });
    (checkMonthlyBudget as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: true,
      spentMicroUsd: 0,
      budgetMicroUsd: 8_000_000,
    });

    const res = await POST(
      makeRequest({
        conversationId: "c1",
        user_id: "attacker-supplied-id",
        messages: userMessages,
      }),
    );

    expect(res.status).toBe(200);

    // The persisted user message uses the server-derived identity, never
    // the client-supplied user_id.
    expect(insertMessage).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        conversationId: "c1",
        userId: "real-user-id",
        role: "user",
        content: "hello there",
      }),
    );
    expect(setInitialTitleIfEmpty).toHaveBeenCalledWith(
      expect.anything(),
      "c1",
      "hello there",
    );
    expect(generateResponse).toHaveBeenCalledTimes(1);
    const call = (generateResponse as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    // The conversation was started on a model that has since been removed
    // from the registry; it falls back rather than failing forever.
    expect(call.modelId).toBe(DEFAULT_AGENT_MODEL_ID);
    expect(call.messages).toBeDefined();
    expect(typeof call.onFinish).toBe("function");

    // The daily cap is checked against this user's actual plan.
    expect(checkDailyCap).toHaveBeenCalledWith(
      expect.anything(),
      "real-user-id",
      "free",
    );
  });

  it("saves the assistant message via onFinish with the correct conversation, user and role", async () => {
    (getApprovedUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "approved",
      user: approvedUser,
    });
    mockConversationLookup([{ id: "c1", model: "claude-sonnet-4-6" }]);
    (checkDailyCap as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: true,
      count: 0,
    });
    (checkMonthlyBudget as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: true,
      spentMicroUsd: 0,
      budgetMicroUsd: 8_000_000,
    });

    await POST(makeRequest({ conversationId: "c1", messages: userMessages }));

    const call = (generateResponse as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    await call.onFinish({ text: "here is your corrected script" });

    expect(insertMessage).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        conversationId: "c1",
        userId: "real-user-id",
        role: "assistant",
        content: "here is your corrected script",
      }),
    );
  });

  it("uses the conversation's own model when it is still a real one", async () => {
    const real = AGENT_MODELS[AGENT_MODELS.length - 1].id;
    (getApprovedUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "approved",
      user: approvedUser,
    });
    mockConversationLookup([{ id: "c1", model: real }]);
    (checkDailyCap as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: true,
      count: 0,
    });
    (checkMonthlyBudget as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: true,
      spentMicroUsd: 0,
      budgetMicroUsd: 8_000_000,
    });

    await POST(makeRequest({ conversationId: "c1", messages: userMessages }));

    const call = (generateResponse as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.modelId).toBe(real);
  });
});