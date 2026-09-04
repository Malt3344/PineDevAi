import { randomUUID } from "node:crypto";
import { anthropic } from "@ai-sdk/anthropic";
import {
  generateText,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type ModelMessage,
} from "ai";
import { SYSTEM_PROMPT } from "./system-prompt";
import { selfReviewAndCorrect } from "./self-review";
import { DEFAULT_AGENT_MODEL_ID } from "./models";

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

type OnFinish = (result: { text: string }) => void | Promise<void>;

/**
 * Generates a reply, then runs one real self-review pass over any Pine
 * Script it contains (a second model call — see self-review.ts) before
 * anything reaches the user. The route handler stays dumb (auth/gate/cap
 * → call this → return the response); the system prompt and review logic
 * each live in exactly one place.
 *
 * Returns a full Response rather than a stream handle, because the text
 * is already final by the time this returns — there's nothing left to
 * await downstream. The model id is validated against AGENT_MODELS by
 * the caller before it ever reaches here.
 */
export async function generateResponse({
  modelId = DEFAULT_AGENT_MODEL_ID,
  messages,
  onFinish,
}: {
  modelId?: string;
  messages: ModelMessage[];
  onFinish?: OnFinish;
}): Promise<Response> {
  const draft = await generateText({
    model: anthropic(modelId),
    system: SYSTEM_PROMPT,
    messages,
  });

  const finalText = await selfReviewAndCorrect(modelId, draft.text);

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
