export type ModelProvider = "openrouter" | "anthropic";

/**
 * "economy" models are cheap and good enough for ordinary chat and small
 * iterations. "premium" models are the ones worth paying for when the Pine
 * Script itself is the hard part — they also review their own output
 * instead of being handed to REVIEW_MODEL_ID.
 */
export type ModelTier = "economy" | "premium";

export type AgentModel = {
  /** Stable internal id. Persisted on conversation.model — never rename. */
  id: string;
  label: string;
  description: string;
  provider: ModelProvider;
  /** The model id as the provider knows it. */
  slug: string;
  tier: ModelTier;
  /**
   * List price in USD per million tokens, used for budget accounting.
   * The OpenRouter figures were read from its /api/v1/models endpoint;
   * providers change pricing without notice, so treat these as the number
   * to re-check against that endpoint, not as a contract.
   */
  inputUsdPerMTok: number;
  outputUsdPerMTok: number;
};

/**
 * Every model the product can talk to, and the only place to add, remove
 * or re-price one. Routing, cost accounting and the model picker all read
 * from here; nothing downstream hardcodes a model id.
 *
 * Economy models go through OpenRouter so we are not locked to a single
 * vendor's availability or pricing. The Claude entries deliberately call
 * Anthropic directly: they are the quality path, and one less hop is one
 * less thing between us and the best output.
 */
export const AGENT_MODELS: AgentModel[] = [
  {
    id: "nemotron-ultra",
    label: "Nemotron Ultra",
    description: "Large and free. The most reliable of the free models on Pine.",
    provider: "openrouter",
    slug: "nvidia/nemotron-3-ultra-550b-a55b:free",
    tier: "economy",
    inputUsdPerMTok: 0,
    outputUsdPerMTok: 0,
  },
  {
    id: "dots-note",
    label: "Dots Note",
    description: "Faster and free. Good for small edits to an existing script.",
    provider: "openrouter",
    slug: "dots-studio/dots-3-note-preview:free",
    tier: "economy",
    inputUsdPerMTok: 0,
    outputUsdPerMTok: 0,
  },
  {
    id: "ling-flash",
    label: "Ling Flash",
    description: "Quickest and free. Best when you want an answer immediately.",
    provider: "openrouter",
    slug: "inclusionai/ling-3.0-flash-fin:free",
    tier: "economy",
    inputUsdPerMTok: 0,
    outputUsdPerMTok: 0,
  },
];

/** Default for new conversations: cheap, and good enough for most turns. */
export const DEFAULT_AGENT_MODEL_ID = "nemotron-ultra";

/**
 * Tried when the primary model errors or is rate limited.
 *
 * Ideally this would sit behind a different gateway than the default, so
 * an OpenRouter outage could not take out both. It cannot right now: the
 * Anthropic account has no credit, so an Anthropic-direct fallback would
 * fail every time it was reached. Point this at an "anthropic" provider
 * model once that account is funded.
 */
export const FALLBACK_AGENT_MODEL_ID = "dots-note";

/**
 * The review pass runs on whichever model the conversation is already
 * using. Every model on offer is free right now, so there is nothing
 * stronger to hand the check to; once paid models are added, this is where
 * a dedicated reviewer would go.
 */
export const REVIEW_MODEL_ID = DEFAULT_AGENT_MODEL_ID;

export function getAgentModel(id: string): AgentModel | undefined {
  return AGENT_MODELS.find((model) => model.id === id);
}

/**
 * Client-supplied model ids are never trusted directly — this validates
 * against the registry and falls back to the default for anything unknown.
 */
export function resolveAgentModelId(candidate: unknown): string {
  return typeof candidate === "string" && getAgentModel(candidate)
    ? candidate
    : DEFAULT_AGENT_MODEL_ID;
}

/**
 * Which model reviews a draft: the one that wrote it. A model reviewing its
 * own output catches less than a stronger second opinion would — measured,
 * the free models approve Pine that does not compile — but with only free
 * models on offer there is nothing better to escalate to.
 */
export function reviewModelIdFor(modelId: string): string {
  return getAgentModel(modelId) ? modelId : REVIEW_MODEL_ID;
}
