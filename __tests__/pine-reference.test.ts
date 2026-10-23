import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { PINE_V6_API } from "@/lib/pine-reference";

describe("PINE_V6_API", () => {
  it("carries the built-in signatures the models get wrong on their own", () => {
    // Each of these was invented or misused by a free model before the
    // reference was added — see the gotchas in the plugin's Pine skill.
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

describe("the Claude plugin's Pine skill", () => {
  const skill = readFileSync("claude-plugin/plugins/pinedev/skills/pine-v6-strategy/SKILL.md", "utf8");
  const reference = readFileSync("claude-plugin/plugins/pinedev/skills/pine-v6-strategy/reference.md", "utf8");

  it("ships the same reference the MCP server searches (run npm run plugin:build if this fails)", () => {
    expect(reference).toContain(PINE_V6_API.trim());
  });

  it("states the observed gotchas explicitly, not just implicitly via signatures", () => {
    expect(skill).toContain("not na(time(timeframe.period, sess))");
    expect(skill).toContain("There is no `strategy.position_price`");
    expect(skill).toContain("Pine has no methods on numbers or strings");
  });
});
