import { anthropic } from "@ai-sdk/anthropic";
import { streamText, type ModelMessage, type StreamTextResult } from "ai";
import { SYSTEM_PROMPT } from "./system-prompt";
import { DEFAULT_AGENT_MODEL_ID } from "./models";

type OnFinishCallback = NonNullable<Parameters<typeof streamText>[0]["onFinish"]>;

/**
 * Thin wrapper around the AI SDK's streamText, so the route handler stays
 * dumb (auth/gate/cap → call this → return the stream) and the system
 * prompt lives in exactly one place. The model id is validated against
 * AGENT_MODELS by the caller before it ever reaches here.
 */
export function generateResponse({
  modelId = DEFAULT_AGENT_MODEL_ID,
  messages,
  onFinish,
}: {
  modelId?: string;
  messages: ModelMessage[];
  onFinish?: OnFinishCallback;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): StreamTextResult<any, any> {
  return streamText({
    model: anthropic(modelId),
    system: SYSTEM_PROMPT,
    messages,
    onFinish,
  });
}
