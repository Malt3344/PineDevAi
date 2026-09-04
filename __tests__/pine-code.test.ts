import { describe, it, expect } from "vitest";
import { extractCodeBlock, extractLatestCodeBlock } from "@/lib/pine-code";

describe("extractCodeBlock", () => {
  it("returns the contents of a fenced code block", () => {
    expect(extractCodeBlock('Here:\n```pine\nstrategy("x")\n```\nDone.')).toBe(
      'strategy("x")\n',
    );
  });

  it("returns null when there is no code block", () => {
    expect(extractCodeBlock("Just a plain conversational answer.")).toBeNull();
  });
});

describe("extractLatestCodeBlock", () => {
  it("returns the code from the most recent message that has any", () => {
    const texts = [
      'First:\n```pine\nstrategy("old")\n```',
      "Just a follow-up question, no code here.",
      'Updated:\n```pine\nstrategy("new")\n```',
    ];

    expect(extractLatestCodeBlock(texts)).toBe('strategy("new")\n');
  });

  it("skips trailing messages with no code and finds an earlier one", () => {
    const texts = ['```pine\nstrategy("only")\n```', "Thanks, that works!"];

    expect(extractLatestCodeBlock(texts)).toBe('strategy("only")\n');
  });

  it("returns null when no message has any code", () => {
    expect(extractLatestCodeBlock(["hello", "how are you"])).toBeNull();
  });
});
