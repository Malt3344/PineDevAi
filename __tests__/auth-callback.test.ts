import { describe, it, expect } from "vitest";
import { safeNextPath } from "@/lib/safe-redirect";

describe("safeNextPath", () => {
  it("allows a plain relative path", () => {
    expect(safeNextPath("/auth/reset-password")).toBe("/auth/reset-password");
  });

  it("defaults to /chat when next is missing", () => {
    expect(safeNextPath(null)).toBe("/chat");
  });

  it("rejects a protocol-relative path (open-redirect attempt)", () => {
    expect(safeNextPath("//evil.example.com")).toBe("/chat");
  });

  it("rejects an absolute URL to another origin", () => {
    expect(safeNextPath("https://evil.example.com")).toBe("/chat");
  });

  it("rejects a path with no leading slash", () => {
    expect(safeNextPath("evil.example.com")).toBe("/chat");
  });
});
