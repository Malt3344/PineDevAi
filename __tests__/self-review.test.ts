import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGenerateText } = vi.hoisted(() => ({
  mockGenerateText: vi.fn(),
}));

vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");
  return { ...actual, generateText: mockGenerateText };
});

vi.mock("@/lib/agent/provider", () => ({
  languageModelFor: vi.fn((modelId: string) => ({ modelId })),
}));

import { selfReviewAndCorrect } from "@/lib/agent/self-review";
import { languageModelFor } from "@/lib/agent/provider";

describe("selfReviewAndCorrect", () => {
  beforeEach(() => {
    mockGenerateText.mockReset();
  });

  it("passes conversational replies through without calling the reviewer", async () => {
    const draft = "Repainting means the value of a bar changes after it closes.";

    const result = await selfReviewAndCorrect("claude-sonnet-4-6", draft);

    expect(mockGenerateText).not.toHaveBeenCalled();
    expect(result.text).toBe(draft);
  });

  it("keeps the draft unchanged when the reviewer says OK", async () => {
    const draft = 'Here:\n```pine\n//@version=6\nstrategy("ok")\n```';
    mockGenerateText.mockResolvedValueOnce({ text: "OK" });

    const result = await selfReviewAndCorrect("claude-sonnet-4-6", draft);

    expect(result.text).toBe(draft);
  });

  it("splices in the reviewer's corrected code when it finds a problem", async () => {
    const draft = 'Here:\n```pine\nstrategy("broken")\n```';
    mockGenerateText.mockResolvedValueOnce({
      text: '```pine\n//@version=6\nstrategy("fixed")\n```',
    });

    const result = await selfReviewAndCorrect("claude-sonnet-4-6", draft);

    expect(languageModelFor).toHaveBeenCalledWith("claude-sonnet-4-6");
    expect(result.text).toContain('strategy("fixed")');
    expect(result.text).not.toContain('strategy("broken")');
    expect(result.text.startsWith("Here:")).toBe(true);
  });
});
