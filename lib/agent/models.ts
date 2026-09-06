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
    id: "minimax-m3",
    label: "MiniMax M3 (free)",
    description: "Free and fast. The default while the account has no provider credit.",
    provider: "openrouter",
    slug: "minimax/minimax-m3:free",
    tier: "economy",
    inputUsdPerMTok: 0,
    outputUsdPerMTok: 0,
  },
  {
    id: "nemotron-ultra",
    label: "Nemotron Ultra (free)",
    description: "Free, larger, slower. Second opinion when MiniMax is unavailable.",
    provider: "openrouter",
    slug: "nvidia/nemotron-3-ultra-550b-a55b:free",
    tier: "economy",
    inputUsdPerMTok: 0,
    outputUsdPerMTok: 0,
  },
  {
    id: "deepseek-v3",
    label: "DeepSeek V3",
    description: "Cheap and capable. Needs OpenRouter credit.",
    provider: "openrouter",
    slug: "deepseek/deepseek-chat",
    tier: "economy",
    inputUsdPerMTok: 0.32,
    outputUsdPerMTok: 0.89,
  },
  {
    id: "claude-sonnet-5",
    label: "Claude Sonnet 5",
    description: "Best value for real Pine Script work, and the reviewer for cheap drafts.",
    provider: "openrouter",
    slug: "anthropic/claude-sonnet-5",
    tier: "premium",
    inputUsdPerMTok: 2,
    outputUsdPerMTok: 10,
  },
  {
    id: "claude-opus-5",
    label: "Claude Opus 5",
    description: "Most capable. For genuinely tricky strategies.",
    provider: "openrouter",
    slug: "anthropic/claude-opus-5",
    tier: "premium",
    inputUsdPerMTok: 5,
    outputUsdPerMTok: 25,
  },
  // Kept so conversations already pinned to these ids keep working. They
  // now resolve through OpenRouter rather than Anthropic directly, because
  // that is where the account's credit lives.
  {
    id: "claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
    description: "Previous Sonnet. Kept for conversations that already use it.",
    provider: "openrouter",
    slug: "anthropic/claude-sonnet-4.6",
    tier: "premium",
    inputUsdPerMTok: 3,
    outputUsdPerMTok: 15,
  },
  {
    id: "claude-opus-4-6",
    label: "Claude Opus 4.6",
    description: "Previous Opus. Kept for conversations that already use it.",
    provider: "openrouter",
    slug: "anthropic/claude-opus-4.6",
    tier: "premium",
    inputUsdPerMTok: 5,
    outputUsdPerMTok: 25,
  },
  {
    id: "claude-haiku-4-6",
    label: "Claude Haiku 4.5",
    description: "Small, fast Claude. Kept for conversations that already use it.",
    provider: "openrouter",
    slug: "anthropic/claude-haiku-4.5",
    tier: "economy",
    inputUsdPerMTok: 1,
    outputUsdPerMTok: 5,
  },
];

/** Default for new conversations: cheap, and good enough for most turns. */
export const DEFAULT_AGENT_MODEL_ID = "minimax-m3";

/**
 * Tried when the primary model errors or is rate limited.
 *
 * Ideally this would sit behind a different gateway than the default, so
 * an OpenRouter outage could not take out both. It cannot right now: the
 * Anthropic account has no credit, so an Anthropic-direct fallback would
 * fail every time it was reached. Point this at an "anthropic" provider
 * model once that account is funded.
 */
export const FALLBACK_AGENT_MODEL_ID = "nemotron-ultra";

/**
 * Reviews Pine Script written by an economy model. The review pass is
 * short (a verdict, or one corrected script), so buying quality here costs
 * a fraction of generating the whole reply on a premium model.
 */
export const REVIEW_MODEL_ID = "claude-sonnet-5";

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
 * Which model should review a draft written by `modelId`. Premium models
 * review their own work; anything cheaper is checked by REVIEW_MODEL_ID,
 * so a cheap draft never ships without a strong pair of eyes on the code.
 */
export function reviewModelIdFor(modelId: string): string {
  return getAgentModel(modelId)?.tier === "premium" ? modelId : REVIEW_MODEL_ID;
}
