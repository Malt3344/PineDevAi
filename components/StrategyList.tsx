"use client";

import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

type Strategy = {
  id: string;
  title: string;
  code: string;
  createdAt: string;
};

/** A single saved strategy: title, code, and a one-click copy action. */
function StrategyCard({ strategy }: { strategy: Strategy }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(strategy.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="flex items-center justify-between border-b border-border bg-surface-2 px-3 py-2">
        <span className="truncate text-sm font-medium">{strategy.title}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 rounded px-2 py-1 text-xs text-muted hover:bg-surface hover:text-foreground"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        language="pine"
        style={oneDark}
        customStyle={{
          margin: 0,
          background: "transparent",
          fontSize: "0.8rem",
          padding: "1rem",
          maxHeight: "16rem",
        }}
      >
        {strategy.code}
      </SyntaxHighlighter>
    </div>
  );
}

/** The saved-strategies library: an empty-state message, or a list of cards. */
export function StrategyList({ strategies }: { strategies: Strategy[] }) {
  if (strategies.length === 0) {
    return (
      <p className="text-sm text-muted">
        No saved strategies yet. Save a script from the chat with the
        &quot;Save strategy&quot; button on any code block.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {strategies.map((strategy) => (
        <StrategyCard key={strategy.id} strategy={strategy} />
      ))}
    </div>
  );
}
