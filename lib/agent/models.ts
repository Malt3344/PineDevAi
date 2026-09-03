export type AgentModel = {
  id: string;
  label: string;
  description: string;
};

/**
 * The models a user can pick between. The id is the exact Anthropic model
 * identifier passed to the provider — if Anthropic renames or retires one,
 * update it here only.
 */
export const AGENT_MODELS: AgentModel[] = [
  {
    id: "claude-sonnet-4-6",
    label: "Claude Sonnet",
    description: "Balanced speed and quality. Good default for most strategies.",
  },
  {
    id: "claude-opus-4-6",
    label: "Claude Opus",
    description: "Most capable, slower. Best for complex or tricky strategies.",
  },
  {
    id: "claude-haiku-4-6",
    label: "Claude Haiku",
    description: "Fastest. Good for quick fixes and simple scripts.",
  },
];

export const DEFAULT_AGENT_MODEL_ID = AGENT_MODELS[0].id;

/**
 * Client-supplied model ids are never trusted directly — this validates
 * against the registry and falls back to the default for anything unknown.
 */
export function resolveAgentModelId(candidate: unknown): string {
  if (
    typeof candidate === "string" &&
    AGENT_MODELS.some((model) => model.id === candidate)
  ) {
    return candidate;
  }
  return DEFAULT_AGENT_MODEL_ID;
}
