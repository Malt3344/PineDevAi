"use client";

import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Bookmark, BookmarkCheck, Check, Copy, FileCode, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type SaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * The code panel: a tab showing whichever script is open (the live
 * conversation's latest script, or a saved strategy selected from the
 * workspace list), with real data either way. Read-only — PineDev
 * doesn't execute Pine Script; only TradingView's own editor does, which
 * is also why Run is disabled rather than faking a result.
 */
export function StrategyEditorPanel({
  code,
  fileName,
  onSave,
}: {
  code: string | null;
  fileName: string;
  onSave?: (code: string) => Promise<void>;
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
    if (!code || !onSave || saveStatus === "saving") return;
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

  const saveLabel =
    saveStatus === "saved"
      ? "Saved"
      : saveStatus === "error"
        ? "Failed"
        : saveStatus === "saving"
          ? "Saving…"
          : "Save strategy";
  const copyLabel = copied ? "Copied" : "Copy";

  return (
    // w-full min-w-0: as a flex child this panel defaults to
    // min-width:auto and would otherwise stretch to its widest line of
    // code, dragging the whole phone layout wider than the screen.
    <div className="flex h-full w-full min-w-0 flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border bg-sidebar">
        {/* The tab gives way; the actions do not. On a phone the filename
            would otherwise push Save, Copy and Run off the right edge, where
            they cannot be reached at all. */}
        <div className="flex min-w-0 items-center gap-1.5 border-t-2 border-t-primary bg-background px-4 py-2.5 text-sm">
          <FileCode className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{fileName}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 px-2">
          {code && onSave && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              disabled={saveStatus === "saving"}
              aria-label={saveLabel}
              className="size-11 sm:h-7 sm:w-auto"
            >
              {saveStatus === "saved" ? <BookmarkCheck /> : <Bookmark />}
              <span className="hidden sm:inline">{saveLabel}</span>
            </Button>
          )}
          {code && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              aria-label={copyLabel}
              className="size-11 sm:h-7 sm:w-auto"
            >
              {copied ? <Check /> : <Copy />}
              <span className="hidden sm:inline">{copyLabel}</span>
            </Button>
          )}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  focusableWhenDisabled
                  aria-label="Run"
                  className="size-11 sm:h-7 sm:w-auto"
                />
              }
            >
              <Play />
              <span className="hidden sm:inline">Run</span>
            </TooltipTrigger>
            <TooltipContent>
              Pine Script only runs inside TradingView&apos;s own editor — paste the
              script there to run it
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {code ? (
        <ScrollArea className="flex-1">
          <SyntaxHighlighter
            language="pine"
            style={oneDark}
            showLineNumbers
            lineNumberStyle={{
              minWidth: "2.5em",
              paddingRight: "1em",
              color: "var(--muted-foreground)",
              opacity: 0.5,
              userSelect: "none",
            }}
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
