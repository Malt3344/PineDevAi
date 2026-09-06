import {
  boolean,
  index,
  integer,
  pgSchema,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Supabase manages its own `auth.users` table (magic-link accounts, etc.)
// in the `auth` schema. This is a read-only stub so Drizzle can reference
// it as a foreign key — we never create or migrate this table ourselves.
const authSchema = pgSchema("auth");
export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});

// ─────────────────────────────────────────────────────────────────────────
// PineDev's own tables.
// ─────────────────────────────────────────────────────────────────────────

// One row per auth user, created automatically by a Postgres trigger (see
// the migration). This is the approval gate: every new user starts
// unapproved, and approving someone is a manual flip of this flag.
export const profiles = pgTable("profile", {
  id: uuid("id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  isApproved: boolean("isApproved").notNull().default(false),
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

// Public landing-page signups. Separate from real accounts (profiles) —
// joining the waitlist does not create a login.
export const waitlist = pgTable("waitlist", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export const conversations = pgTable(
  "conversation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("userId")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("New chat"),
    // Which model this conversation talks to, e.g. "claude-sonnet-4-6".
    model: text("model").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("conversation_user_id_idx").on(table.userId)],
);

export const messages = pgTable(
  "message",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversationId")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: uuid("userId")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["user", "assistant"] }).notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("message_conversation_id_idx").on(table.conversationId),
    // Also serves the daily message cap count (per user, role='user', today).
    index("message_user_id_idx").on(table.userId),
  ],
);

// A user's saved Pine Script strategies — a small library independent of
// which conversation a script originally came from.
export const strategies = pgTable(
  "strategy",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("userId")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    code: text("code").notNull(),
    sourceConversationId: uuid("sourceConversationId").references(
      () => conversations.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("strategy_user_id_idx").on(table.userId)],
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
    userId: uuid("userId")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    // The registry id (e.g. "deepseek-v3"), not the provider's slug.
    modelId: text("modelId").notNull(),
    inputTokens: integer("inputTokens").notNull().default(0),
    outputTokens: integer("outputTokens").notNull().default(0),
    costMicroUsd: integer("costMicroUsd").notNull().default(0),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("usage_event_user_id_created_at_idx").on(table.userId, table.createdAt)],
);
