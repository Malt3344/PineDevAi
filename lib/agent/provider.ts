import { anthropic } from "@ai-sdk/anthropic";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";
import { getAgentModel, type AgentModel } from "./models";

let openRouter: ReturnType<typeof createOpenRouter> | null = null;

/**
 * Created on first use rather than at import time, so importing anything
 * in this module tree does not require OPENROUTER_API_KEY to be set — the
 * build, the tests and every Anthropic-only code path stay independent of it.
 */
function getOpenRouter() {
  if (!openRouter) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY is not set.");
    }
    openRouter = createOpenRouter({ apiKey });
  }
  return openRouter;
}

/** Turns a model from the registry into a callable AI SDK model. */
export function toLanguageModel(model: AgentModel): LanguageModel {
  return model.provider === "anthropic"
    ? anthropic(model.slug)
    : getOpenRouter().chat(model.slug);
}

/**
 * The one place a model id becomes something callable. Everything upstream
 * deals in registry ids; only this function knows which vendor answers.
 */
export function languageModelFor(modelId: string): LanguageModel {
  const model = getAgentModel(modelId);
  if (!model) {
    throw new Error(`Unknown model id: ${modelId}`);
  }
  return toLanguageModel(model);
}
