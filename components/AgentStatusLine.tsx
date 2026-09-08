"use client";

import { AlertTriangle, FileCode, PenLine, SearchCheck, Sparkles } from "lucide-react";
import type { AgentStatus } from "@/lib/agent/generate-response";
import { AGENT_MODELS } from "@/lib/agent/models";
import { cn } from "@/lib/utils";

/**
 * What each stage says. These map one-to-one onto real steps in
 * lib/agent/generate-response.ts — nothing here is a decorative stage
 * invented to make the wait feel busier than it is.
 */
const PHASES = {
  drafting: { label: "Writing the script", icon: PenLine, tone: "muted" },
  retrying: { label: "First model was unavailable — retrying", icon: AlertTriangle, tone: "warn" },
  reviewing: { label: "Checking it against the Pine v6 rules", icon: SearchCheck, tone: "muted" },
  writing: { label: "Sending the reply", icon: FileCode, tone: "muted" },
  done: { label: "Done", icon: Sparkles, tone: "muted" },
} as const;

function modelLabel(id: string | undefined): string | null {
  if (!id) return null;
  return AGENT_MODELS.find((m) => m.id === id)?.label ?? id;
}

/**
 * The agent's current stage, shown while a turn is in flight. Falls back to
 * a neutral line before the first status arrives, so there is never a gap
 * where the user cannot tell whether anything is happening.
 */
export function AgentStatusLine({ status }: { status: AgentStatus | null }) {
  const phase = status ? PHASES[status.phase] : null;
  const Icon = phase?.icon ?? PenLine;
  const label = phase?.label ?? "Thinking";
  const model = modelLabel(status?.model);
  const isWarning = phase?.tone === "warn";

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 px-1 py-1.5 text-xs"
    >
      <span className="relative flex size-2 shrink-0">
        <span
          className={cn(
            "absolute inline-flex size-full animate-ping rounded-full opacity-60",
            isWarning ? "bg-destructive" : "bg-primary",
          )}
        />
        <span
          className={cn(
            "relative inline-flex size-2 rounded-full",
            isWarning ? "bg-destructive" : "bg-primary",
          )}
        />
      </span>
      <Icon className={cn("size-3.5 shrink-0", isWarning ? "text-destructive" : "text-muted-foreground")} />
      <span className={cn("truncate", isWarning ? "text-destructive" : "text-muted-foreground")}>
        {label}
        {status?.detail ? ` — ${status.detail}` : ""}
      </span>
      {model && !isWarning && (
        <span className="ml-auto shrink-0 truncate text-muted-foreground/70">{model}</span>
      )}
    </div>
  );
}
