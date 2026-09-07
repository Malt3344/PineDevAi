"use client";

import { FileCode } from "lucide-react";
import { cn } from "@/lib/utils";

export type SavedStrategy = {
  id: string;
  title: string;
  code: string;
};

/**
 * The workspace file list — real saved strategies from the user's
 * library, each shown as a `.pine` file. Selecting one opens it in the
 * editor panel next to it. "This conversation" is always listed first —
 * it's the live script being discussed, before it's ever saved as a file.
 *
 * Fills whatever box the parent gives it. Where and whether it appears is
 * ChatView's decision, because that is what differs between a phone and a
 * wide screen; the panel itself only renders the list.
 */
export function WorkspacePanel({
  strategies,
  selectedId,
  onSelect,
}: {
  strategies: SavedStrategy[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-sidebar py-3">
      <p className="px-3 pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Workspace
      </p>
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={cn(
          "mx-2 flex items-center gap-1.5 truncate rounded-md px-2 py-1.5 text-left text-xs",
          selectedId === null
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <FileCode className="size-3.5 shrink-0" />
        <span className="truncate">this conversation.pine</span>
      </button>

      {strategies.length > 0 && (
        <div className="mt-2 space-y-0.5 px-2">
          {strategies.map((strategy) => (
            <button
              key={strategy.id}
              type="button"
              onClick={() => onSelect(strategy.id)}
              className={cn(
                "flex w-full items-center gap-1.5 truncate rounded-md px-2 py-1.5 text-left text-xs",
                selectedId === strategy.id
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <FileCode className="size-3.5 shrink-0" />
              <span className="truncate">{strategy.title}.pine</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
