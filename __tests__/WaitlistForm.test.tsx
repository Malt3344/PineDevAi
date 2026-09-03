import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WaitlistForm } from "@/components/WaitlistForm";

describe("WaitlistForm", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it("renders an email input and a join button", () => {
    render(<WaitlistForm />);

    expect(screen.getByPlaceholderText(/you@example.com/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /join waitlist/i })).toBeInTheDocument();
  });

  it("shows a validation message on empty submit and never calls fetch", async () => {
    const user = userEvent.setup();
    render(<WaitlistForm />);

    await user.click(screen.getByRole("button", { name: /join waitlist/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/enter your email/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("shows the success state after a mocked successful post", async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ message: "You are on the waitlist." }),
    });

    const user = userEvent.setup();
    render(<WaitlistForm />);

    await user.type(screen.getByPlaceholderText(/you@example.com/i), "test@example.com");
    await user.click(screen.getByRole("button", { name: /join waitlist/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(/waitlist/i);
  });
});
