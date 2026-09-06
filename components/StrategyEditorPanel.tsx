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

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border bg-sidebar">
        <div className="flex items-center gap-1.5 border-t-2 border-t-primary bg-background px-4 py-2.5 text-sm">
          <FileCode className="size-4 text-muted-foreground" />
          {fileName}
        </div>
        <div className="flex items-center gap-1.5 px-2">
          {code && onSave && (
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
          )}
          {code && (
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              {copied ? <Check /> : <Copy />}
              {copied ? "Copied" : "Copy"}
            </Button>
          )}
          <Tooltip>
            <TooltipTrigger
              render={<Button variant="outline" size="sm" disabled focusableWhenDisabled />}
            >
              <Play />
              Run
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
