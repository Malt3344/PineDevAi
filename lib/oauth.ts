import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import type { db as Db } from "@/lib/db/client";
import { oauthClients, oauthCodes, oauthTokens, uploadTokens, users } from "@/lib/db/schema";
import type { RunStage } from "@/lib/quant/protocol";
import { getSiteUrl } from "@/lib/site-url";

/**
 * PineDev as an OAuth 2.1 authorization server for its own MCP endpoint —
 * what lets a user connect their own Claude (Claude Code, claude.ai, the
 * desktop app) by logging in once, instead of copying a key around.
 *
 * Deliberately narrow: public clients with PKCE (S256) only, one scope,
 * opaque random tokens stored as SHA-256 hashes. Nothing here can be used
 * to sign in to the website itself; a token only opens /api/mcp.
 */

type Database = typeof Db;

export const SCOPE = "studies";
const CODE_TTL_MS = 10 * 60 * 1000;
const ACCESS_TTL_S = 60 * 60;
const REFRESH_TTL_MS = 60 * 24 * 60 * 60 * 1000;
const UPLOAD_TTL_MS = 30 * 60 * 1000;

export function hashSecret(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function mint(prefix: string): string {
  return `${prefix}_${randomBytes(32).toString("base64url")}`;
}

export function mcpResourceUrl(): string {
  return `${getSiteUrl()}/api/mcp`;
}

export function authorizationServerMetadata() {
  const site = getSiteUrl();
  return {
    issuer: site,
    authorization_endpoint: `${site}/oauth/authorize`,
    token_endpoint: `${site}/api/oauth/token`,
    registration_endpoint: `${site}/api/oauth/register`,
    revocation_endpoint: `${site}/api/oauth/revoke`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: [SCOPE],
  };
}

export function protectedResourceMetadata() {
  return {
    resource: mcpResourceUrl(),
    authorization_servers: [getSiteUrl()],
    scopes_supported: [SCOPE],
    bearer_methods_supported: ["header"],
    resource_name: "PineDev",
  };
}

/**
 * Only redirect targets a real OAuth client uses: https anywhere (claude.ai's
 * callback), or plain http on the loopback interface (Claude Code's
 * temporary local listener). Anything else is a phishing vector.
 */
export function isAllowedRedirectUri(uri: string): boolean {
  try {
    const url = new URL(uri);
    if (url.hash) return false;
    if (url.protocol === "https:") return true;
    return url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  } catch {
    return false;
  }
}

export async function registerClient(db: Database, name: string, redirectUris: string[]) {
  const id = mint("pdc");
  const [row] = await db
    .insert(oauthClients)
    .values({ id, name: name.trim().slice(0, 100) || "Claude", redirectUris })
    .returning();
  return row;
}

export async function getClient(db: Database, clientId: string) {
  const [row] = await db.select().from(oauthClients).where(eq(oauthClients.id, clientId));
  return row ?? null;
}

export async function issueCode(
  db: Database,
  input: { clientId: string; userId: string; redirectUri: string; codeChallenge: string },
): Promise<string> {
  const code = mint("pda");
  await db.insert(oauthCodes).values({
    codeHash: hashSecret(code),
    ...input,
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
  });
  return code;
}

export type TokenResponse = {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  scope: string;
};

async function issuePair(db: Database, clientId: string, userId: string): Promise<TokenResponse> {
  const access = mint("pdt");
  const refresh = mint("pdr");
  await db.insert(oauthTokens).values([
    {
      tokenHash: hashSecret(access),
      kind: "access",
      clientId,
      userId,
      expiresAt: new Date(Date.now() + ACCESS_TTL_S * 1000),
    },
    {
      tokenHash: hashSecret(refresh),
      kind: "refresh",
      clientId,
      userId,
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    },
  ]);
  return { access_token: access, token_type: "Bearer", expires_in: ACCESS_TTL_S, refresh_token: refresh, scope: SCOPE };
}

export type TokenError = { error: "invalid_grant" | "invalid_request" | "invalid_client"; error_description: string };

function pkceMatches(verifier: string, challenge: string): boolean {
  return createHash("sha256").update(verifier).digest("base64url") === challenge;
}

export async function exchangeCode(
  db: Database,
  input: { code: string; clientId: string; redirectUri: string; codeVerifier: string },
): Promise<TokenResponse | TokenError> {
  // Claimed in one atomic update, so a code replayed in parallel still
  // works at most once — and is spent even if a later check fails.
  const [row] = await db
    .update(oauthCodes)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(oauthCodes.codeHash, hashSecret(input.code)),
        isNull(oauthCodes.usedAt),
        gt(oauthCodes.expiresAt, new Date()),
      ),
    )
    .returning();
  if (!row) {
    return { error: "invalid_grant", error_description: "The authorization code is invalid or expired." };
  }

  if (row.clientId !== input.clientId || row.redirectUri !== input.redirectUri) {
    return { error: "invalid_grant", error_description: "The code was issued to a different client." };
  }
  if (!pkceMatches(input.codeVerifier, row.codeChallenge)) {
    return { error: "invalid_grant", error_description: "PKCE verification failed." };
  }
  return issuePair(db, row.clientId, row.userId);
}

/** Refresh tokens rotate: each one works once and is replaced by a new pair. */
export async function refreshTokens(
  db: Database,
  input: { refreshToken: string; clientId: string },
): Promise<TokenResponse | TokenError> {
  const [row] = await db
    .update(oauthTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(oauthTokens.tokenHash, hashSecret(input.refreshToken)),
        eq(oauthTokens.kind, "refresh"),
        isNull(oauthTokens.revokedAt),
        gt(oauthTokens.expiresAt, new Date()),
      ),
    )
    .returning();
  if (!row || row.clientId !== input.clientId) {
    return { error: "invalid_grant", error_description: "The refresh token is invalid or expired." };
  }
  return issuePair(db, row.clientId, row.userId);
}

export async function revokeToken(db: Database, token: string) {
  await db
    .update(oauthTokens)
    .set({ revokedAt: new Date() })
    .where(eq(oauthTokens.tokenHash, hashSecret(token)));
}

/**
 * The user behind a bearer token, or null. Suspended accounts lose access
 * here exactly as they do on the website (lib/gate.ts).
 */
export async function userForAccessToken(
  db: Database,
  token: string,
): Promise<{ id: string; email: string } | null> {
  const hash = hashSecret(token);
  const [row] = await db
    .select({ userId: oauthTokens.userId, email: users.email, isApproved: users.isApproved })
    .from(oauthTokens)
    .innerJoin(users, eq(users.id, oauthTokens.userId))
    .where(
      and(
        eq(oauthTokens.tokenHash, hash),
        eq(oauthTokens.kind, "access"),
        isNull(oauthTokens.revokedAt),
        gt(oauthTokens.expiresAt, new Date()),
      ),
    );
  if (!row || !row.isApproved) return null;
  await db.update(oauthTokens).set({ lastUsedAt: new Date() }).where(eq(oauthTokens.tokenHash, hash));
  return { id: row.userId, email: row.email };
}

/** Each connected Claude, for the Connect page: one row per client with live tokens. */
export async function listConnections(db: Database, userId: string) {
  const rows = await db
    .select({
      clientId: oauthTokens.clientId,
      name: oauthClients.name,
      createdAt: oauthTokens.createdAt,
      lastUsedAt: oauthTokens.lastUsedAt,
    })
    .from(oauthTokens)
    .innerJoin(oauthClients, eq(oauthClients.id, oauthTokens.clientId))
    .where(
      and(eq(oauthTokens.userId, userId), isNull(oauthTokens.revokedAt), gt(oauthTokens.expiresAt, new Date())),
    )
    .orderBy(desc(oauthTokens.createdAt));

  const byClient = new Map<string, { clientId: string; name: string; connectedAt: Date; lastUsedAt: Date | null }>();
  for (const row of rows) {
    const existing = byClient.get(row.clientId);
    if (!existing) {
      byClient.set(row.clientId, {
        clientId: row.clientId,
        name: row.name,
        connectedAt: row.createdAt,
        lastUsedAt: row.lastUsedAt,
      });
    } else {
      if (row.createdAt < existing.connectedAt) existing.connectedAt = row.createdAt;
      if (row.lastUsedAt && (!existing.lastUsedAt || row.lastUsedAt > existing.lastUsedAt)) {
        existing.lastUsedAt = row.lastUsedAt;
      }
    }
  }
  return [...byClient.values()];
}

export async function disconnectClient(db: Database, userId: string, clientId: string) {
  await db
    .update(oauthTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(oauthTokens.userId, userId), eq(oauthTokens.clientId, clientId), isNull(oauthTokens.revokedAt)));
}

export async function createUploadToken(
  db: Database,
  input: { userId: string; chatId: string; stage: RunStage },
): Promise<{ url: string; expiresAt: Date }> {
  const token = mint("pdu");
  const expiresAt = new Date(Date.now() + UPLOAD_TTL_MS);
  await db.insert(uploadTokens).values({ tokenHash: hashSecret(token), ...input, expiresAt });
  return { url: `${getSiteUrl()}/api/upload/${token}`, expiresAt };
}

/** Claims a one-time upload link. A link works once, for one study and one stage. */
export async function claimUploadToken(db: Database, token: string) {
  const [row] = await db
    .update(uploadTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(uploadTokens.tokenHash, hashSecret(token)),
        isNull(uploadTokens.usedAt),
        gt(uploadTokens.expiresAt, new Date()),
      ),
    )
    .returning();
  return row ?? null;
}
