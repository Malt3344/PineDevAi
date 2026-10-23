import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { db as Db } from "@/lib/db/client";
import { chats, protocols, tradeRuns } from "@/lib/db/schema";
import {
  RUN_STAGES,
  criteriaSchema,
  hypothesisSchema,
  lockBlockers,
  type Criteria,
  type Hypothesis,
  type RunStage,
} from "@/lib/quant/protocol";
import { MAX_TRADES_PER_RUN, type Trade } from "@/lib/quant/trades";
import { getOrCreateProtocol, refreshSummary } from "@/lib/studies";

/**
 * Every write a study can receive, in one place. The web app's server
 * actions and the MCP tools a connected Claude calls both go through these,
 * so the protocol's rules — lock before results, in-sample before
 * anything else, counters that only go up — cannot differ between the two
 * front doors. Callers authenticate; these check ownership.
 */

type Database = typeof Db;

export type OpResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export async function ownsStudy(db: Database, userId: string, chatId: string): Promise<boolean> {
  if (!z.string().uuid().safeParse(chatId).success) return false;
  const [chat] = await db
    .select({ id: chats.id })
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)));
  return Boolean(chat);
}

export async function createStudy(db: Database, userId: string, title?: string) {
  const [row] = await db
    .insert(chats)
    .values({
      userId,
      title: title?.trim().slice(0, 200) || "New study",
      // The column predates the connected-Claude flow; it no longer selects anything.
      modelId: "claude",
    })
    .returning({ id: chats.id, title: chats.title });
  await getOrCreateProtocol(db, row.id, userId);
  return row;
}

export async function listStudies(db: Database, userId: string) {
  return db
    .select({ id: chats.id, title: chats.title, createdAt: chats.createdAt, summary: protocols.summary })
    .from(chats)
    .leftJoin(protocols, eq(protocols.chatId, chats.id))
    .where(eq(chats.userId, userId))
    .orderBy(desc(chats.createdAt));
}

export async function saveHypothesisDraft(
  db: Database,
  userId: string,
  chatId: string,
  hypothesis: Hypothesis,
  criteria: Criteria,
): Promise<OpResult> {
  if (!(await ownsStudy(db, userId, chatId))) return { ok: false, error: "Study not found." };

  const h = hypothesisSchema.safeParse(hypothesis);
  const c = criteriaSchema.safeParse(criteria);
  if (!h.success) return { ok: false, error: h.error.issues[0]?.message ?? "Invalid hypothesis." };
  if (!c.success) return { ok: false, error: c.error.issues[0]?.message ?? "Invalid criteria." };

  const protocol = await getOrCreateProtocol(db, chatId, userId);
  if (protocol.lockedAt) {
    return { ok: false, error: "The hypothesis is locked. Amend it to make changes." };
  }

  await db
    .update(protocols)
    .set({ hypothesis: h.data, criteria: c.data, updatedAt: new Date() })
    .where(eq(protocols.chatId, chatId));
  await refreshSummary(db, chatId, userId);
  return { ok: true };
}

/** Pre-registers whatever hypothesis and criteria are currently saved. */
export async function lockStudy(db: Database, userId: string, chatId: string): Promise<OpResult> {
  if (!(await ownsStudy(db, userId, chatId))) return { ok: false, error: "Study not found." };
  const protocol = await getOrCreateProtocol(db, chatId, userId);
  if (protocol.lockedAt) return { ok: true };

  const blockers = lockBlockers(protocol.hypothesis);
  if (blockers.length > 0) return { ok: false, error: blockers.join(" ") };

  await db.update(protocols).set({ lockedAt: new Date() }).where(eq(protocols.chatId, chatId));
  // A study nobody has named yet takes the name of what it is testing.
  await db
    .update(chats)
    .set({ title: `${protocol.hypothesis.market} · ${protocol.hypothesis.timeframe}`.slice(0, 50) })
    .where(and(eq(chats.id, chatId), eq(chats.title, "New study")));
  await refreshSummary(db, chatId, userId);
  return { ok: true };
}

/**
 * Unlocks a pre-registered hypothesis. Allowed — research is iterative —
 * but never free: the amendment counter only goes up, and each one is a
 * trial the deflated Sharpe charges for.
 */
export async function amendStudy(db: Database, userId: string, chatId: string): Promise<OpResult> {
  if (!(await ownsStudy(db, userId, chatId))) return { ok: false, error: "Study not found." };
  await db
    .update(protocols)
    .set({ lockedAt: null, amendments: sql`${protocols.amendments} + 1` })
    .where(and(eq(protocols.chatId, chatId), sql`${protocols.lockedAt} is not null`));
  await refreshSummary(db, chatId, userId);
  return { ok: true };
}

const tradeSchema = z.object({
  e: z.string().max(40).nullable(),
  t: z.string().max(40),
  d: z.enum(["long", "short"]),
  p: z.number().finite(),
  v: z.number().finite().nullable(),
});

const runSchema = z.object({
  stage: z.enum(RUN_STAGES),
  fileName: z.string().max(200).nullable(),
  trades: z.array(tradeSchema).min(1).max(MAX_TRADES_PER_RUN),
});

/**
 * Stores one trade list. The trades are re-validated here whoever parsed
 * them — the browser, the MCP tool or the upload link.
 */
export async function recordRun(
  db: Database,
  userId: string,
  chatId: string,
  input: { stage: RunStage; fileName: string | null; trades: unknown[] },
): Promise<OpResult<{ label: string }>> {
  if (!(await ownsStudy(db, userId, chatId))) return { ok: false, error: "Study not found." };

  const parsed = runSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That trade list could not be read." };
  const { stage, fileName } = parsed.data;
  const trades: Trade[] = parsed.data.trades;

  const protocol = await getOrCreateProtocol(db, chatId, userId);
  if (!protocol.lockedAt) {
    return { ok: false, error: "Lock the hypothesis before uploading results." };
  }

  const existing = await db
    .select({ stage: tradeRuns.stage })
    .from(tradeRuns)
    .where(eq(tradeRuns.chatId, chatId));
  const count = (s: RunStage) => existing.filter((r) => r.stage === s).length;

  if (stage !== "in_sample" && count("in_sample") === 0) {
    return { ok: false, error: "Upload an in-sample run first." };
  }

  const labels: Record<RunStage, string> = {
    in_sample: `In-sample run ${count("in_sample") + 1}`,
    out_of_sample:
      count("out_of_sample") === 0 ? "Out-of-sample" : `Out-of-sample (look ${count("out_of_sample") + 1})`,
    incubation: `Forward batch ${count("incubation") + 1}`,
  };

  await db.insert(tradeRuns).values({
    chatId,
    userId,
    stage,
    label: labels[stage],
    fileName,
    trades: [...trades].sort((a, b) => a.t.localeCompare(b.t)),
  });

  if (stage === "out_of_sample") {
    await db
      .update(protocols)
      .set({ oosAttempts: sql`${protocols.oosAttempts} + 1` })
      .where(eq(protocols.chatId, chatId));
  } else if (stage === "in_sample") {
    await db
      .update(protocols)
      .set({ inSampleAttempts: sql`${protocols.inSampleAttempts} + 1` })
      .where(eq(protocols.chatId, chatId));
  }

  await refreshSummary(db, chatId, userId);
  return { ok: true, label: labels[stage] };
}

export async function removeRun(db: Database, userId: string, chatId: string, runId: string): Promise<OpResult> {
  if (!(await ownsStudy(db, userId, chatId))) return { ok: false, error: "Study not found." };
  if (!z.string().uuid().safeParse(runId).success) return { ok: false, error: "Run not found." };
  await db
    .delete(tradeRuns)
    .where(and(eq(tradeRuns.id, runId), eq(tradeRuns.chatId, chatId), eq(tradeRuns.userId, userId)));
  await refreshSummary(db, chatId, userId);
  return { ok: true };
}

export const MAX_SCRIPT_LENGTH = 100_000;

/** Stores the study's current Pine script, as written in the user's own Claude. */
export async function attachScript(db: Database, userId: string, chatId: string, code: string): Promise<OpResult> {
  if (!(await ownsStudy(db, userId, chatId))) return { ok: false, error: "Study not found." };
  const trimmed = code.trim();
  if (!trimmed) return { ok: false, error: "The script is empty." };
  if (trimmed.length > MAX_SCRIPT_LENGTH) return { ok: false, error: "That script is too long." };

  await getOrCreateProtocol(db, chatId, userId);
  await db
    .update(protocols)
    .set({ script: trimmed, scriptUpdatedAt: new Date(), updatedAt: new Date() })
    .where(eq(protocols.chatId, chatId));
  await refreshSummary(db, chatId, userId);
  return { ok: true };
}
