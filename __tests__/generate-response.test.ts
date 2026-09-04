import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGenerateText } = vi.hoisted(() => ({
  mockGenerateText: vi.fn(),
}));

vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");
  return {
    ...actual,
    generateText: mockGenerateText,
  };
});

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn((modelId: string) => ({ modelId })),
}));

import { generateResponse } from "@/lib/agent/generate-response";
import { SYSTEM_PROMPT } from "@/lib/agent/system-prompt";
import { REVIEW_SYSTEM_PROMPT } from "@/lib/agent/self-review";
import { DEFAULT_AGENT_MODEL_ID } from "@/lib/agent/models";
import { anthropic } from "@ai-sdk/anthropic";

/** Reads the full text out of a UI-message-stream Response, for assertions. */
async function readStreamedText(response: Response): Promise<string> {
  const body = await response.text();
  const deltas = [...body.matchAll(/"delta":"((?:[^"\\]|\\.)*)"/g)].map((m) =>
    JSON.parse(`"${m[1]}"`),
  );
  return deltas.join("");
}

describe("generateResponse", () => {
  beforeEach(() => {
    mockGenerateText.mockReset();
  });

  it("defaults to the default model, and returns the draft unchanged when there is no code to review", async () => {
    mockGenerateText.mockResolvedValueOnce({ text: "Repainting means..." });

    const response = await generateResponse({ messages: [] });

    expect(anthropic).toHaveBeenCalledWith(DEFAULT_AGENT_MODEL_ID);
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({ system: SYSTEM_PROMPT, messages: [] }),
    );
    await expect(readStreamedText(response)).resolves.toBe("Repainting means...");
  });

  it("runs a real second review pass and streams the corrected code when the reviewer finds a problem", async () => {
    const draft = 'Here you go:\n```pine\nstrategy("broken")\n```';
    mockGenerateText
      .mockResolvedValueOnce({ text: draft })
      .mockResolvedValueOnce({ text: '```pine\n//@version=6\nstrategy("fixed")\n```' });

    const response = await generateResponse({ modelId: "claude-opus-4-6", messages: [] });

    expect(mockGenerateText).toHaveBeenCalledTimes(2);
    expect(mockGenerateText).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ system: REVIEW_SYSTEM_PROMPT }),
    );
    const text = await readStreamedText(response);
    expect(text).toContain('strategy("fixed")');
    expect(text).not.toContain('strategy("broken")');
  });

  it("calls onFinish with the final (possibly corrected) text before the client-facing stream starts", async () => {
    mockGenerateText.mockResolvedValueOnce({ text: "hello" });
    const onFinish = vi.fn();

    await generateResponse({ messages: [], onFinish });

    expect(onFinish).toHaveBeenCalledWith({ text: "hello" });
  });
});
