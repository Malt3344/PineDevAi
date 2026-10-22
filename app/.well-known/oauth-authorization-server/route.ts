import { corsJson, corsPreflight } from "@/lib/cors";
import { authorizationServerMetadata } from "@/lib/oauth";

/** RFC 8414 metadata: how Claude finds the authorize, token and registration endpoints. */
export function GET() {
  return corsJson(authorizationServerMetadata());
}

export const OPTIONS = corsPreflight;
