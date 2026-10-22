import { and, asc, eq } from "drizzle-orm";
import type { db as Db } from "@/lib/db/client";
import { messages, protocols, tradeRuns } from "@/lib/db/schema";
import { analyzeStudy, type Grade, type ProtocolInput, type RunInput, type StudyAnalysis } from "@/lib/quant/analysis";
import {
  DEFAULT_CRITERIA,
  DEFAULT_HYPOTHESIS,
  criteriaSchema,
  hypothesisSchema,
  type StageId,
} from "@/lib/quant/protocol";
import { extractLatestCodeBlock } from "@/lib/pine-code";

/** What the research desk shows per study without re-running any analysis. */
export type StudySummary = {
  stage: StageId;
  grade: Grade;
  inSampleTrades: number | null;
  inSampleProfitFactor: number | null;
  dsr: number | null;
  oosEfficiency: number | null;
  incubationStatus: "on_track" | "below_band" | "broken" | null;
};

export type ProtocolRecord = ProtocolInput & { chatId: string };

type Database = typeof Db;

/**
 * Stored jsonb is re-validated on the way out, not trusted: a row written
 * before a field existed gets that field's default instead of `undefined`
 * flowing into the statistics.
 */
function toInput(row: typeof protocols.$inferSelect): ProtocolRecord {
  return {
    chatId: row.chatId,
    hypothesis: hypothesisSchema.catch(DEFAULT_HYPOTHESIS).parse({ ...DEFAULT_HYPOTHESIS, ...row.hypothesis }),
    criteria: criteriaSchema.catch(DEFAULT_CRITERIA).parse({ ...DEFAULT_CRITERIA, ...row.criteria }),
    lockedAt: row.lockedAt?.toISOString() ?? null,
    amendments: row.amendments,
    inSampleAttempts: row.inSampleAttempts,
    oosAttempts: row.oosAttempts,
  };
}

/**
 * Returns the study's protocol, creating it with defaults on first use.
 * Callers must already have checked that `chatId` belongs to `userId`.
 */
export async function getOrCreateProtocol(
  db: Database,
  chatId: string,
  userId: string,
): Promise<ProtocolRecord> {
  const [existing] = await db.select().from(protocols).where(eq(protocols.chatId, chatId));
  if (existing) return toInput(existing);

  const [created] = await db
    .insert(protocols)
    .values({ chatId, userId, hypothesis: DEFAULT_HYPOTHESIS, criteria: DEFAULT_CRITERIA })
    .onConflictDoNothing()
    .returning();
  if (created) return toInput(created);

  // Two first loads raced; the other one inserted.
  const [row] = await db.select().from(protocols).where(eq(protocols.chatId, chatId));
  return toInput(row);
}

export async function listRuns(db: Database, chatId: string): Promise<RunInput[]> {
  const rows = await db
    .select()
    .from(tradeRuns)
    .where(eq(tradeRuns.chatId, chatId))
    .orderBy(asc(tradeRuns.createdAt));
  return rows.map((r) => ({
    id: r.id,
    stage: r.stage,
    label: r.label,
    fileName: r.fileName,
    createdAt: r.createdAt.toISOString(),
    trades: r.trades,
  }));
}

/** Whether the agent has written this study a strategy script yet. */
export async function studyHasScript(db: Database, chatId: string): Promise<boolean> {
  const rows = await db
    .select({ parts: messages.parts })
    .from(messages)
    .where(and(eq(messages.chatId, chatId), eq(messages.role, "assistant")));
  const texts = rows.map((r) =>
    (r.parts as { type?: string; text?: string }[])
      .filter((p) => p?.type === "text" && typeof p.text === "string")
      .map((p) => p.text)
      .join("\n"),
  );
  return extractLatestCodeBlock(texts) !== null;
}

export type LoadedStudy = { protocol: ProtocolRecord; runs: RunInput[]; analysis: StudyAnalysis };

export async function loadStudy(db: Database, chatId: string, userId: string): Promise<LoadedStudy> {
  const [protocol, runs, hasScript] = await Promise.all([
    getOrCreateProtocol(db, chatId, userId),
    listRuns(db, chatId),
    studyHasScript(db, chatId),
  ]);
  return { protocol, runs, analysis: analyzeStudy(protocol, runs, hasScript) };
}

export function summarize(analysis: StudyAnalysis): StudySummary {
  return {
    stage: analysis.current,
    grade: analysis.verdict.grade,
    inSampleTrades: analysis.inSample?.metrics.trades ?? null,
    inSampleProfitFactor: analysis.inSample?.metrics.profitFactor ?? null,
    dsr: analysis.robustness?.dsr ?? null,
    oosEfficiency: analysis.oos?.efficiency ?? null,
    incubationStatus: analysis.incubation?.status ?? null,
  };
}

/** Re-runs the analysis and stores the desk snapshot. Called after every change. */
export async function refreshSummary(db: Database, chatId: string, userId: string) {
  const { analysis } = await loadStudy(db, chatId, userId);
  await db
    .update(protocols)
    .set({ summary: summarize(analysis), updatedAt: new Date() })
    .where(eq(protocols.chatId, chatId));
  return analysis;
}
