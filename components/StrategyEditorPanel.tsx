"use client";

import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Bookmark, BookmarkCheck, Check, Copy, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

type SaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * The "current script" panel: the most recently generated Pine Script in
 * this conversation, shown large and read-only alongside the chat — real
 * data pulled straight from the conversation, not a separate editable or
 * runnable file (PineDev doesn't execute Pine Script; only TradingView's
 * own editor does).
 */
export function StrategyEditorPanel({
  code,
  onSave,
}: {
  code: string | null;
  onSave: (code: string) => Promise<void>;
}) {
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  async function handleCopy() {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleSave() {
    if (!code || saveStatus === "saving") return;
    setSaveStatus("saving");
    try {
      await onSave(code);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 1500);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 1500);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <FileCode className="size-4" />
          strategy.pine
        </span>
        {code && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handleSave} disabled={saveStatus === "saving"}>
              {saveStatus === "saved" ? <BookmarkCheck /> : <Bookmark />}
              {saveStatus === "saved"
                ? "Saved"
                : saveStatus === "error"
                  ? "Failed"
                  : saveStatus === "saving"
                    ? "Saving…"
                    : "Save strategy"}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              {copied ? <Check /> : <Copy />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        )}
      </div>

      {code ? (
        <ScrollArea className="flex-1">
          <SyntaxHighlighter
            language="pine"
            style={oneDark}
            customStyle={{
              margin: 0,
              background: "transparent",
              fontSize: "0.8rem",
              padding: "1.25rem",
              overflowX: "auto",
            }}
          >
            {code}
          </SyntaxHighlighter>
        </ScrollArea>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <FileCode className="size-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            The Pine Script PineDev writes for you will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
