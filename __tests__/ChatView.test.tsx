import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UIMessage } from "ai";

const { mockUseChat } = vi.hoisted(() => ({ mockUseChat: vi.fn() }));

vi.mock("@ai-sdk/react", () => ({
  useChat: mockUseChat,
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { ChatView } from "@/components/ChatView";

const ASSISTANT_MESSAGE: UIMessage = {
  id: "m1",
  role: "assistant",
  parts: [
    {
      type: "text",
      text: 'Here you go:\n```pine\n//@version=6\nstrategy("LiveDraftMarker")\n```',
    },
  ],
};

// MessageContent renders both a compact (lg+) and a full (below lg) version
// of each code block's toolbar, toggled by a CSS breakpoint. jsdom doesn't
// apply real CSS, so both exist in the test DOM at once — every "per code
// block" button count below is doubled from what a real, single-breakpoint
// screenshot would show.
const BUTTONS_PER_CHAT_CODE_BLOCK = 2;

function setup(messages: UIMessage[] = [ASSISTANT_MESSAGE]) {
  mockUseChat.mockReturnValue({
    messages,
    sendMessage: vi.fn(),
    status: "ready",
    error: undefined,
  });

  return render(
    <ChatView
      conversationId="c1"
      conversationTitle="ORB breakout strategy"
      initialMessages={messages}
      modelLabel="Claude Sonnet"
      savedStrategies={[{ id: "s1", title: "VWAP reversion", code: 'strategy("SavedMarker")' }]}
    />,
  );
}

describe("ChatView workspace + editor panel", () => {
  it("shows the conversation title and the live conversation's script by default, with a real Run button that is disabled (not fake execution)", () => {
    const { container } = setup();

    expect(screen.getByRole("heading", { name: "ORB breakout strategy" })).toBeInTheDocument();

    // Appears twice by design: the workspace list item and the editor's
    // own tab both name the currently open file the same way.
    expect(screen.getAllByText("this conversation.pine")).toHaveLength(2);
    expect(container.textContent).toContain("LiveDraftMarker");

    const runButton = screen.getByRole("button", { name: /run/i });
    expect(runButton).toHaveAttribute("aria-disabled", "true");
  });

  it("lists real saved strategies in the workspace panel, and switches the editor to one when clicked", async () => {
    const user = userEvent.setup({ delay: null });
    const { container } = setup();

    expect(screen.getByText("VWAP reversion.pine")).toBeInTheDocument();

    // Before switching: one "Save strategy" button in the editor panel
    // (the live, unsaved script) plus the chat message's own code block.
    expect(screen.getAllByRole("button", { name: /^save strategy$/i })).toHaveLength(
      1 + BUTTONS_PER_CHAT_CODE_BLOCK,
    );

    await user.click(screen.getByText("VWAP reversion.pine"));

    expect(container.textContent).toContain("SavedMarker");
    // Switching the editor to an already-saved file drops its own "Save
    // strategy" action — it's already saved. Only the chat message's
    // (unrelated to which file is open) remain.
    expect(screen.getAllByRole("button", { name: /^save strategy$/i })).toHaveLength(
      BUTTONS_PER_CHAT_CODE_BLOCK,
    );
  });

  // Runs slow (~25s) under jsdom for the same reason as
  // ConversationSidebar.test.tsx — the send button is wrapped in a
  // Base UI Tooltip, whose popup positioning retries against jsdom's
  // fake layout engine before giving up and rendering anyway.
  it("switches back to the live conversation when a new message is sent, even if a saved file was open", async () => {
    const user = userEvent.setup({ delay: null });
    const sendMessage = vi.fn();
    mockUseChat.mockReturnValue({
      messages: [ASSISTANT_MESSAGE],
      sendMessage,
      status: "ready",
      error: undefined,
    });

    const { container } = render(
      <ChatView
        conversationId="c1"
        conversationTitle="ORB breakout strategy"
        initialMessages={[ASSISTANT_MESSAGE]}
        modelLabel="Claude Sonnet"
        savedStrategies={[{ id: "s1", title: "VWAP reversion", code: 'strategy("SavedMarker")' }]}
      />,
    );

    await user.click(screen.getByText("VWAP reversion.pine"));
    expect(container.textContent).toContain("SavedMarker");

    await user.type(
      screen.getByPlaceholderText(/describe a strategy/i),
      "Now make it short-only",
    );
    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(sendMessage).toHaveBeenCalledWith({ text: "Now make it short-only" });
    expect(screen.getAllByText("this conversation.pine")).toHaveLength(2);
    expect(container.textContent).toContain("LiveDraftMarker");
  });

  it("shows an empty state when there is no code anywhere yet", () => {
    setup([]);

    expect(
      screen.getByText(/the pine script pinedev writes for you will appear here/i),
    ).toBeInTheDocument();
  });
});
