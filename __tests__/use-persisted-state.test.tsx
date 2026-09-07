import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePersistedState } from "@/lib/use-persisted-state";

describe("usePersistedState", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("starts from the fallback when nothing is stored", () => {
    const { result } = renderHook(() => usePersistedState("k", 420));
    expect(result.current[0]).toBe(420);
  });

  it("restores what was stored", () => {
    window.localStorage.setItem("k", "640");
    const { result } = renderHook(() => usePersistedState("k", 420));
    expect(result.current[0]).toBe(640);
  });

  it("persists updates", () => {
    const { result } = renderHook(() => usePersistedState("k", 420));
    act(() => result.current[1](500));
    expect(window.localStorage.getItem("k")).toBe("500");
  });

  it("does not let the fallback overwrite a stored preference", () => {
    window.localStorage.setItem("k", "640");
    renderHook(() => usePersistedState("k", 420));
    expect(window.localStorage.getItem("k")).toBe("640");
  });

  it("keeps working when storage throws, as it does in private mode", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    const { result } = renderHook(() => usePersistedState("k", 420));
    expect(result.current[0]).toBe(420);
    expect(() => act(() => result.current[1](500))).not.toThrow();
    expect(result.current[0]).toBe(500);
  });
});
