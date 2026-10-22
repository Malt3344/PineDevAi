"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

/** A command or URL the user is meant to paste somewhere else, with one-click copy. */
export function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-background/60 py-1 pr-1 pl-3">
      <code className="min-w-0 flex-1 truncate font-mono text-[0.8125rem]" title={value}>
        {value}
      </code>
      <Button variant="ghost" size="sm" onClick={copy} aria-label={`Copy ${label}`} className="shrink-0">
        {copied ? <Check /> : <Copy />}
        <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
      </Button>
    </div>
  );
}
