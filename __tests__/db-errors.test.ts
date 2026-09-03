import { describe, it, expect } from "vitest";
import { getPostgresErrorCode } from "@/lib/db/client";

describe("getPostgresErrorCode", () => {
  it("reads a code set directly on the error", () => {
    expect(getPostgresErrorCode({ code: "23505" })).toBe("23505");
  });

  it("unwraps a DrizzleQueryError's .cause to find the driver's code", () => {
    const error = {
      message: "Failed query",
      cause: { code: "23505", message: "duplicate key value" },
    };
    expect(getPostgresErrorCode(error)).toBe("23505");
  });

  it("unwraps multiple levels of .cause", () => {
    const error = { cause: { cause: { code: "23505" } } };
    expect(getPostgresErrorCode(error)).toBe("23505");
  });

  it("returns undefined when there is no code anywhere in the chain", () => {
    expect(getPostgresErrorCode({ message: "boom" })).toBeUndefined();
    expect(getPostgresErrorCode(null)).toBeUndefined();
    expect(getPostgresErrorCode("boom")).toBeUndefined();
  });
});
