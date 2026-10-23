"use server";

import { revalidatePath } from "next/cache";
import { getApprovedUser } from "@/lib/gate";
import { db } from "@/lib/db/client";
import type { Criteria, Hypothesis, RunStage } from "@/lib/quant/protocol";
import {
  amendStudy,
  lockStudy,
  recordRun,
  removeRun,
  saveHypothesisDraft,
  type OpResult,
} from "@/lib/study-ops";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * The web app's door into lib/study-ops.ts. Identity comes from the
 * session here; ownership and every protocol rule are checked there, the
 * same way they are for a connected Claude. Validation failures come back
 * as values, not throws, so the form can show them in place.
 */
async function userId(): Promise<string | null> {
  const gate = await getApprovedUser();
  return gate.status === "approved" ? gate.user.id : null;
}

function done(result: OpResult, chatId: string, layout = false): ActionResult {
  if (!result.ok) return result;
  revalidatePath(`/studies/${chatId}`);
  if (layout) revalidatePath("/studies", "layout");
  return { ok: true };
}

export async function saveHypothesis(
  chatId: string,
  hypothesis: Hypothesis,
  criteria: Criteria,
): Promise<ActionResult> {
  const id = await userId();
  if (!id) return { ok: false, error: "Study not found." };
  return done(await saveHypothesisDraft(db, id, chatId, hypothesis, criteria), chatId);
}

/** Pre-registers the hypothesis and criteria. Saves first, so what is locked is what is on screen. */
export async function lockHypothesis(
  chatId: string,
  hypothesis: Hypothesis,
  criteria: Criteria,
): Promise<ActionResult> {
  const id = await userId();
  if (!id) return { ok: false, error: "Study not found." };
  const saved = await saveHypothesisDraft(db, id, chatId, hypothesis, criteria);
  if (!saved.ok) return saved;
  return done(await lockStudy(db, id, chatId), chatId, true);
}

export async function amendHypothesis(chatId: string): Promise<ActionResult> {
  const id = await userId();
  if (!id) return { ok: false, error: "Study not found." };
  return done(await amendStudy(db, id, chatId), chatId);
}

/**
 * Stores one trade list. Parsing happens in the browser (the same
 * lib/quant/trades.ts parser) so the user sees errors before anything is
 * sent; recordRun re-validates the parsed shape rather than trusting it.
 */
export async function uploadRun(
  chatId: string,
  input: { stage: RunStage; fileName: string | null; trades: unknown[] },
): Promise<ActionResult> {
  const id = await userId();
  if (!id) return { ok: false, error: "Study not found." };
  return done(await recordRun(db, id, chatId, input), chatId, true);
}

export async function deleteRun(chatId: string, runId: string): Promise<ActionResult> {
  const id = await userId();
  if (!id) return { ok: false, error: "Study not found." };
  return done(await removeRun(db, id, chatId, runId), chatId, true);
}
