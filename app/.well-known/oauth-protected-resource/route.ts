import { corsJson, corsPreflight } from "@/lib/cors";
import { protectedResourceMetadata } from "@/lib/oauth";

/**
 * RFC 9728 metadata for /api/mcp: which authorization server issues tokens
 * for it. Served at the root and at the path-suffixed location the RFC
 * derives from the resource URL; clients try one or the other.
 */
export function GET() {
  return corsJson(protectedResourceMetadata());
}

export const OPTIONS = corsPreflight;
