import { describe, it, expect, afterEach } from "vitest";
import { getSiteUrl } from "@/lib/site-url";

describe("getSiteUrl", () => {
  const original = process.env.NEXT_PUBLIC_SITE_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = original;
  });

  it("defaults to localhost when unset", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(getSiteUrl()).toBe("http://localhost:3000");
  });

  it("returns a well-formed URL unchanged (minus a trailing slash)", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.pine-dev.com/";
    expect(getSiteUrl()).toBe("https://www.pine-dev.com");
  });

  it("throws a clear, actionable error for a URL missing its scheme — the exact misconfiguration that broke checkout", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "www.pine-dev.com";
    expect(() => getSiteUrl()).toThrow(/NEXT_PUBLIC_SITE_URL is not a valid absolute URL/);
  });

  it("throws for an empty string", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "";
    expect(() => getSiteUrl()).toThrow();
  });
});
