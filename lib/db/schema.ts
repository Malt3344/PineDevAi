import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";
import type { Criteria, Hypothesis } from "@/lib/quant/protocol";
import type { StudySummary } from "@/lib/studies";
import type { Trade } from "@/lib/quant/trades";

// ─────────────────────────────────────────────────────────────────────────
// Auth.js tables. Shape follows @auth/drizzle-adapter's documented Postgres
// schema exactly (column names/types), so `DrizzleAdapter(db)` can be
// dropped in without a custom schema mapping. Sessions are never persisted
// here — the app uses the JWT session strategy throughout (required
// alongside the Credentials provider) — but the adapter still needs the
// `session`/`verificationToken` tables to exist to satisfy its type, and
// `account` is what actually gets used, for linking Google sign-ins.
// ─────────────────────────────────────────────────────────────────────────

// The user table doubles as PineDev's own "profile" — the approval gate
// (isApproved) and Stripe billing columns live directly on it rather than
// in a separate table, since every user row now belongs to this app (no
// more syncing against an external `auth.users`).
export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  // Null for Google-only accounts; set for anyone who signed up with a
  // password. Hashed with bcrypt-ts, never the plaintext.
  passwordHash: text("passwordHash"),
  // Access gate. Free signup is instant — everyone starts approved — this
  // exists purely as an admin kill-switch (suspend abuse/fraud by flipping
  // it to false by hand), not a queue new users wait in. Paying for the
  // paid plan does not touch this flag; it's unrelated to subscription
  // status (see lib/billing.ts's syncSubscriptionStatus).
  isApproved: boolean("isApproved").notNull().default(true),
  // Billing — set only by the Stripe webhook, never by the client.
  stripeCustomerId: text("stripeCustomerId").unique(),
  stripeSubscriptionId: text("stripeSubscriptionId").unique(),
  subscriptionStatus: text("subscriptionStatus", {
    enum: ["free", "active", "past_due", "canceled"],
  })
    .notNull()
    .default("free"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerAccountId] }),
  ],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })],
);

// ─────────────────────────────────────────────────────────────────────────
// PineDev's own tables.
// ─────────────────────────────────────────────────────────────────────────

// Public landing-page signups. Separate from real accounts (users) —
// joining the waitlist does not create a login.
export const waitlist = pgTable("waitlist", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export const chats = pgTable(
  "chat",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("New chat"),
    // Which model this chat talks to, e.g. "nemotron-ultra" — a registry
    // id from lib/agent/models.ts, never a raw provider slug.
    modelId: text("modelId").notNull(),
    // "public" powers the read-only /share/[id] page; everything starts
    // private and stays that way unless the owner explicitly flips it.
    visibility: text("visibility", { enum: ["private", "public"] })
      .notNull()
      .default("private"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("chat_user_id_idx").on(table.userId)],
);

// Message content is stored as AI SDK v5 UIMessage "parts" (jsonb) rather
// than flat text, so richer content (multiple text parts, file parts) can
// round-trip through convertToModelMessages without another migration.
export const messages = pgTable(
  "message",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chatId: uuid("chatId")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["user", "assistant"] }).notNull(),
    parts: jsonb("parts").notNull().$type<unknown[]>(),
    attachments: jsonb("attachments").$type<unknown[]>(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("message_chat_id_idx").on(table.chatId),
    // Also serves the daily message cap count (per user, role='user', today).
    index("message_user_id_idx").on(table.userId),
  ],
);

// One vote per (chat, message) — thumbs up/down on an assistant reply.
export const votes = pgTable(
  "vote",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    messageId: uuid("messageId")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    isUpvoted: boolean("isUpvoted").notNull(),
  },
  (table) => [primaryKey({ columns: [table.chatId, table.messageId] })],
);

// A user's saved Pine Script strategies. Composite primary key (id,
// createdAt) gives real version history: the first save picks a new id,
// every later save of the same document reuses that id with a fresh
// createdAt, so old versions are never overwritten — see lib/documents.ts.
export const documents = pgTable(
  "document",
  {
    id: uuid("id").notNull().defaultRandom(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    // Reserved for future artifact types; every document today is Pine code.
    kind: text("kind", { enum: ["pine"] })
      .notNull()
      .default("pine"),
    chatId: uuid("chatId").references(() => chats.id, { onDelete: "set null" }),
  },
  (table) => [
    primaryKey({ columns: [table.id, table.createdAt] }),
    index("document_user_id_idx").on(table.userId),
  ],
);

// One row per model call, written after the call returns. This is what the
// spend cap counts against — message counts alone say nothing about cost
// when models differ by two orders of magnitude in price.
//
// Cost is stored as whole micro-USD (1 USD = 1_000_000) rather than a
// float, so a month of accumulation cannot drift.
export const usageEvents = pgTable(
  "usage_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // The registry id (e.g. "deepseek-v3"), not the provider's slug.
    modelId: text("modelId").notNull(),
    inputTokens: integer("inputTokens").notNull().default(0),
    outputTokens: integer("outputTokens").notNull().default(0),
    costMicroUsd: integer("costMicroUsd").notNull().default(0),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("usage_event_user_id_created_at_idx").on(table.userId, table.createdAt)],
);

// ─────────────────────────────────────────────────────────────────────────
// The validation protocol. A chat is a study: one strategy, one hypothesis,
// taken through the stages in lib/quant/protocol.ts.
// ─────────────────────────────────────────────────────────────────────────

// One row per study, created lazily the first time the study is opened.
// Hypothesis and criteria are jsonb validated by the zod schemas in
// lib/quant/protocol.ts, so adding a field does not need a migration.
export const protocols = pgTable("protocol", {
  chatId: uuid("chatId")
    .primaryKey()
    .references(() => chats.id, { onDelete: "cascade" }),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  hypothesis: jsonb("hypothesis").notNull().$type<Hypothesis>(),
  criteria: jsonb("criteria").notNull().$type<Criteria>(),
  // Set when the hypothesis and criteria are pre-registered. Results can
  // only be uploaded after this, and the criteria cannot change while set.
  lockedAt: timestamp("lockedAt", { mode: "date" }),
  // Times the hypothesis was unlocked again after locking. Never decremented;
  // each one is another trial in the deflated Sharpe.
  amendments: integer("amendments").notNull().default(0),
  // In-sample uploads ever made. Like oosAttempts below, deleting a run does
  // not lower it: a variant that was tried and discarded was still tried.
  inSampleAttempts: integer("inSampleAttempts").notNull().default(0),
  // Times out-of-sample data was uploaded. Deleting the run does not
  // decrement it — once held-out data has been seen, it has been seen.
  oosAttempts: integer("oosAttempts").notNull().default(0),
  // The study's current Pine v6 strategy, as last saved by the user's
  // connected Claude (save_script).
  script: text("script"),
  scriptUpdatedAt: timestamp("scriptUpdatedAt", { mode: "date" }),
  // Denormalised snapshot for the research desk list, refreshed whenever a
  // run or the protocol changes, so listing studies needs no Monte Carlo.
  summary: jsonb("summary").$type<StudySummary>(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

// One uploaded backtest or forward-test trade list.
export const tradeRuns = pgTable(
  "trade_run",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chatId: uuid("chatId")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stage: text("stage", { enum: ["in_sample", "out_of_sample", "incubation"] }).notNull(),
    label: text("label").notNull(),
    fileName: text("fileName"),
    trades: jsonb("trades").notNull().$type<Trade[]>(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("trade_run_chat_id_idx").on(table.chatId)],
);

// ─────────────────────────────────────────────────────────────────────────
// Connecting the user's own Claude (Claude Code, claude.ai, Claude desktop)
// to PineDev over MCP. PineDev is the OAuth 2.1 authorization server for
// its own MCP endpoint: Claude registers itself dynamically, the user
// approves it once on /oauth/authorize, and every MCP call carries a
// bearer token that maps back to exactly one PineDev user. Every secret is
// stored as a SHA-256 hash, never as the value Claude holds.
// ─────────────────────────────────────────────────────────────────────────

// Clients registered through Dynamic Client Registration (RFC 7591). Public
// clients only — Claude Code and claude.ai both use PKCE, not a secret.
export const oauthClients = pgTable("oauth_client", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  redirectUris: jsonb("redirectUris").notNull().$type<string[]>(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

// Authorization codes: single use, ten minutes, bound to the PKCE challenge.
export const oauthCodes = pgTable("oauth_code", {
  codeHash: text("codeHash").primaryKey(),
  clientId: text("clientId")
    .notNull()
    .references(() => oauthClients.id, { onDelete: "cascade" }),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  redirectUri: text("redirectUri").notNull(),
  codeChallenge: text("codeChallenge").notNull(),
  expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
  usedAt: timestamp("usedAt", { mode: "date" }),
});

// Access and refresh tokens. Refresh tokens rotate: using one revokes it
// and issues a new pair. Disconnecting a client revokes all of its rows.
export const oauthTokens = pgTable(
  "oauth_token",
  {
    tokenHash: text("tokenHash").primaryKey(),
    kind: text("kind", { enum: ["access", "refresh"] }).notNull(),
    clientId: text("clientId")
      .notNull()
      .references(() => oauthClients.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
    revokedAt: timestamp("revokedAt", { mode: "date" }),
    lastUsedAt: timestamp("lastUsedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("oauth_token_user_id_idx").on(table.userId)],
);

// One-time upload links, so Claude Code can send a trade-list file with
// curl instead of pasting thousands of CSV rows through the conversation.
export const uploadTokens = pgTable("upload_token", {
  tokenHash: text("tokenHash").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  stage: text("stage", { enum: ["in_sample", "out_of_sample", "incubation"] }).notNull(),
  expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
  usedAt: timestamp("usedAt", { mode: "date" }),
});
