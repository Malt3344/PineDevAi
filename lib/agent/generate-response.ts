import { randomUUID } from "node:crypto";
import {
  generateText,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type ModelMessage,
} from "ai";
import { PLAN_SYSTEM_PROMPT, SYSTEM_PROMPT } from "./system-prompt";
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

/**
 * "act" writes the script; "plan" works out the approach first and stops.
 * The two differ only in the system prompt, which is the whole point —
 * a mode toggle that does not change behaviour is just chrome.
 */
export type AgentMode = "act" | "plan";

/**
 * What the agent is doing right now, streamed to the client as it happens
 * rather than inferred from a spinner. These are the real stages of the
 * pipeline below — there is no stage here that does not correspond to work
 * actually being done.
 */
export type AgentPhase =
  | "drafting"
  | "retrying"
  | "reviewing"
  | "writing"
  | "done";

export type AgentStatus = {
  phase: AgentPhase;
  /** Which model is serving this stage, so a fallback is visible. */
  model?: string;
  detail?: string;
};

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
  mode = "act",
  thinking = false,
  onFinish,
  onUsage,
}: {
  modelId?: string;
  messages: ModelMessage[];
  mode?: AgentMode;
  thinking?: boolean;
  onFinish?: OnFinish;
  onUsage?: OnUsage;
}): Promise<Response> {
  const system = mode === "plan" ? PLAN_SYSTEM_PROMPT : SYSTEM_PROMPT;
  // Every model on offer reports support for reasoning tokens; asking for
  // them is what the thinking toggle actually does.
  const providerOptions = thinking
    ? { openrouter: { reasoning: { enabled: true, effort: "medium" as const } } }
    : undefined;

  // The whole turn runs inside the stream so status can be reported while
  // it happens. Previously everything was generated first and only then
  // streamed, which left the user watching a spinner with no idea whether
  // the agent was drafting, retrying a dead provider, or reviewing.
  const stream = createUIMessageStream({
    // The turn now runs inside the stream, so a failure no longer reaches
    // the route's try/catch — it has to be turned into something readable
    // here instead. Returning a string is what puts it in front of the
    // user as an error rather than a truncated reply.
    onError: (error) => {
      console.error("Chat generation failed", error);
      const message = error instanceof Error ? error.message : String(error);
      if (/API_KEY is not set|Unknown model id/.test(message)) {
        return "The model provider is not configured. This is a server-side problem, not something you did.";
      }
      if (/rate limit|429/i.test(message)) {
        return "The free model quota for today is used up. It resets at midnight UTC.";
      }
      return "The model provider could not be reached. Please try again in a moment.";
    },
    execute: async ({ writer }) => {
      const status = (data: AgentStatus) =>
        writer.write({ type: "data-status", data, transient: true });

      status({ phase: "drafting", model: modelId });

      const draft = await withModelFallback(
        modelChain(modelId, FALLBACK_AGENT_MODEL_ID),
        async (id) => {
          const result = await generateText({
            model: languageModelFor(id),
            system,
            messages,
            ...(providerOptions ? { providerOptions } : {}),
          });
          if (result.text.trim() === "") {
            throw new Error(`Model ${id} returned an empty response.`);
          }
          // Read the fields out explicitly. The SDK exposes `text` and `usage`
          // as prototype getters, so spreading the result silently produces an
          // object where both are undefined.
          return { text: result.text, usage: result.usage, servedByModelId: id };
        },
        (failedModelId, error) => {
          console.warn(`Model ${failedModelId} failed, falling back.`, error);
          status({ phase: "retrying", model: FALLBACK_AGENT_MODEL_ID, detail: `${failedModelId} was unavailable` });
        },
      );

      await onUsage?.({
        modelId: draft.servedByModelId,
        inputTokens: draft.usage?.inputTokens,
        outputTokens: draft.usage?.outputTokens,
      });

      let finalText = draft.text;

      // Nothing to review in plan mode — there is no script yet, by design.
      if (mode === "act") {
        const reviewModelId = reviewModelIdFor(draft.servedByModelId);
        try {
          status({ phase: "reviewing", model: reviewModelId });
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
      }

      await onFinish?.({ text: finalText });

      status({ phase: "writing" });
      const id = randomUUID();
      writer.write({ type: "text-start", id });
      for (const part of toChunks(finalText, STREAM_CHUNK_SIZE)) {
        writer.write({ type: "text-delta", id, delta: part });
        await sleep(STREAM_CHUNK_DELAY_MS);
      }
      writer.write({ type: "text-end", id });
      status({ phase: "done" });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
