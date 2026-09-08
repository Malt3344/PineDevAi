"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, FileCode, MessageSquare, NotebookText, Plus, Search, User } from "lucide-react";
import { createConversation } from "@/app/chat/actions";
import { cn } from "@/lib/utils";

type Conversation = { id: string; title: string };

type Command = {
  id: string;
  label: string;
  hint?: string;
  icon: typeof Search;
  run: () => void;
};

/**
 * Keyboard-first navigation: ⌘K anywhere, type, Enter. Conversations grow
 * without bound while the sidebar does not, so scanning a list stops being
 * a way to find anything fairly quickly — this is what replaces it.
 *
 * Deliberately plain: an input, a filtered list, and arrow keys. Nothing
 * here needs a combobox library.
 */
export function CommandPalette({ conversations }: { conversations: Conversation[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Reset between openings, so it never reopens mid-search from last time.
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const go = (href: string) => () => {
      setOpen(false);
      router.push(href);
    };
    return [
      {
        id: "new",
        label: "New strategy",
        hint: "Start a fresh conversation",
        icon: Plus,
        run: () => {
          setOpen(false);
          void createConversation();
        },
      },
      { id: "saved", label: "Saved strategies", icon: NotebookText, run: go("/chat/strategies") },
      { id: "usage", label: "Usage", icon: FileCode, run: go("/chat/account/usage") },
      { id: "billing", label: "Billing", icon: CreditCard, run: go("/chat/account/billing") },
      { id: "account", label: "Account settings", icon: User, run: go("/chat/account") },
      ...conversations.map((c) => ({
        id: c.id,
        label: c.title || "New strategy",
        hint: "Open strategy",
        icon: MessageSquare,
        run: go(`/chat/${c.id}`),
      })),
    ];
  }, [conversations, router]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands.slice(0, 8);
    return commands.filter((c) => c.label.toLowerCase().includes(q)).slice(0, 8);
  }, [commands, query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[12vh]"
      onClick={() => setOpen(false)}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-popover shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(i + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                results[active]?.run();
              }
            }}
            placeholder="Search strategies and actions…"
            aria-label="Search strategies and actions"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-[0.65rem] text-muted-foreground">
            esc
          </kbd>
        </div>

        {results.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Nothing matches “{query}”.
          </p>
        ) : (
          <ul className="max-h-80 overflow-y-auto p-1.5">
            {results.map((command, i) => {
              const Icon = command.icon;
              return (
                <li key={command.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={command.run}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm",
                      i === active ? "bg-muted text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{command.label}</span>
                    {command.hint && (
                      <span className="shrink-0 text-xs text-muted-foreground/70">
                        {command.hint}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
