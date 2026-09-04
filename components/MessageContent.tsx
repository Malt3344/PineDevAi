"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Bookmark, BookmarkCheck, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

type SaveStatus = "idle" | "saving" | "saved" | "error";

/** A fenced code block with copy and (for assistant messages) save-to-library actions. */
function CodeBlock({
  language,
  code,
  onSave,
}: {
  language: string;
  code: string;
  onSave?: (code: string) => Promise<void>;
}) {
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleSave() {
    if (!onSave || saveStatus === "saving") return;
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
    <div className="my-3 overflow-hidden rounded-md border border-border">
      <div className="flex items-center justify-between border-b border-border bg-muted px-3 py-1.5">
        <span className="font-mono text-xs text-muted-foreground">{language || "text"}</span>
        <div className="flex items-center gap-1">
          {onSave && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSave}
              disabled={saveStatus === "saving"}
              className="text-xs"
            >
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
          <Button type="button" variant="ghost" size="sm" onClick={handleCopy} className="text-xs">
            {copied ? <Check /> : <Copy />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>
      <SyntaxHighlighter
        language={language || "text"}
        style={oneDark}
        customStyle={{
          margin: 0,
          background: "transparent",
          fontSize: "0.8rem",
          padding: "1rem",
          overflowX: "auto",
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

/**
 * Renders an assistant message as Markdown, with syntax-highlighted code
 * blocks. `onSaveCode`, when provided, adds a "Save strategy" action to
 * every code block.
 */
export function MessageContent({
  content,
  onSaveCode,
}: {
  content: string;
  onSaveCode?: (code: string) => Promise<void>;
}) {
  return (
    <div className="prose-pd">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(props) {
            const { className, children } = props;
            const match = /language-(\w+)/.exec(className || "");
            const code = String(children).replace(/\n$/, "");

            if (!match) {
              return (
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">
                  {children}
                </code>
              );
            }

            return <CodeBlock language={match[1]} code={code} onSave={onSaveCode} />;
          },
          p({ children }) {
            return <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>;
          },
          ul({ children }) {
            return <ul className="mb-3 list-disc pl-5 leading-relaxed">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="mb-3 list-decimal pl-5 leading-relaxed">{children}</ol>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
