import { TOOLS, type ToolContext } from "./tools";

/**
 * A minimal, stateless MCP server over Streamable HTTP: every POST carries
 * one JSON-RPC message (or a batch, for older clients) and gets a plain
 * JSON answer. PineDev's tools are request/response, so there is nothing
 * to stream and no session to keep — which is also what lets this run on
 * serverless functions.
 */

export const SUPPORTED_PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];

export const SERVER_INSTRUCTIONS = `PineDev validates TradingView Pine Script v6 strategies the way a systematic fund would, and keeps every study in the user's PineDev account (they can open it in the browser at any time).

The protocol, in order — do not skip ahead:
1. Hypothesis — interview the user: market, timeframe, why the edge should exist (who is on the other side), mechanical entry and exit rules, an in-sample and a later non-overlapping out-of-sample date window (~70/30), realistic round-trip costs in bps, and how many variants they already tried. Save with set_hypothesis, show it back, and lock_hypothesis only when they agree.
2. Build — write the Pine v6 strategy from the locked rules only. It must declare strategy() with commission_type/commission_value, slippage and default_qty_type; have "Window start"/"Window end" input.time() inputs gating every entry and closing positions after the window; never use barmerge.lookahead_on or calc_on_every_tick. Verify unfamiliar built-ins with pine_reference, run lint_script, fix everything, then save_script.
3. In-sample — the user runs it in TradingView on the in-sample window and exports Strategy Tester → List of trades. Upload with upload_trades (or get_upload_url for files on disk). Every upload counts as a trial.
4. Stress test — computed automatically; explain deflated Sharpe, Monte Carlo drawdown, cost stress, outlier removal and consistency with the user's own numbers.
5. Out-of-sample — one shot. Only the window dates change. Get explicit confirmation before uploading; never upload it twice; never tune anything on it.
6. Verdict — report it honestly. A rejected strategy is a successful study: it saved the user money.
7. Incubation — forward (paper or small-size) trades uploaded as they accumulate.

Always call get_study before advising on an existing study. "Optimal" means robust, not best-backtest: prefer few parameters and a clear economic reason over curve-fitting.`;

type JsonRpcId = string | number | null;
type JsonRpcRequest = { jsonrpc: "2.0"; id?: JsonRpcId; method: string; params?: Record<string, unknown> };
type JsonRpcResponse =
  | { jsonrpc: "2.0"; id: JsonRpcId; result: unknown }
  | { jsonrpc: "2.0"; id: JsonRpcId; error: { code: number; message: string } };

const error = (id: JsonRpcId, code: number, message: string): JsonRpcResponse => ({
  jsonrpc: "2.0",
  id,
  error: { code, message },
});

function isRequest(value: unknown): value is JsonRpcRequest {
  return (
    !!value &&
    typeof value === "object" &&
    (value as { jsonrpc?: unknown }).jsonrpc === "2.0" &&
    typeof (value as { method?: unknown }).method === "string"
  );
}

/** Handles one JSON-RPC message. Returns null for notifications, which get no answer. */
export async function handleMessage(message: unknown, ctx: ToolContext): Promise<JsonRpcResponse | null> {
  if (!isRequest(message)) return error(null, -32600, "Invalid Request");
  const { id, method, params } = message;
  // Notifications (no id) are acknowledged by the transport, never answered.
  if (id === undefined) return null;

  switch (method) {
    case "initialize": {
      const requested = typeof params?.protocolVersion === "string" ? params.protocolVersion : "";
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: SUPPORTED_PROTOCOL_VERSIONS.includes(requested) ? requested : SUPPORTED_PROTOCOL_VERSIONS[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "pinedev", title: "PineDev", version: "1.0.0" },
          instructions: SERVER_INSTRUCTIONS,
        },
      };
    }
    case "ping":
      return { jsonrpc: "2.0", id, result: {} };
    case "tools/list":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          tools: TOOLS.map(({ name, title, description, inputSchema, annotations }) => ({
            name,
            title,
            description,
            inputSchema,
            annotations: { title, ...annotations },
          })),
        },
      };
    case "tools/call": {
      const name = params?.name;
      const tool = TOOLS.find((t) => t.name === name);
      if (!tool) return error(id, -32602, `Unknown tool: ${String(name)}`);
      try {
        return { jsonrpc: "2.0", id, result: await tool.run(params?.arguments ?? {}, ctx) };
      } catch (e) {
        console.error(`MCP tool ${tool.name} failed`, e);
        return {
          jsonrpc: "2.0",
          id,
          result: { content: [{ type: "text", text: "PineDev hit an internal error running that tool. Try again." }], isError: true },
        };
      }
    }
    // Capabilities we do not offer still answer, so clients that probe for
    // them get an empty list rather than an error.
    case "resources/list":
      return { jsonrpc: "2.0", id, result: { resources: [] } };
    case "prompts/list":
      return { jsonrpc: "2.0", id, result: { prompts: [] } };
    default:
      return error(id, -32601, `Method not found: ${method}`);
  }
}
