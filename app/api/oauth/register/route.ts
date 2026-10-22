import { z } from "zod";
import { corsJson, corsPreflight } from "@/lib/cors";
import { db } from "@/lib/db/client";
import { isAllowedRedirectUri, registerClient } from "@/lib/oauth";

const bodySchema = z.object({
  client_name: z.string().max(200).optional(),
  redirect_uris: z.array(z.string().max(2000)).min(1).max(10),
  token_endpoint_auth_method: z.string().optional(),
});

/**
 * Dynamic Client Registration (RFC 7591). Claude Code and claude.ai register
 * themselves here the first time a user connects; there is no client to
 * create by hand. Only public PKCE clients are issued.
 */
export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return corsJson({ error: "invalid_client_metadata", error_description: "Body must be JSON." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return corsJson(
      { error: "invalid_client_metadata", error_description: "redirect_uris is required." },
      { status: 400 },
    );
  }
  const { client_name, redirect_uris } = parsed.data;
  if (!redirect_uris.every(isAllowedRedirectUri)) {
    return corsJson(
      { error: "invalid_redirect_uri", error_description: "Redirect URIs must be https, or http on localhost." },
      { status: 400 },
    );
  }

  const client = await registerClient(db, client_name ?? "Claude", redirect_uris);
  return corsJson(
    {
      client_id: client.id,
      client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
      client_name: client.name,
      redirect_uris: client.redirectUris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    },
    { status: 201 },
  );
}

export const OPTIONS = corsPreflight;
