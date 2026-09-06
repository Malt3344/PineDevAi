import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { mockUseSearchParams } = vi.hoisted(() => ({
  mockUseSearchParams: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: mockUseSearchParams,
}));

vi.mock("@/lib/supabase/browser", () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithOAuth: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      resetPasswordForEmail: vi.fn(),
    },
  })),
}));

import LoginPage from "@/app/login/page";

describe("LoginPage default mode", () => {
  it("defaults to sign-in when there is no mode param — a returning user typing their password must not accidentally trigger sign-up", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams());

    render(<LoginPage />);

    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByText(/new here\?/i)).toBeInTheDocument();
  });

  it("starts in sign-up mode when the link explicitly asks for it (?mode=sign-up)", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("mode=sign-up"));

    render(<LoginPage />);

    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
    expect(screen.getByText(/already have an account\?/i)).toBeInTheDocument();
  });
});
