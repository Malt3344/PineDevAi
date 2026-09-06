import { describe, it, expect } from "vitest";
import { PINE_V6_API } from "@/lib/agent/pine-reference";
import { SYSTEM_PROMPT } from "@/lib/agent/system-prompt";

describe("PINE_V6_API", () => {
  it("carries the built-in signatures the models get wrong on their own", () => {
    // Each of these was invented or misused by a free model before the
    // reference was added — see the gotchas block in the system prompt.
    expect(PINE_V6_API).toContain("str.tonumber(string)");
    expect(PINE_V6_API).toContain("str.split(string, separator)");
    expect(PINE_V6_API).toContain("strategy.position_avg_price");
    expect(PINE_V6_API).toContain("session.isfirstbar_regular");
    expect(PINE_V6_API).toContain("plot.style_linebr");
  });

  it("records that time() returns an int, which is what the na() gotcha rests on", () => {
    expect(PINE_V6_API).toMatch(/time\(timeframe, session[^)]*\) → series int/);
  });

  it("does not name built-ins that do not exist in v6", () => {
    expect(PINE_V6_API).not.toContain("strategy.position_price ");
  });

  it("stays small enough to sit in every request", () => {
    // ~4 chars per token; the budget note in pine-reference.ts assumes this.
    expect(PINE_V6_API.length / 4).toBeLessThan(20_000);
  });
});

describe("SYSTEM_PROMPT", () => {
  it("embeds the reference, so the model is grounded rather than recalling", () => {
    expect(SYSTEM_PROMPT).toContain(PINE_V6_API);
  });

  it("keeps the instructions ahead of the reference dump", () => {
    expect(SYSTEM_PROMPT.indexOf("//@version=6")).toBeLessThan(
      SYSTEM_PROMPT.indexOf(PINE_V6_API),
    );
  });

  it("states the observed gotchas explicitly, not just implicitly via signatures", () => {
    expect(SYSTEM_PROMPT).toContain("not na(time(timeframe.period, sess))");
    expect(SYSTEM_PROMPT).toContain("There is no strategy.position_price");
    expect(SYSTEM_PROMPT).toContain("Pine has no methods on values");
  });
});
