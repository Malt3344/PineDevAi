import { describe, it, expect, vi } from "vitest";
import { modelChain, withModelFallback } from "@/lib/agent/fallback";

describe("modelChain", () => {
  it("tries the primary first, then the fallback", () => {
    expect(modelChain("deepseek-v3", "gemini-flash")).toEqual([
      "deepseek-v3",
      "gemini-flash",
    ]);
  });

  it("does not retry a model against itself", () => {
    expect(modelChain("gemini-flash", "gemini-flash")).toEqual(["gemini-flash"]);
  });
});

describe("withModelFallback", () => {
  it("returns the first model's result without touching the fallback", async () => {
    const attempt = vi.fn().mockResolvedValue("primary reply");

    const result = await withModelFallback(["a", "b"], attempt);

    expect(result).toBe("primary reply");
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(attempt).toHaveBeenCalledWith("a");
  });

  it("moves to the next model when the primary fails, and the user still gets a reply", async () => {
    const attempt = vi
      .fn()
      .mockRejectedValueOnce(new Error("429 rate limited"))
      .mockResolvedValueOnce("fallback reply");

    const result = await withModelFallback(["a", "b"], attempt);

    expect(result).toBe("fallback reply");
    expect(attempt).toHaveBeenNthCalledWith(2, "b");
  });

  it("reports which model was skipped, so the failure is visible in logs", async () => {
    const onFallback = vi.fn();
    const error = new Error("provider down");
    const attempt = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce("ok");

    await withModelFallback(["a", "b"], attempt, onFallback);

    expect(onFallback).toHaveBeenCalledWith("a", error);
  });

  it("throws the last error when every model fails, not a synthetic one", async () => {
    const last = new Error("fallback also down");
    const attempt = vi
      .fn()
      .mockRejectedValueOnce(new Error("primary down"))
      .mockRejectedValueOnce(last);

    await expect(withModelFallback(["a", "b"], attempt)).rejects.toBe(last);
    expect(attempt).toHaveBeenCalledTimes(2);
  });

  it("rejects an empty chain rather than silently returning nothing", async () => {
    await expect(withModelFallback([], vi.fn())).rejects.toThrow(/at least one model/);
  });
});
