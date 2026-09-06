"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ArrowUp } from "lucide-react";
import { toast } from "sonner";
import { MessageContent } from "@/components/MessageContent";
import { StrategyEditorPanel } from "@/components/StrategyEditorPanel";
import { WorkspacePanel, type SavedStrategy } from "@/components/WorkspacePanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { extractLatestCodeBlock } from "@/lib/pine-code";

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
  modelLabel,
  savedStrategies,
}: {
  conversationId: string;
  conversationTitle: string;
  initialMessages: UIMessage[];
  modelLabel: string;
  savedStrategies: SavedStrategy[];
}) {
  const [input, setInput] = useState("");
  // null = "this conversation" (the live script); otherwise a saved
  // strategy's id, selected from the workspace panel.
  const [openFileId, setOpenFileId] = useState<string | null>(null);

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

  const openStrategy = savedStrategies.find((s) => s.id === openFileId) ?? null;
  const displayedCode = openStrategy ? openStrategy.code : latestCode;
  const displayedFileName = openStrategy ? `${openStrategy.title}.pine` : "this conversation.pine";

  /** Sends the current draft, if non-empty and no generation is in flight. */
  function submitDraft() {
    const trimmed = input.trim();
    if (!trimmed || isBusy) return;
    sendMessage({ text: trimmed });
    setInput("");
    // Asking a new question is a clear signal to show what comes back
    // from it — if a saved file was open in the editor, switch back to
    // the live conversation so the fresh script is what appears.
    setOpenFileId(null);
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
    <div className="flex flex-1 overflow-hidden">
      <WorkspacePanel
        strategies={savedStrategies}
        selectedId={openFileId}
        onSelect={setOpenFileId}
      />

      {/* Current-script panel — hidden on narrow screens, where the chat
          alone already shows the same code inline. */}
      <div className="hidden min-w-0 flex-1 border-r border-border lg:block">
        <StrategyEditorPanel
          code={displayedCode}
          fileName={displayedFileName}
          onSave={openStrategy ? undefined : handleSaveCode}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col lg:w-[420px] lg:flex-none">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-8">
          <h1 className="truncate text-sm font-medium">{conversationTitle}</h1>
          <Badge variant="secondary" className="shrink-0">
            {modelLabel}
          </Badge>
        </div>

        <ScrollArea className="flex-1 px-4 py-6 sm:px-8">
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

        <div className="border-t border-border px-4 py-4 sm:px-8">
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
                  <Button type="submit" size="icon" disabled={isBusy || !input.trim()} />
                }
              >
                <ArrowUp />
                <span className="sr-only">Send message</span>
              </TooltipTrigger>
              <TooltipContent>Send (Enter)</TooltipContent>
            </Tooltip>
          </form>
        </div>
      </div>
    </div>
  );
}
