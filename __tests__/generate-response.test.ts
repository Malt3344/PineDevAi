import { describe, it, expect, vi } from "vitest";

vi.mock("ai", () => ({
  streamText: vi.fn(() => ({ fakeStreamResult: true })),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn((modelId: string) => ({ modelId })),
}));

import { generateResponse } from "@/lib/agent/generate-response";
import { SYSTEM_PROMPT } from "@/lib/agent/system-prompt";
import { DEFAULT_AGENT_MODEL_ID } from "@/lib/agent/models";
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

describe("generateResponse", () => {
  it("defaults to the default model when no modelId is given", () => {
    generateResponse({ messages: [] });

    expect(anthropic).toHaveBeenCalledWith(DEFAULT_AGENT_MODEL_ID);
  });

  it("calls streamText with the given model, the system prompt and the given messages", () => {
    const messages = [{ role: "user", content: "hello" }] as never;
    const onFinish = vi.fn();

    generateResponse({ modelId: "claude-opus-4-6", messages, onFinish });

    expect(anthropic).toHaveBeenCalledWith("claude-opus-4-6");
    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: SYSTEM_PROMPT,
        messages,
        onFinish,
      }),
    );
  });
});
