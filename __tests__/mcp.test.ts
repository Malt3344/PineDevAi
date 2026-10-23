import { describe, it, expect, vi } from "vitest";

// The tools that touch the database are exercised end to end against
// Postgres; these tests cover the protocol layer and the pure tools.
vi.mock("@/lib/db/client", () => ({ db: {} }));

import { handleMessage, SUPPORTED_PROTOCOL_VERSIONS } from "@/lib/mcp/server";
import { isAllowedRedirectUri } from "@/lib/oauth";
import { safeNextPath } from "@/lib/safe-redirect";
import { lintPineScript } from "@/lib/quant/pine-lint";
import { readFileSync } from "node:fs";

const ctx = { db: {} as never, userId: "u1", siteUrl: "https://pinedev.test" };
const rpc = (method: string, params?: Record<string, unknown>, id: number | undefined = 1) =>
  handleMessage({ jsonrpc: "2.0", id, method, params }, ctx);

describe("MCP server", () => {
  it("negotiates the protocol version and explains the protocol to the model", async () => {
    const res = (await rpc("initialize", { protocolVersion: "2025-06-18" })) as { result: Record<string, unknown> };
    expect(res.result.protocolVersion).toBe("2025-06-18");
    expect(res.result.instructions).toMatch(/one shot/i);

    const unknown = (await rpc("initialize", { protocolVersion: "1999-01-01" })) as { result: { protocolVersion: string } };
    expect(unknown.result.protocolVersion).toBe(SUPPORTED_PROTOCOL_VERSIONS[0]);
  });

  it("does not answer notifications", async () => {
    expect(await handleMessage({ jsonrpc: "2.0", method: "notifications/initialized" }, ctx)).toBeNull();
  });

  it("lists every tool with a schema and marks the read-only ones", async () => {
    const res = (await rpc("tools/list")) as { result: { tools: { name: string; inputSchema: object; annotations: { readOnlyHint?: boolean } }[] } };
    const names = res.result.tools.map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining(["create_study", "set_hypothesis", "lock_hypothesis", "save_script", "upload_trades", "get_upload_url", "get_study", "pine_reference", "lint_script"]),
    );
    expect(res.result.tools.find((t) => t.name === "get_study")?.annotations.readOnlyHint).toBe(true);
    expect(res.result.tools.find((t) => t.name === "upload_trades")?.annotations.readOnlyHint).toBeUndefined();
  });

  it("searches the Pine reference and says plainly when something does not exist", async () => {
    const hit = (await rpc("tools/call", { name: "pine_reference", arguments: { query: "input.time" } })) as { result: { content: { text: string }[] } };
    expect(hit.result.content[0].text).toMatch(/input\.time\(defval/);
    const miss = (await rpc("tools/call", { name: "pine_reference", arguments: { query: "strategy.position_price" } })) as { result: { content: { text: string }[] } };
    expect(miss.result.content[0].text).toMatch(/does not exist/);
  });

  it("returns tool errors the model can read, and protocol errors for unknown methods", async () => {
    const bad = (await rpc("tools/call", { name: "lint_script", arguments: {} })) as { result: { isError: boolean } };
    expect(bad.result.isError).toBe(true);
    expect(await rpc("tools/call", { name: "nope" })).toMatchObject({ error: { code: -32602 } });
    expect(await rpc("does/not/exist")).toMatchObject({ error: { code: -32601 } });
    expect(await handleMessage({ foo: 1 }, ctx)).toMatchObject({ error: { code: -32600 } });
  });
});

describe("OAuth and redirects", () => {
  it("only lets real OAuth clients receive codes", () => {
    expect(isAllowedRedirectUri("https://claude.ai/api/mcp/auth_callback")).toBe(true);
    expect(isAllowedRedirectUri("http://localhost:53122/callback")).toBe(true);
    expect(isAllowedRedirectUri("http://127.0.0.1:8080/callback")).toBe(true);
    expect(isAllowedRedirectUri("http://evil.example/callback")).toBe(false);
    expect(isAllowedRedirectUri("javascript:alert(1)")).toBe(false);
    expect(isAllowedRedirectUri("https://x.test/cb#frag")).toBe(false);
  });

  it("never redirects off-site after login", () => {
    expect(safeNextPath("/oauth/authorize?client_id=x")).toBe("/oauth/authorize?client_id=x");
    expect(safeNextPath("//evil.example")).toBe("/studies");
    expect(safeNextPath("/\\evil.example")).toBe("/studies");
    expect(safeNextPath("https://evil.example")).toBe("/studies");
    expect(safeNextPath(null)).toBe("/studies");
  });
});

describe("Claude plugin", () => {
  it("ships a strategy template that passes PineDev's own backtest hygiene checks", () => {
    const template = readFileSync("claude-plugin/plugins/pinedev/skills/pine-v6-strategy/template.pine", "utf8");
    expect(lintPineScript(template).filter((r) => r.status !== "pass")).toEqual([]);
  });
});
