"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Bookmark, BookmarkCheck, Check, Copy, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";

type SaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * A fenced code block with copy and (for assistant messages) save-to-library
 * actions. Below the `lg` breakpoint (where ChatView's separate editor
 * panel is hidden) this shows the full code inline, since it's the only
 * place to see it. At `lg` and up, where the same script is already shown
 * large in the editor panel right next to the chat, this collapses to a
 * compact reference card instead of repeating the whole script — both
 * versions are real, static markup, toggled by CSS breakpoint only, so
 * there's no hydration-dependent screen-size detection.
 */
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
  const lineCount = code.split("\n").length;

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

  const saveButton = onSave && (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleSave}
      disabled={saveStatus === "saving"}
      className="h-11 text-xs sm:h-7"
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
  );

  const copyButton = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="h-11 text-xs sm:h-7"
    >
      {copied ? <Check /> : <Copy />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );

  return (
    <div className="my-3 overflow-hidden rounded-md border border-border">
      {/* Compact reference card — lg and up, alongside ChatView's editor panel. */}
      <div className="hidden items-center justify-between gap-3 bg-muted px-3 py-2.5 lg:flex">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <FileCode className="size-4 shrink-0 text-muted-foreground" />
          <span className="shrink-0 text-muted-foreground">
            {lineCount} {lineCount === 1 ? "line" : "lines"}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {saveButton}
          {copyButton}
        </div>
      </div>

      {/* Full inline code — below lg, where there's no separate editor panel. */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between border-b border-border bg-muted px-3 py-1.5">
          <span className="font-mono text-xs text-muted-foreground">{language || "text"}</span>
          <div className="flex items-center gap-1">
            {saveButton}
            {copyButton}
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
