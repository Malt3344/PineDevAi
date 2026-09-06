import { describe, it, expect } from "vitest";
import {
  AGENT_MODELS,
  DEFAULT_AGENT_MODEL_ID,
  FALLBACK_AGENT_MODEL_ID,
  REVIEW_MODEL_ID,
  getAgentModel,
  resolveAgentModelId,
  reviewModelIdFor,
} from "@/lib/agent/models";

describe("model registry", () => {
  it("has unique ids and a priced entry for every model", () => {
    const ids = AGENT_MODELS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const model of AGENT_MODELS) {
      // Zero is legitimate — the free models genuinely cost nothing.
      expect(model.inputUsdPerMTok).toBeGreaterThanOrEqual(0);
      expect(model.outputUsdPerMTok).toBeGreaterThanOrEqual(0);
      expect(model.slug).not.toBe("");
    }
  });

  it("points the default, fallback and review constants at models that exist", () => {
    expect(getAgentModel(DEFAULT_AGENT_MODEL_ID)).toBeDefined();
    expect(getAgentModel(FALLBACK_AGENT_MODEL_ID)).toBeDefined();
    expect(getAgentModel(REVIEW_MODEL_ID)).toBeDefined();
  });

  it("defaults to an economy model and reviews with a premium one", () => {
    expect(getAgentModel(DEFAULT_AGENT_MODEL_ID)?.tier).toBe("economy");
    expect(getAgentModel(REVIEW_MODEL_ID)?.tier).toBe("premium");
  });

  // Gateway diversity is the property we actually want here, but it is not
  // reachable while the Anthropic account is unfunded — see the comment on
  // FALLBACK_AGENT_MODEL_ID. This asserts what is true today: a genuinely
  // different model, so a single model's outage or rate limit is survivable.
  it("falls back to a different model than the default", () => {
    expect(FALLBACK_AGENT_MODEL_ID).not.toBe(DEFAULT_AGENT_MODEL_ID);
    expect(getAgentModel(FALLBACK_AGENT_MODEL_ID)).toBeDefined();
  });
});

describe("resolveAgentModelId", () => {
  it("accepts any id in the registry", () => {
    for (const model of AGENT_MODELS) {
      expect(resolveAgentModelId(model.id)).toBe(model.id);
    }
  });

  it("falls back to the default for unknown, empty or non-string input", () => {
    expect(resolveAgentModelId("gpt-9-ultra")).toBe(DEFAULT_AGENT_MODEL_ID);
    expect(resolveAgentModelId("")).toBe(DEFAULT_AGENT_MODEL_ID);
    expect(resolveAgentModelId(null)).toBe(DEFAULT_AGENT_MODEL_ID);
    expect(resolveAgentModelId(undefined)).toBe(DEFAULT_AGENT_MODEL_ID);
    expect(resolveAgentModelId({ id: "claude-opus-4-6" })).toBe(DEFAULT_AGENT_MODEL_ID);
  });
});

describe("reviewModelIdFor", () => {
  it("sends an economy draft to the premium reviewer", () => {
    expect(reviewModelIdFor("minimax-m3")).toBe(REVIEW_MODEL_ID);
    expect(reviewModelIdFor("nemotron-ultra")).toBe(REVIEW_MODEL_ID);
  });

  it("lets a premium model review its own work instead of downgrading it", () => {
    expect(reviewModelIdFor("claude-opus-5")).toBe("claude-opus-5");
    expect(reviewModelIdFor("claude-sonnet-4-6")).toBe("claude-sonnet-4-6");
  });

  it("uses the premium reviewer for an unknown model id", () => {
    expect(reviewModelIdFor("nonsense")).toBe(REVIEW_MODEL_ID);
  });
});
