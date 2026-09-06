import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
  usePathname: () => "/chat/c1",
}));

vi.mock("@/app/chat/actions", () => ({
  createConversation: vi.fn(),
  signOutAction: vi.fn(),
}));

vi.mock("@/app/chat/account/billing/actions", () => ({
  startCheckoutAction: vi.fn(),
  openBillingPortalAction: vi.fn(),
}));

import { ConversationSidebar } from "@/components/ConversationSidebar";

describe("ConversationSidebar account menu", () => {
  // Runs slow (~25s) under jsdom: Base UI's popup positioning retries
  // while waiting on a real size measurement jsdom's fake layout engine
  // never provides, before eventually giving up and rendering anyway.
  // Real browsers don't hit this path. Not worth polyfilling further —
  // an earlier attempt to make ResizeObserver's mock fire its callback
  // caused an actual infinite render loop, which is a worse problem than
  // a slow-but-correct test.
  it("opens without throwing and shows the user's email and account actions", async () => {
    const user = userEvent.setup({ delay: null });
    render(
      <ConversationSidebar
        conversations={[{ id: "c1", title: "My strategy" }]}
        userEmail="test@example.com"
      />,
    );

    // This is exactly the interaction that crashed in production
    // (Base UI error #31 — a GroupLabel used outside a Menu.Group).
    await user.click(screen.getByText("test@example.com"));

    expect(await screen.findByText("Account settings")).toBeInTheDocument();
    expect(screen.getByText("Log out")).toBeInTheDocument();
  });
});
