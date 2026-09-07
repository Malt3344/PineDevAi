import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockGenerateText } = vi.hoisted(() => ({
  mockGenerateText: vi.fn(),
}));

vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");
  return { ...actual, generateText: mockGenerateText };
});

// The provider layer is the seam: these tests care about which model id is
// asked for, never about which vendor SDK answers.
vi.mock("@/lib/agent/provider", () => ({
  languageModelFor: vi.fn((modelId: string) => ({ modelId })),
}));

import { generateResponse } from "@/lib/agent/generate-response";
import { SYSTEM_PROMPT } from "@/lib/agent/system-prompt";
import { REVIEW_SYSTEM_PROMPT } from "@/lib/agent/self-review";
import {
  DEFAULT_AGENT_MODEL_ID,
  FALLBACK_AGENT_MODEL_ID,
  REVIEW_MODEL_ID,
} from "@/lib/agent/models";
import { languageModelFor } from "@/lib/agent/provider";

/** Reads the full text out of a UI-message-stream Response, for assertions. */
async function readStreamedText(response: Response): Promise<string> {
  const body = await response.text();
  const deltas = [...body.matchAll(/"delta":"((?:[^"\\]|\\.)*)"/g)].map((m) =>
    JSON.parse(`"${m[1]}"`),
  );
  return deltas.join("");
}

const DRAFT_WITH_CODE = 'Here you go:\n```pine\nstrategy("broken")\n```';
const USAGE = { inputTokens: 100, outputTokens: 50 };

/**
 * The real generateText result exposes `text` and `usage` as prototype
 * getters, not own properties — so `{ ...result }` silently drops both.
 * A plain-object mock hides that entire class of bug, and did: it let a
 * spread ship to production that turned every reply into undefined. These
 * mocks reproduce the getter shape so the tests feel what the SDK does.
 */
function sdkResult(fields: { text: string; usage?: typeof USAGE }) {
  return Object.create(
    {
      get text() {
        return fields.text;
      },
      get usage() {
        return fields.usage;
      },
    },
    { steps: { value: [], enumerable: true } },
  );
}

describe("generateResponse", () => {
  beforeEach(() => {
    mockGenerateText.mockReset();
    vi.mocked(languageModelFor).mockClear();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("defaults to the default model, and returns the draft unchanged when there is no code to review", async () => {
    mockGenerateText.mockResolvedValueOnce(sdkResult({ text: "Repainting means...", usage: USAGE }));

    const response = await generateResponse({ messages: [] });

    expect(languageModelFor).toHaveBeenCalledWith(DEFAULT_AGENT_MODEL_ID);
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({ system: SYSTEM_PROMPT, messages: [] }),
    );
    await expect(readStreamedText(response)).resolves.toBe("Repainting means...");
  });

  it("runs a real second review pass and streams the corrected code when the reviewer finds a problem", async () => {
    mockGenerateText
      .mockResolvedValueOnce(sdkResult({ text: DRAFT_WITH_CODE, usage: USAGE }))
      .mockResolvedValueOnce({
        text: '```pine\n//@version=6\nstrategy("fixed")\n```',
        usage: USAGE,
      });

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

  it("sends a cheap model's code to the premium reviewer, so an economy draft is still checked properly", async () => {
    mockGenerateText
      .mockResolvedValueOnce(sdkResult({ text: DRAFT_WITH_CODE, usage: USAGE }))
      .mockResolvedValueOnce(sdkResult({ text: "OK", usage: USAGE }));

    await generateResponse({ modelId: DEFAULT_AGENT_MODEL_ID, messages: [] });

    expect(languageModelFor).toHaveBeenNthCalledWith(1, DEFAULT_AGENT_MODEL_ID);
    expect(languageModelFor).toHaveBeenNthCalledWith(2, REVIEW_MODEL_ID);
  });

  it("calls onFinish with the final (possibly corrected) text before the client-facing stream starts", async () => {
    mockGenerateText.mockResolvedValueOnce(sdkResult({ text: "hello", usage: USAGE }));
    const onFinish = vi.fn();

    await generateResponse({ messages: [], onFinish });

    expect(onFinish).toHaveBeenCalledWith({ text: "hello" });
  });

  describe("fallback", () => {
    it("serves the reply from the fallback model when the primary provider fails", async () => {
      mockGenerateText
        .mockRejectedValueOnce(new Error("429 rate limited"))
        .mockResolvedValueOnce(sdkResult({ text: "from the fallback", usage: USAGE }));

      const response = await generateResponse({
        modelId: DEFAULT_AGENT_MODEL_ID,
        messages: [],
      });

      expect(languageModelFor).toHaveBeenNthCalledWith(1, DEFAULT_AGENT_MODEL_ID);
      expect(languageModelFor).toHaveBeenNthCalledWith(2, FALLBACK_AGENT_MODEL_ID);
      await expect(readStreamedText(response)).resolves.toBe("from the fallback");
    });

    it("bills the fallback model, not the one that failed", async () => {
      mockGenerateText
        .mockRejectedValueOnce(new Error("provider down"))
        .mockResolvedValueOnce(sdkResult({ text: "from the fallback", usage: USAGE }));
      const onUsage = vi.fn();

      await generateResponse({ modelId: DEFAULT_AGENT_MODEL_ID, messages: [], onUsage });

      expect(onUsage).toHaveBeenCalledTimes(1);
      expect(onUsage).toHaveBeenCalledWith({
        modelId: FALLBACK_AGENT_MODEL_ID,
        inputTokens: 100,
        outputTokens: 50,
      });
    });

    it("throws only when every model in the chain fails", async () => {
      mockGenerateText
        .mockRejectedValueOnce(new Error("primary down"))
        .mockRejectedValueOnce(new Error("fallback down"));

      await expect(generateResponse({ messages: [] })).rejects.toThrow("fallback down");
    });

    it("still delivers the draft when the review pass fails, rather than crashing the chat", async () => {
      mockGenerateText
        .mockResolvedValueOnce(sdkResult({ text: DRAFT_WITH_CODE, usage: USAGE }))
        .mockRejectedValueOnce(new Error("reviewer unavailable"));

      const response = await generateResponse({ messages: [] });

      await expect(readStreamedText(response)).resolves.toBe(DRAFT_WITH_CODE);
    });
  });

  describe("usage reporting", () => {
    it("reports the draft and the review as separate calls, each against the model that ran it", async () => {
      mockGenerateText
        .mockResolvedValueOnce(sdkResult({ text: DRAFT_WITH_CODE, usage: USAGE }))
        .mockResolvedValueOnce(sdkResult({ text: "OK", usage: { inputTokens: 20, outputTokens: 1 } }));
      const onUsage = vi.fn();

      await generateResponse({ modelId: DEFAULT_AGENT_MODEL_ID, messages: [], onUsage });

      expect(onUsage).toHaveBeenNthCalledWith(1, {
        modelId: DEFAULT_AGENT_MODEL_ID,
        inputTokens: 100,
        outputTokens: 50,
      });
      expect(onUsage).toHaveBeenNthCalledWith(2, {
        modelId: REVIEW_MODEL_ID,
        inputTokens: 20,
        outputTokens: 1,
      });
    });

    it("does not report a review that never ran", async () => {
      mockGenerateText.mockResolvedValueOnce(sdkResult({ text: "no code here", usage: USAGE }));
      const onUsage = vi.fn();

      await generateResponse({ messages: [], onUsage });

      expect(onUsage).toHaveBeenCalledTimes(1);
    });
  });
});

describe("empty responses", () => {
  beforeEach(() => {
    mockGenerateText.mockReset();
    vi.mocked(languageModelFor).mockClear();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("treats an empty draft as a failure and falls through to the next model", async () => {
    mockGenerateText
      .mockResolvedValueOnce(sdkResult({ text: "   ", usage: USAGE }))
      .mockResolvedValueOnce(sdkResult({ text: "a real answer", usage: USAGE }));

    const response = await generateResponse({
      modelId: DEFAULT_AGENT_MODEL_ID,
      messages: [],
    });

    expect(languageModelFor).toHaveBeenNthCalledWith(2, FALLBACK_AGENT_MODEL_ID);
    await expect(readStreamedText(response)).resolves.toBe("a real answer");
  });

  it("does not bill a model for an empty response", async () => {
    mockGenerateText
      .mockResolvedValueOnce(sdkResult({ text: "", usage: USAGE }))
      .mockResolvedValueOnce(sdkResult({ text: "a real answer", usage: USAGE }));
    const onUsage = vi.fn();

    await generateResponse({ modelId: DEFAULT_AGENT_MODEL_ID, messages: [], onUsage });

    expect(onUsage).toHaveBeenCalledTimes(1);
    expect(onUsage).toHaveBeenCalledWith(
      expect.objectContaining({ modelId: FALLBACK_AGENT_MODEL_ID }),
    );
  });

  it("errors rather than streaming nothing when every model comes back empty", async () => {
    mockGenerateText
      .mockResolvedValueOnce(sdkResult({ text: "", usage: USAGE }))
      .mockResolvedValueOnce(sdkResult({ text: "", usage: USAGE }));

    await expect(generateResponse({ messages: [] })).rejects.toThrow(/empty response/);
  });
});
