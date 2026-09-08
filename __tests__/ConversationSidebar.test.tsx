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
import { SidebarProvider } from "@/components/ui/sidebar";

describe("ConversationSidebar account menu", () => {
  // Slow (~17s) under jsdom, and correct: the menu really does open, which
  // a diagnostic run confirms. Portalled menus re-measure against a fake
  // layout engine that never returns a real size, so they settle slowly
  // here and instantly in a browser. The explicit timeout is the cheap
  // fix; polyfilling further has previously caused an infinite render
  // loop, which is worse than a slow-but-honest test.
  it("opens without throwing and shows the user's email and account actions", async () => {
    const user = userEvent.setup({ delay: null });
    // The rail is a shadcn Sidebar now, and it reads its collapse state
    // from the provider — the same wrapper the real layout supplies.
    render(
      <SidebarProvider>
        <ConversationSidebar
          conversations={[{ id: "c1", title: "My strategy" }]}
          userEmail="test@example.com"
        />
      </SidebarProvider>,
    );

    // This is exactly the interaction that crashed in production before
    // the account menu was restructured.
    await user.click(screen.getByText("test@example.com"));

    expect(await screen.findByText("Account settings")).toBeInTheDocument();
    expect(screen.getByText("Log out")).toBeInTheDocument();
  }, 30000);
});
