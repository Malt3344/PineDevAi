"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  ArrowUp,
  Check,
  ChevronDown,
  FileCode,
  MessageSquare,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { toast } from "sonner";
import { MessageContent } from "@/components/MessageContent";
import { StrategyEditorPanel } from "@/components/StrategyEditorPanel";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AGENT_MODELS } from "@/lib/agent/models";
import { setConversationModel } from "@/app/chat/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { extractLatestCodeBlock } from "@/lib/pine-code";
import { usePersistedState } from "@/lib/use-persisted-state";
import { cn } from "@/lib/utils";

/**
 * Which pane fills the screen on a phone. Above `lg` all three are on
 * screen at once and this is ignored — the same idea as an editor that
 * shows the explorer, the file and a side panel together when there is
 * room, and one at a time when there is not.
 */
type Pane = "code" | "chat";

const PANES: { id: Pane; label: string; icon: typeof FileCode }[] = [
  { id: "code", label: "Code", icon: FileCode },
  { id: "chat", label: "Chat", icon: MessageSquare },
];

/**
 * Width bounds for the chat panel, in pixels. The minimum is where a
 * wrapped code block in a message stops being readable; the editor keeps
 * EDITOR_MIN_WIDTH no matter how far the divider is dragged, so neither
 * side can be squeezed into uselessness.
 */
const CHAT_MIN_WIDTH = 320;
const CHAT_MAX_WIDTH = 720;
const CHAT_DEFAULT_WIDTH = 420;
const EDITOR_MIN_WIDTH = 360;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Concatenates a UIMessage's text parts into a single plain-text string. */
function messageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

/**
 * The active conversation view: a workspace panel (the user's real saved
 * strategies), a code panel showing whichever script is open, and a
 * narrower chat panel alongside it. Persistence of both the user's
 * message and the assistant's reply happens server-side in /api/chat.
 */
export function ChatView({
  conversationId,
  conversationTitle,
  initialMessages,
  modelId,
}: {
  conversationId: string;
  conversationTitle: string;
  initialMessages: UIMessage[];
  modelId: string;
}) {
  const [input, setInput] = useState("");
  const [pane, setPane] = useState<Pane>("chat");
  // Held locally so the label changes the instant it is picked; the server
  // action is what actually decides which model the next request uses.
  const [activeModelId, setActiveModelId] = useState(modelId);
  const activeModel = AGENT_MODELS.find((m) => m.id === activeModelId);
  const [chatWidth, setChatWidth] = usePersistedState(
    "pinedev:chat-width",
    CHAT_DEFAULT_WIDTH,
  );
  const [chatCollapsed, setChatCollapsed] = usePersistedState(
    "pinedev:chat-collapsed",
    false,
  );
  const shellRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  /**
   * Drag-to-resize. Pointer events rather than mouse events so a trackpad,
   * a stylus and a touch drag all work from one code path; capture keeps
   * the drag alive when the pointer outruns the 6px handle.
   */
  const onHandleDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
    },
    [],
  );

  const onHandleMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      const shell = shellRef.current;
      const editor = editorRef.current;
      const chat = chatRef.current;
      if (!shell || !editor || !chat) return;

      // The panel is on the right, so its width is the distance from the
      // pointer to the shell's right edge.
      const raw = shell.getBoundingClientRect().right - event.clientX;

      // The ceiling comes from what these two panes share between them,
      // measured live — deriving it from the shell would hand the editor
      // the file rail's width as well and let it be squeezed below its
      // minimum.
      const available = editor.offsetWidth + chat.offsetWidth;
      const max = Math.min(
        CHAT_MAX_WIDTH,
        Math.max(CHAT_MIN_WIDTH, available - EDITOR_MIN_WIDTH),
      );
      setChatWidth(Math.round(clamp(raw, CHAT_MIN_WIDTH, max)));
    },
    [dragging, setChatWidth],
  );

  const endDrag = useCallback(() => setDragging(false), []);

  // A drag that leaves the window still has to end, or the divider keeps
  // following the pointer after the button is released.
  useEffect(() => {
    if (!dragging) return;
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, [dragging, endDrag]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { conversationId },
      }),
    [conversationId],
  );

  const { messages, sendMessage, status, error } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport,
  });

  const isBusy = status === "submitted" || status === "streaming";
  const latestCode = extractLatestCodeBlock(messages.map(messageText));

  // One workspace is one strategy: the editor always shows this
  // conversation's own script, named after it.
  const fileName = `${conversationTitle || "untitled"}.pine`;

  /** Sends the current draft, if non-empty and no generation is in flight. */
  function submitDraft() {
    const trimmed = input.trim();
    if (!trimmed || isBusy) return;
    sendMessage({ text: trimmed });
    setInput("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitDraft();
  }

  /** Saves a code block from an assistant message into the user's strategy library. */
  async function handleSaveCode(code: string) {
    const firstLine = code.split("\n")[0]?.replace(/^\/\/\s*/, "").slice(0, 80);
    try {
      const res = await fetch("/api/strategies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          title: firstLine || "Untitled strategy",
          conversationId,
        }),
      });
      if (!res.ok) throw new Error("Failed to save strategy");
      toast.success("Saved to your strategy library");
    } catch {
      toast.error("Could not save that strategy");
      throw new Error("Failed to save strategy");
    }
  }

  return (
    <div ref={shellRef} className="flex min-h-0 flex-1 flex-col lg:flex-row">

      {/* Editor. */}
      <div
        ref={editorRef}
        className={cn(
          // min-w-0 at every width, not just lg: without it this pane
          // refuses to shrink below its widest line of code and widens the
          // whole layout past the phone's viewport.
          // min-w-0 at every width, not just lg: without it this pane
          // refuses to shrink below its widest line of code and widens the
          // whole layout past the phone's viewport. The lg minimum is what
          // stops the divider squeezing the editor to nothing.
          "min-h-0 min-w-0 border-border lg:block lg:flex-1 lg:border-r",
          pane === "code" ? "flex flex-1" : "hidden",
        )}
      >
        <StrategyEditorPanel
          code={latestCode}
          fileName={fileName}
          onSave={handleSaveCode}
        />
      </div>

      {/* Divider. Only a control at lg and up, where the two panes are side
          by side; below that the pane switcher decides what is on screen. */}
      {!chatCollapsed && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize chat panel"
          onPointerDown={onHandleDown}
          onPointerMove={onHandleMove}
          onPointerUp={endDrag}
          className={cn(
            "hidden w-1.5 shrink-0 cursor-col-resize touch-none bg-border/40 transition-colors hover:bg-primary/40 lg:block",
            dragging && "bg-primary/60",
          )}
        />
      )}

      {/* Collapsed chat: a thin rail that gives the panel back. */}
      {chatCollapsed && (
        <div className="hidden shrink-0 items-start border-l border-border p-2 lg:flex">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setChatCollapsed(false)}
            aria-label="Show chat"
            title="Show chat"
            aria-expanded={false}
          >
            <PanelRightOpen />
          </Button>
        </div>
      )}

      {/* Chat. */}
      <div
        ref={chatRef}
        // The dragged width rides in a custom property, not a width style:
        // an inline width would beat every class and pin the pane to 420px
        // on a phone too, overflowing a 375px screen. As a variable it is
        // inert until the lg class below actually consumes it.
        style={{ "--chat-w": `${chatWidth}px` } as React.CSSProperties}
        className={cn(
          "min-h-0 min-w-0 flex-col lg:w-[var(--chat-w)] lg:flex-none",
          chatCollapsed ? "lg:hidden" : "lg:flex",
          pane === "chat" ? "flex flex-1" : "hidden",
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-8">
          <h1 className="truncate text-sm font-medium">{conversationTitle}</h1>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setChatCollapsed(true)}
              aria-label="Hide chat"
              title="Hide chat"
              aria-expanded
              className="hidden lg:inline-flex"
            >
              <PanelRightClose />
            </Button>
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1 px-4 py-6 sm:px-8">
          <div className="flex flex-col gap-6">
            {messages.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">
                Describe a strategy to get started.
              </p>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
              >
                {message.role === "user" ? (
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-lg rounded-tr-sm bg-muted px-4 py-3 text-sm">
                    {messageText(message)}
                  </div>
                ) : (
                  <div className="min-w-0 max-w-full text-sm">
                    <MessageContent content={messageText(message)} onSaveCode={handleSaveCode} />
                  </div>
                )}
              </div>
            ))}
            {status === "submitted" && (
              <div className="flex justify-start">
                <div className="text-sm text-muted-foreground">Thinking…</div>
              </div>
            )}
            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error.message || "Something went wrong. Please try again."}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="shrink-0 border-t border-border px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-8 lg:pb-4">
          <form onSubmit={handleSubmit} className="flex items-end gap-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitDraft();
                }
              }}
              rows={1}
              placeholder="Describe a strategy, or paste a compiler error…"
              className="max-h-40 min-h-11 flex-1 resize-none"
            />
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="submit"
                    size="icon"
                    disabled={isBusy || !input.trim()}
                    className="size-11 sm:size-8"
                  />
                }
              >
                <ArrowUp />
                <span className="sr-only">Send message</span>
              </TooltipTrigger>
              <TooltipContent>Send (Enter)</TooltipContent>
            </Tooltip>
          </form>

          {/* Model picker sits with the input, not in front of it: there is
              a sensible default, and changing it is a small adjustment you
              make while writing rather than a decision before you start. */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1.5 -ml-1.5 h-11 gap-1 text-xs text-muted-foreground sm:h-8"
                />
              }
            >
              {activeModel?.label ?? activeModelId}
              <ChevronDown className="size-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              {AGENT_MODELS.map((model) => (
                <DropdownMenuItem
                  key={model.id}
                  onClick={() => {
                    setActiveModelId(model.id);
                    void setConversationModel(conversationId, model.id);
                  }}
                >
                  <Check
                    className={cn(
                      "size-3.5",
                      model.id === activeModelId ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="flex min-w-0 flex-col">
                    <span>{model.label}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {model.description}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Pane switcher — phones only. Three destinations, always reachable,
          so the workspace and the script are real places on a phone rather
          than things that vanish below a breakpoint. */}
      <nav
        aria-label="Workspace panes"
        className="flex shrink-0 border-t border-border bg-sidebar pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {PANES.map(({ id, label, icon: Icon }) => {
          const isActive = pane === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setPane(id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                // min-h-11 is 44px — the smallest target a thumb hits
                // reliably, and the floor Apple's own guidance sets.
                "flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 border-t-2 px-2 py-2 text-[0.7rem] transition-colors",
                isActive
                  ? "border-t-primary text-foreground"
                  : "border-t-transparent text-muted-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
