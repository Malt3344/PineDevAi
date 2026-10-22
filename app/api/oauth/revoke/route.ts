import { corsPreflight, CORS_HEADERS } from "@/lib/cors";
import { db } from "@/lib/db/client";
import { revokeToken } from "@/lib/oauth";

/** RFC 7009: always 200, whether or not the token existed. */
export async function POST(req: Request) {
  const params = new URLSearchParams(await req.text());
  const token = params.get("token");
  if (token) await revokeToken(db, token);
  return new Response(null, { status: 200, headers: CORS_HEADERS });
}

export const OPTIONS = corsPreflight;
