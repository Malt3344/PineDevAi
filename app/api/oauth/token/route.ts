import { corsJson, corsPreflight } from "@/lib/cors";
import { db } from "@/lib/db/client";
import { exchangeCode, refreshTokens } from "@/lib/oauth";

/** OAuth bodies are form-encoded by the spec; JSON is accepted too, for lenient clients. */
async function readParams(req: Request): Promise<URLSearchParams> {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    return new URLSearchParams(
      Object.entries(body).filter((e): e is [string, string] => typeof e[1] === "string"),
    );
  }
  return new URLSearchParams(await req.text());
}

export async function POST(req: Request) {
  const params = await readParams(req);
  const grant = params.get("grant_type");
  const clientId = params.get("client_id") ?? "";

  if (grant === "authorization_code") {
    const code = params.get("code");
    const redirectUri = params.get("redirect_uri");
    const codeVerifier = params.get("code_verifier");
    if (!code || !redirectUri || !codeVerifier || !clientId) {
      return corsJson({ error: "invalid_request", error_description: "Missing parameters." }, { status: 400 });
    }
    const result = await exchangeCode(db, { code, clientId, redirectUri, codeVerifier });
    return corsJson(result, { status: "error" in result ? 400 : 200 });
  }

  if (grant === "refresh_token") {
    const refreshToken = params.get("refresh_token");
    if (!refreshToken || !clientId) {
      return corsJson({ error: "invalid_request", error_description: "Missing parameters." }, { status: 400 });
    }
    const result = await refreshTokens(db, { refreshToken, clientId });
    return corsJson(result, { status: "error" in result ? 400 : 200 });
  }

  return corsJson({ error: "unsupported_grant_type" }, { status: 400 });
}

export const OPTIONS = corsPreflight;
