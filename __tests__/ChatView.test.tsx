import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UIMessage } from "ai";

const { mockUseChat } = vi.hoisted(() => ({ mockUseChat: vi.fn() }));

vi.mock("@ai-sdk/react", () => ({
  useChat: mockUseChat,
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Server actions cannot run in jsdom; the picker's job here is to report
// the choice, and this is what it reports to.
vi.mock("@/app/chat/actions", () => ({ setConversationModel: vi.fn() }));

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
      modelId="nemotron-ultra"
    />,
  );
}

describe("ChatView workspace + editor panel", () => {
  it("shows the conversation title and its script, with a real Run button that is disabled (not fake execution)", () => {
    const { container } = setup();

    expect(screen.getByRole("heading", { name: "ORB breakout strategy" })).toBeInTheDocument();

    // One workspace is one strategy, so the editor tab is named after the
    // conversation rather than listing files to choose between.
    expect(screen.getByText("ORB breakout strategy.pine")).toBeInTheDocument();
    expect(container.textContent).toContain("LiveDraftMarker");

    const runButton = screen.getByRole("button", { name: /run/i });
    expect(runButton).toHaveAttribute("aria-disabled", "true");
  });

  // Runs slow (~25s) under jsdom for the same reason as
  // ConversationSidebar.test.tsx — the send button is wrapped in a
  // Base UI Tooltip, whose popup positioning retries against jsdom's
  // fake layout engine before giving up and rendering anyway.
  it("sends the draft and clears the input", async () => {
    const user = userEvent.setup({ delay: null });
    const sendMessage = vi.fn();
    mockUseChat.mockReturnValue({
      messages: [ASSISTANT_MESSAGE],
      sendMessage,
      status: "ready",
      error: undefined,
    });
    render(
      <ChatView
        conversationId="c1"
        conversationTitle="ORB breakout strategy"
        initialMessages={[ASSISTANT_MESSAGE]}
        modelId="nemotron-ultra"
      />,
    );

    await user.type(
      screen.getByPlaceholderText(/describe a strategy/i),
      "Now make it short-only",
    );
    await user.click(screen.getByRole("button", { name: /send message/i }));

    // The composer's toggles are only real if they reach the server; this
    // is where that is proven.
    expect(sendMessage).toHaveBeenCalledWith(
      { text: "Now make it short-only" },
      { body: { mode: "act", thinking: false } },
    );
  });

  it("shows an empty state when there is no code anywhere yet", () => {
    setup([]);

    expect(screen.getByText(/no script yet/i)).toBeInTheDocument();
    expect(screen.getByText(/you can edit it directly once it lands/i)).toBeInTheDocument();
  });
});

/**
 * On a phone the three panes cannot share the screen, so one fills it at a
 * time and this bar moves between them. Before it existed, the workspace
 * and the editor were simply hidden below their breakpoints — you could
 * open the workspace on a phone and find no workspace in it.
 */
describe("ChatView pane switcher", () => {
  it("offers the code and the chat as destinations", () => {
    setup();

    const nav = screen.getByRole("navigation", { name: /workspace panes/i });
    for (const label of ["Code", "Chat"]) {
      expect(within(nav).getByRole("button", { name: label })).toBeInTheDocument();
    }
    // There is no file list any more — one workspace is one strategy.
    expect(within(nav).queryByRole("button", { name: "Files" })).not.toBeInTheDocument();
  });

  it("starts on the chat, which is what the page is for", () => {
    setup();

    const nav = screen.getByRole("navigation", { name: /workspace panes/i });
    expect(within(nav).getByRole("button", { name: "Chat" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("moves between panes when one is chosen", async () => {
    const user = userEvent.setup({ delay: null });
    setup();

    const nav = screen.getByRole("navigation", { name: /workspace panes/i });
    await user.click(within(nav).getByRole("button", { name: "Code" }));

    expect(within(nav).getByRole("button", { name: "Code" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("button", { name: "Chat" })).not.toHaveAttribute(
      "aria-current",
    );
  });

});

/**
 * The chat is a panel you can put away, not a fixed slab that permanently
 * owns a third of the window — the editor is meant to be the main surface.
 */
describe("ChatView chat panel", () => {
  beforeEach(() => window.localStorage.clear());

  it("offers a divider to drag, with the two panes it sits between", () => {
    setup();

    const separator = screen.getByRole("separator", { name: /resize chat panel/i });
    expect(separator).toHaveAttribute("aria-orientation", "vertical");
  });

  it("hides the chat and offers it back", async () => {
    const user = userEvent.setup({ delay: null });
    setup();

    await user.click(screen.getByRole("button", { name: /hide chat/i }));

    expect(screen.getByRole("button", { name: /show chat/i })).toBeInTheDocument();
    // The divider is meaningless with nothing on the other side of it.
    expect(
      screen.queryByRole("separator", { name: /resize chat panel/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /show chat/i }));
    expect(screen.getByRole("button", { name: /hide chat/i })).toBeInTheDocument();
  });

  it("remembers that the chat was hidden", async () => {
    const user = userEvent.setup({ delay: null });
    setup();

    await user.click(screen.getByRole("button", { name: /hide chat/i }));

    expect(window.localStorage.getItem("pinedev:chat-collapsed")).toBe("true");
  });
});

/**
 * Everything in the composer toolbar changes what sending the message
 * does. These assert that, rather than that the buttons merely exist.
 */
describe("ChatView composer controls", () => {
  function setupWithSpy() {
    const sendMessage = vi.fn();
    mockUseChat.mockReturnValue({
      messages: [ASSISTANT_MESSAGE],
      sendMessage,
      status: "ready",
      error: undefined,
    });
    render(
      <ChatView
        conversationId="c1"
        conversationTitle="ORB breakout strategy"
        initialMessages={[ASSISTANT_MESSAGE]}
        modelId="nemotron-ultra"
      />,
    );
    return sendMessage;
  }

  it("sends plan mode when Plan is selected", async () => {
    const user = userEvent.setup({ delay: null });
    const sendMessage = setupWithSpy();

    await user.click(screen.getByRole("button", { name: "Plan" }));
    await user.type(screen.getByPlaceholderText(/describe the strategy/i), "ORB on NQ");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ text: "ORB on NQ" }),
      { body: { mode: "plan", thinking: false } },
    );
  });

  it("sends the thinking flag when Think is on", async () => {
    const user = userEvent.setup({ delay: null });
    const sendMessage = setupWithSpy();

    await user.click(screen.getByRole("button", { name: /extended thinking/i }));
    await user.type(screen.getByPlaceholderText(/describe a strategy/i), "ORB on NQ");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ text: "ORB on NQ" }),
      { body: { mode: "act", thinking: true } },
    );
  });

  it("marks the active mode for assistive technology, not just visually", async () => {
    const user = userEvent.setup({ delay: null });
    setupWithSpy();

    expect(screen.getByRole("button", { name: "Act" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Plan" }));
    expect(screen.getByRole("button", { name: "Plan" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Act" })).toHaveAttribute("aria-pressed", "false");
  });

  it("offers attachments behind the composer's action menu", async () => {
    const user = userEvent.setup({ delay: null });
    setupWithSpy();

    await user.click(screen.getByRole("button", { name: /add attachment/i }));
    expect(
      await screen.findByText(/add a script, csv or text file/i),
    ).toBeInTheDocument();
  }, 30000);
});