import { afterEach, describe, it, expect } from "vitest";
import { isTeamEmail } from "@/lib/access";
import { enquirySchema } from "@/lib/applications";

describe("team allowlist", () => {
  afterEach(() => {
    delete process.env.TEAM_EMAILS;
  });

  it("is closed when TEAM_EMAILS is not set", () => {
    expect(isTeamEmail("anyone@example.com")).toBe(false);
  });

  it("matches exact addresses and whole domains, case-insensitively", () => {
    process.env.TEAM_EMAILS = " Malthe@Example.com , @pine-dev.com ";
    expect(isTeamEmail("malthe@example.com")).toBe(true);
    expect(isTeamEmail("QUANT@pine-dev.com")).toBe(true);
    expect(isTeamEmail("other@example.com")).toBe(false);
    expect(isTeamEmail("x@notpine-dev.com.evil")).toBe(false);
    expect(isTeamEmail(null)).toBe(false);
  });
});

describe("enquiry", () => {
  const valid = { name: "Jane Doe", email: "Jane@Fund.com", organisation: "", message: "Deployment for an existing strategy." };

  it("accepts a short enquiry and normalises it", () => {
    const parsed = enquirySchema.parse(valid);
    expect(parsed.email).toBe("jane@fund.com");
    expect(parsed.organisation).toBeNull();
  });

  it("rejects an empty message or a bad email", () => {
    expect(enquirySchema.safeParse({ ...valid, message: "hi" }).success).toBe(false);
    expect(enquirySchema.safeParse({ ...valid, email: "nope" }).success).toBe(false);
  });
});
