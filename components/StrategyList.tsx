"use client";

import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import Link from "next/link";
import { BookmarkPlus, Check, Copy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

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
    <Card className="overflow-hidden py-0">
      <div className="flex items-center justify-between border-b border-border bg-muted px-3 py-2">
        <span className="truncate text-sm font-medium">{strategy.title}</span>
        <Button variant="ghost" size="sm" onClick={handleCopy} className="shrink-0 text-xs">
          {copied ? <Check /> : <Copy />}
          {copied ? "Copied" : "Copy"}
        </Button>
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
          overflowX: "auto",
        }}
      >
        {strategy.code}
      </SyntaxHighlighter>
    </Card>
  );
}

/** The saved-strategies library: an empty-state message, or a list of cards. */
export function StrategyList({ strategies }: { strategies: Strategy[] }) {
  if (strategies.length === 0) {
    return (
      <EmptyState
        icon={BookmarkPlus}
        title="No saved strategies yet"
        description="Every script the agent writes has a Save button. Saved ones land here, so you can find them again without scrolling back through a conversation."
        action={
          <Button asChild>
<Link href="/chat">Start a strategy</Link>
</Button>
        }
      />
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
