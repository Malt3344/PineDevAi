/**
 * The OAuth and MCP endpoints are called by Claude's own clients — some
 * from a browser origin we do not control. They authenticate with bearer
 * tokens and PKCE, never cookies, so allowing any origin exposes nothing.
 * No other route in the app uses this.
 */
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Mcp-Protocol-Version, Mcp-Session-Id",
  "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id",
} as const;

export function corsJson(body: unknown, init: ResponseInit = {}): Response {
  return Response.json(body, {
    ...init,
    headers: { ...CORS_HEADERS, "Cache-Control": "no-store", ...(init.headers ?? {}) },
  });
}

export function corsPreflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
