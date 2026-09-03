"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { MessageContent } from "@/components/MessageContent";

/** Concatenates a UIMessage's text parts into a single plain-text string. */
function messageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

/**
 * The active conversation view: message history, streaming input, and the
 * per-message "save strategy" action. Persistence of both the user's
 * message and the assistant's reply happens server-side in /api/chat.
 */
export function ChatView({
  conversationId,
  initialMessages,
  modelLabel,
}: {
  conversationId: string;
  initialMessages: UIMessage[];
  modelLabel: string;
}) {
  const [input, setInput] = useState("");

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
    const res = await fetch("/api/strategies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        title: firstLine || "Untitled strategy",
        conversationId,
      }),
    });
    if (!res.ok) {
      throw new Error("Failed to save strategy");
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-8">
        <span className="text-xs text-muted">{modelLabel}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          {messages.length === 0 && (
            <p className="text-center text-sm text-muted">
              Describe a strategy to get started.
            </p>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              {message.role === "user" ? (
                <div className="max-w-[85%] whitespace-pre-wrap rounded-lg rounded-tr-sm bg-surface-2 px-4 py-3 text-sm">
                  {messageText(message)}
                </div>
              ) : (
                <div className="max-w-[90%] text-sm">
                  <MessageContent content={messageText(message)} onSaveCode={handleSaveCode} />
                </div>
              )}
            </div>
          ))}
          {status === "submitted" && (
            <div className="flex justify-start">
              <div className="text-sm text-muted">Thinking…</div>
            </div>
          )}
          {error && (
            <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error.message || "Something went wrong. Please try again."}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border px-4 py-4 sm:px-8">
        <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl gap-3">
          <textarea
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
            className="max-h-40 min-h-[44px] flex-1 resize-none rounded-md border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={isBusy || !input.trim()}
            className="shrink-0 rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
