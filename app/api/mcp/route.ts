import { CORS_HEADERS, corsJson, corsPreflight } from "@/lib/cors";
import { db } from "@/lib/db/client";
import { handleMessage } from "@/lib/mcp/server";
import { userForAccessToken } from "@/lib/oauth";
import { getSiteUrl } from "@/lib/site-url";

// Uploads can carry a few thousand trades through the Monte Carlo.
export const maxDuration = 60;

/**
 * The MCP endpoint a connected Claude talks to. No session cookie is ever
 * read here: identity is the OAuth bearer token alone. A missing or dead
 * token gets the 401 + WWW-Authenticate challenge that tells Claude where
 * to send the user to log in.
 */
function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "invalid_token" }), {
    status: 401,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
      "WWW-Authenticate": `Bearer realm="pinedev", resource_metadata="${getSiteUrl()}/.well-known/oauth-protected-resource/api/mcp"`,
    },
  });
}

export async function POST(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const token = /^Bearer\s+(.+)$/i.exec(header)?.[1]?.trim();
  if (!token) return unauthorized();
  const user = await userForAccessToken(db, token);
  if (!user) return unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return corsJson({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400 });
  }

  const ctx = { db, userId: user.id, siteUrl: getSiteUrl() };
  const messages = Array.isArray(body) ? body : [body];
  const responses = (await Promise.all(messages.map((m) => handleMessage(m, ctx)))).filter((r) => r !== null);

  // Only notifications/responses in the request: acknowledged, no body.
  if (responses.length === 0) return new Response(null, { status: 202, headers: CORS_HEADERS });
  return corsJson(Array.isArray(body) ? responses : responses[0]);
}

/** No server-initiated stream: this server never sends anything unprompted. */
export function GET() {
  return new Response(null, { status: 405, headers: { ...CORS_HEADERS, Allow: "POST, OPTIONS" } });
}

export function DELETE() {
  return new Response(null, { status: 405, headers: { ...CORS_HEADERS, Allow: "POST, OPTIONS" } });
}

export const OPTIONS = corsPreflight;
