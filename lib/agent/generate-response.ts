import { randomUUID } from "node:crypto";
import {
  generateText,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type ModelMessage,
} from "ai";
import { SYSTEM_PROMPT } from "./system-prompt";
import { selfReviewAndCorrect } from "./self-review";
import { languageModelFor } from "./provider";
import { modelChain, withModelFallback } from "./fallback";
import {
  DEFAULT_AGENT_MODEL_ID,
  FALLBACK_AGENT_MODEL_ID,
  reviewModelIdFor,
} from "./models";

// Streamed back to the client in small pieces rather than all at once, so
// the UI still feels like a live reply even though the text itself was
// fully generated (and reviewed) before this stream starts.
const STREAM_CHUNK_SIZE = 24;
const STREAM_CHUNK_DELAY_MS = 6;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toChunks(text: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

export type UsageEvent = {
  modelId: string;
  inputTokens: number | undefined;
  outputTokens: number | undefined;
};

type OnFinish = (result: { text: string }) => void | Promise<void>;
type OnUsage = (event: UsageEvent) => void | Promise<void>;

/**
 * Generates a reply, then runs one real self-review pass over any Pine
 * Script it contains before anything reaches the user. The route handler
 * stays dumb (auth/gate/cap → call this → return the response); the system
 * prompt, review logic and model registry each live in exactly one place.
 *
 * Two things guard against a bad turn. The draft is generated through
 * withModelFallback, so a provider outage or rate limit moves to another
 * vendor instead of erroring. The review is best-effort: if it fails, the
 * user gets the unreviewed draft rather than nothing, because a slightly
 * less polished answer beats a crashed chat.
 *
 * `onUsage` fires once per model call that actually happened, with the
 * model that served it — this module never touches the database itself.
 */
export async function generateResponse({
  modelId = DEFAULT_AGENT_MODEL_ID,
  messages,
  onFinish,
  onUsage,
}: {
  modelId?: string;
  messages: ModelMessage[];
  onFinish?: OnFinish;
  onUsage?: OnUsage;
}): Promise<Response> {
  const draft = await withModelFallback(
    modelChain(modelId, FALLBACK_AGENT_MODEL_ID),
    async (id) => {
      const result = await generateText({
        model: languageModelFor(id),
        system: SYSTEM_PROMPT,
        messages,
      });
      // A model that returns nothing has not succeeded, however cleanly it
      // returned. Free models do this intermittently, and without treating
      // it as a failure the fallback never runs and the user is handed an
      // empty reply.
      if (result.text.trim() === "") {
        throw new Error(`Model ${id} returned an empty response.`);
      }
      return { ...result, servedByModelId: id };
    },
    (failedModelId, error) =>
      console.warn(`Model ${failedModelId} failed, falling back.`, error),
  );

  await onUsage?.({
    modelId: draft.servedByModelId,
    inputTokens: draft.usage?.inputTokens,
    outputTokens: draft.usage?.outputTokens,
  });

  const reviewModelId = reviewModelIdFor(draft.servedByModelId);
  let finalText = draft.text;

  try {
    const review = await selfReviewAndCorrect(reviewModelId, draft.text);
    finalText = review.text;
    if (review.inputTokens !== undefined || review.outputTokens !== undefined) {
      await onUsage?.({
        modelId: reviewModelId,
        inputTokens: review.inputTokens,
        outputTokens: review.outputTokens,
      });
    }
  } catch (error) {
    console.warn("Self-review failed; returning the unreviewed draft.", error);
  }

  await onFinish?.({ text: finalText });

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const id = randomUUID();
      writer.write({ type: "text-start", id });
      for (const part of toChunks(finalText, STREAM_CHUNK_SIZE)) {
        writer.write({ type: "text-delta", id, delta: part });
        await sleep(STREAM_CHUNK_DELAY_MS);
      }
      writer.write({ type: "text-end", id });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
