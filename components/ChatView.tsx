"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import useSWR from "swr";
import {
  ArrowUp,
  Brain,
  ClipboardCheck,
  Copy,
  FileCode,
  ListChecks,
  MessageSquare,
  PanelRightClose,
  PanelRightOpen,
  Paperclip,
  Pencil,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AgentStatusLine } from "@/components/AgentStatusLine";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent as MessageBubble,
} from "@/components/ai-elements/message";
import { MessageContent } from "@/components/MessageContent";
import { ModelSelector } from "@/components/model-selector";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { StrategyEditorPanel } from "@/components/StrategyEditorPanel";
import { ProtocolPanel, type StudyData } from "@/components/study/ProtocolPanel";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { AgentMode, AgentStatus } from "@/lib/agent/generate-response";
import { setChatModel } from "@/app/chat/actions";
import { extractLatestCodeBlock } from "@/lib/pine-code";
import { usePersistedState } from "@/lib/use-persisted-state";
import { cn } from "@/lib/utils";

type Vote = { messageId: string; isUpvoted: boolean };

async function fetcher(url: string): Promise<{ votes: Vote[] }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load votes");
  return res.json();
}

/**
 * Which pane fills the screen on a phone. Above `lg` all three are on
 * screen at once and this is ignored — the same idea as an editor that
 * shows the explorer, the file and a side panel together when there is
 * room, and one at a time when there is not.
 */
type Pane = "protocol" | "code" | "chat";

const PANES: { id: Pane; label: string; icon: typeof FileCode }[] = [
  { id: "protocol", label: "Protocol", icon: ClipboardCheck },
  { id: "code", label: "Script", icon: FileCode },
  { id: "chat", label: "Chat", icon: MessageSquare },
];

/** What fills the main pane at lg and up, where the chat is always beside it. */
type Center = "protocol" | "code";

/**
 * What the attach control accepts. Text-shaped files are inlined into the
 * message as a fenced block, which every model can read — no upload
 * pipeline, and the file stays visible in the transcript.
 */
const ATTACHABLE = ".pine,.txt,.csv,.json,.md,.log,.js,.ts,.py,text/*";
const MAX_ATTACHMENT_BYTES = 128 * 1024;

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

/** Reads an attached file's text, whether it arrives as a blob or a data URL. */
async function fileText(file: { url?: string }): Promise<string> {
  if (!file.url) return "";
  const res = await fetch(file.url);
  return res.text();
}

/** Concatenates a UIMessage's text parts into a single plain-text string. */
function messageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

/**
 * A study's workspace: the validation protocol (or the script it is
 * testing) in the main pane, and the research assistant beside it.
 * Persistence of both the user's message and the assistant's reply
 * happens server-side in /api/chat.
 */
export function ChatView({
  chatId,
  chatTitle,
  initialMessages,
  modelId,
  study,
}: {
  chatId: string;
  chatTitle: string;
  initialMessages: UIMessage[];
  modelId: string;
  study: StudyData;
}) {
  const [pane, setPane] = useState<Pane>("protocol");
  const [center, setCenter] = usePersistedState<Center>("pinedev:center-pane", "protocol");
  // Held locally so the label changes the instant it is picked; the server
  // action is what actually decides which model the next request uses.
  const [activeModelId, setActiveModelId] = useState(modelId);
  const [mode, setMode] = useState<AgentMode>("act");
  const [thinking, setThinking] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  // Set once the first save of this chat's script succeeds; every later
  // save reuses it so the document library gets versions of one document
  // rather than a pile of unrelated saves.
  const [documentId, setDocumentId] = useState<string | null>(null);

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

  /**
   * Attachments arrive as files and go into the message as fenced blocks:
   * the model reads them like any other paste, and they stay visible in
   * the transcript rather than disappearing into an opaque upload.
   */
  async function handlePromptSubmit(message: PromptInputMessage) {
    const trimmed = (message.text ?? "").trim();
    if (!trimmed || isBusy) return;

    const parts: string[] = [trimmed];
    for (const file of message.files ?? []) {
      try {
        const text = await fileText(file);
        parts.push(`\n\nAttached — ${file.filename ?? "file"}:\n\n\`\`\`\n${text}\n\`\`\``);
      } catch {
        toast.error(`Could not read ${file.filename ?? "that file"}.`);
      }
    }

    sendMessage({ text: parts.join("") }, { body: { mode, thinking } });
  }

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { chatId },
      }),
    [chatId],
  );

  const { messages, sendMessage, status, error } = useChat({
    id: chatId,
    messages: initialMessages,
    transport,
    // The server reports each real stage of the turn as a transient data
    // part; this is where they land.
    onData: (part) => {
      if (part.type === "data-status") setAgentStatus(part.data as AgentStatus);
    },
  });

  const isBusy = status === "submitted" || status === "streaming";

  /**
   * The protocol's "ask the assistant" buttons. They send a real message,
   * visible in the transcript, rather than a hidden prompt — the user can
   * see exactly what was asked on their behalf.
   */
  function askAssistant(text: string, askMode: AgentMode = "act") {
    if (isBusy) {
      toast.error("The assistant is still answering. Try again in a moment.");
      return;
    }
    setMode(askMode);
    setChatCollapsed(false);
    setPane("chat");
    sendMessage({ text }, { body: { mode: askMode, thinking } });
  }

  function openScript() {
    setCenter("code");
    setPane("code");
  }

  // Clear the status once the turn is over, so a finished reply is not left
  // sitting under a stale "reviewing" line.
  useEffect(() => {
    if (!isBusy) setAgentStatus(null);
  }, [isBusy]);
  // Assistant messages only. Pasting a script or a compiler error into the
  // chat is a normal thing to do, and reading code out of user messages put
  // the user's own paste into the editor as though the agent had written it.
  const latestCode = extractLatestCodeBlock(
    messages.filter((m) => m.role === "assistant").map(messageText),
  );

  // One workspace is one strategy: the editor always shows this chat's
  // own script, named after it.
  const fileName = `${chatTitle || "untitled"}.pine`;

  /**
   * Saves a code block from an assistant message into the user's strategy
   * library. The first save of this chat starts a new document; every
   * save after that reuses `documentId`, so it becomes a new version of
   * the same document instead of an unrelated new one.
   */
  async function handleSaveCode(code: string) {
    const firstLine = code.split("\n")[0]?.replace(/^\/\/\s*/, "").slice(0, 80);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          title: firstLine || "Untitled strategy",
          chatId,
          id: documentId,
        }),
      });
      if (!res.ok) throw new Error("Failed to save strategy");
      const data: { document: { id: string } } = await res.json();
      setDocumentId(data.document.id);
      toast.success("Saved to your strategy library");
    } catch {
      toast.error("Could not save that strategy");
      throw new Error("Failed to save strategy");
    }
  }

  // Votes for this chat's assistant messages, fetched once and kept fresh
  // through optimistic mutations rather than a refetch on every click.
  const { data: voteData, mutate: mutateVotes } = useSWR(
    `/api/vote?chatId=${chatId}`,
    fetcher,
  );
  const voteByMessageId = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const vote of voteData?.votes ?? []) map.set(vote.messageId, vote.isUpvoted);
    return map;
  }, [voteData]);

  async function handleCopyMessage(text: string) {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }

  /**
   * Clicking the same vote again un-votes (a third, neutral state) rather
   * than flipping straight to the opposite vote — DELETE clears the row,
   * PATCH otherwise sets it to exactly the value clicked.
   */
  async function handleVote(messageId: string, isUpvoted: boolean) {
    const current = voteByMessageId.get(messageId);
    const isUnvote = current === isUpvoted;
    const previousVotes = voteData?.votes ?? [];
    const nextVotes = isUnvote
      ? previousVotes.filter((v) => v.messageId !== messageId)
      : [...previousVotes.filter((v) => v.messageId !== messageId), { messageId, isUpvoted }];

    void mutateVotes({ votes: nextVotes }, { revalidate: false });

    try {
      if (isUnvote) {
        await fetch("/api/vote", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId, messageId }),
        });
      } else {
        await fetch("/api/vote", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId, messageId, isUpvoted }),
        });
      }
    } catch {
      toast.error("Could not save your vote.");
    } finally {
      void mutateVotes();
    }
  }

  return (
    <div ref={shellRef} className="flex min-h-0 flex-1 flex-col gap-0 lg:flex-row lg:gap-2">

      {/* Main pane: the protocol, or the script under test. */}
      <div
        ref={editorRef}
        className={cn(
          // min-w-0 at every width, not just lg: without it this pane
          // refuses to shrink below its widest line of code and widens the
          // whole layout past the phone's viewport. The lg minimum is what
          // stops the divider squeezing the editor to nothing.
          "min-h-0 min-w-0 flex-col overflow-hidden border-border bg-surface-raised lg:flex lg:flex-1 lg:rounded-xl lg:border",
          pane === "chat" ? "hidden" : "flex flex-1",
        )}
      >
        {/* Desktop only: on a phone the pane switcher below does this job. */}
        <div role="tablist" aria-label="Main pane" className="hidden h-10 shrink-0 items-end gap-1 border-b border-border px-2 lg:flex">
          {(
            [
              { id: "protocol" as const, label: "Protocol", Icon: ClipboardCheck },
              { id: "code" as const, label: "Script", Icon: FileCode },
            ]
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={center === id}
              onClick={() => setCenter(id)}
              className={cn(
                "-mb-px flex h-8 items-center gap-1.5 rounded-t-md border border-b-0 px-3 text-[0.8125rem] transition-colors",
                center === id
                  ? "border-border bg-background text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>
        <div
          className={cn(
            "min-h-0 flex-1",
            pane === "protocol" ? "flex" : "hidden",
            center === "protocol" ? "lg:flex" : "lg:hidden",
          )}
        >
          <ProtocolPanel
            chatId={chatId}
            study={study}
            code={latestCode}
            onAsk={askAssistant}
            onOpenScript={openScript}
          />
        </div>
        <div
          className={cn(
            "min-h-0 flex-1",
            pane === "code" ? "flex" : "hidden",
            center === "code" ? "lg:flex" : "lg:hidden",
          )}
        >
          <StrategyEditorPanel
            code={latestCode}
            fileName={fileName}
            onSave={handleSaveCode}
            documentId={documentId}
          />
        </div>
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
            "hidden w-1 shrink-0 cursor-col-resize touch-none rounded-full bg-transparent transition-colors hover:bg-primary/50 lg:block",
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
          "min-h-0 min-w-0 flex-col overflow-hidden border-border bg-surface-raised lg:w-[var(--chat-w)] lg:flex-none lg:rounded-xl lg:border",
          chatCollapsed ? "lg:hidden" : "lg:flex",
          pane === "chat" ? "flex flex-1" : "hidden",
        )}
      >
        <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border px-4">
          <h1 className="truncate text-[0.9375rem] font-semibold tracking-tight">{chatTitle}</h1>
          <div className="flex shrink-0 items-center gap-1">
            <ModelSelector
              value={activeModelId}
              onChange={(id) => {
                setActiveModelId(id);
                void setChatModel(chatId, id);
              }}
            />
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

        <Conversation className="min-h-0 flex-1">
          <ConversationContent className="gap-7 px-4 py-6">
            {messages.length === 0 && (
              <ConversationEmptyState
                icon={<FileCode className="size-5" />}
                title="Your research partner"
                description="Describe the idea in plain language. The assistant helps you sharpen it into a testable hypothesis, writes the Pine v6, and explains every result in the protocol — including when the answer is no."
              />
            )}
            {messages.map((message) => (
              <Message from={message.role} key={message.id}>
                {/* AI Elements supplies the message shell; the body stays
                    ours, because it carries the Save-strategy and Copy
                    actions on every code block — and it avoids pulling
                    shiki and mermaid in for highlighting we already do. */}
                {message.role === "user" ? (
                  <MessageBubble>{messageText(message)}</MessageBubble>
                ) : (
                  <>
                    <div className="min-w-0 max-w-full text-sm">
                      <MessageContent content={messageText(message)} onSaveCode={handleSaveCode} />
                    </div>
                    <MessageActions className="opacity-0 transition-opacity group-hover:opacity-100">
                      <MessageAction
                        tooltip="Copy"
                        onClick={() => void handleCopyMessage(messageText(message))}
                      >
                        <Copy className="size-3.5" />
                      </MessageAction>
                      <MessageAction
                        tooltip="Good response"
                        aria-pressed={voteByMessageId.get(message.id) === true}
                        className={cn(
                          voteByMessageId.get(message.id) === true && "text-primary",
                        )}
                        onClick={() => void handleVote(message.id, true)}
                      >
                        <ThumbsUp className="size-3.5" />
                      </MessageAction>
                      <MessageAction
                        tooltip="Bad response"
                        aria-pressed={voteByMessageId.get(message.id) === false}
                        className={cn(
                          voteByMessageId.get(message.id) === false && "text-destructive",
                        )}
                        onClick={() => void handleVote(message.id, false)}
                      >
                        <ThumbsDown className="size-3.5" />
                      </MessageAction>
                    </MessageActions>
                  </>
                )}
              </Message>
            ))}
            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error.message || "Something went wrong. Please try again."}
              </div>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="shrink-0 border-t border-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:pb-3">
          {isBusy && <AgentStatusLine status={agentStatus} />}

          {/* Vercel's AI Elements prompt input: attachments, drag-and-drop,
              auto-resize and submit states are its job, not ours. The
              controls inside it are the ones that change what sending does. */}
          <PromptInput
            accept={ATTACHABLE}
            multiple
            maxFileSize={MAX_ATTACHMENT_BYTES}
            onSubmit={handlePromptSubmit}
            onError={(e) => toast.error(e.message)}
          >
            <PromptInputBody>
              <PromptInputTextarea
                placeholder={
                  mode === "plan"
                    ? "Describe the idea — the assistant plans the research before any code…"
                    : "Ask about the study, describe a strategy, or paste a compiler error…"
                }
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools className="min-w-0 flex-1 overflow-hidden">
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger aria-label="Add attachment" />
                  <PromptInputActionMenuContent>
                    <PromptInputActionAddAttachments label="Add a script, CSV or text file" />
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>

                {/* Both options stay visible: Plan works the problem out
                    first, Act writes the script. A single toggle would hide
                    whichever one you are not currently in. */}
                {(
                  [
                    { id: "act" as const, label: "Act", Icon: Pencil },
                    { id: "plan" as const, label: "Plan", Icon: ListChecks },
                  ]
                ).map(({ id, label, Icon }) => (
                  <PromptInputButton
                    key={id}
                    onClick={() => setMode(id)}
                    aria-pressed={mode === id}
                    aria-label={label}
                    variant={mode === id ? "default" : "ghost"}
                  >
                    <Icon />
                    <span>{label}</span>
                  </PromptInputButton>
                ))}

                <PromptInputButton
                  onClick={() => setThinking(!thinking)}
                  aria-pressed={thinking}
                  aria-label="Extended thinking"
                  tooltip="Let the model reason for longer. Slower."
                  variant={thinking ? "default" : "ghost"}
                >
                  {/* Icon-only: the mode buttons and the model name need the
                      room more, and the label lives in the tooltip. */}
                  <Brain />
                </PromptInputButton>

              </PromptInputTools>
              <PromptInputSubmit status={status} aria-label="Send message" className="shrink-0" />
            </PromptInputFooter>
          </PromptInput>
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
