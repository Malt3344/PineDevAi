"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  CreditCard,
  FileCode,
  MessageSquare,
  NotebookText,
  Pencil,
  Plus,
  Search,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { createChat, deleteChat, renameChat } from "@/app/chat/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Conversation = { id: string; title: string };

/** Matches `/chat/[id]`, excluding the two static routes under /chat that
 * are not chats: /chat/strategies and /chat/account (and its subpages). */
function currentChatIdFrom(pathname: string): string | null {
  const match = /^\/chat\/([^/]+)$/.exec(pathname);
  if (!match) return null;
  const id = match[1];
  if (id === "strategies" || id === "account" || id === "connect") return null;
  return id;
}

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
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const currentChatId = currentChatIdFrom(pathname);
  const currentChat = useMemo(
    () =>
      currentChatId
        ? (conversations.find((c) => c.id === currentChatId) ?? { id: currentChatId, title: "" })
        : null,
    [currentChatId, conversations],
  );

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renamePending, setRenamePending] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  async function submitRename(event: FormEvent) {
    event.preventDefault();
    if (!currentChat) return;
    setRenamePending(true);
    try {
      await renameChat(currentChat.id, renameValue);
      setRenameOpen(false);
    } catch {
      toast.error("Could not rename that study.");
    } finally {
      setRenamePending(false);
    }
  }

  async function confirmDelete() {
    if (!currentChat) return;
    setDeletePending(true);
    try {
      await deleteChat(currentChat.id);
      setDeleteOpen(false);
    } catch {
      toast.error("Could not delete that study.");
    } finally {
      setDeletePending(false);
    }
  }

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
        label: "New study",
        hint: "Start validating a new idea",
        icon: Plus,
        run: () => {
          setOpen(false);
          void createChat();
        },
      },
      { id: "desk", label: "Research desk", icon: NotebookText, run: go("/chat") },
      { id: "connect", label: "Connect Claude", icon: User, run: go("/chat/connect") },
      { id: "saved", label: "Script library", icon: FileCode, run: go("/chat/strategies") },
      { id: "usage", label: "Usage", icon: FileCode, run: go("/chat/account/usage") },
      { id: "billing", label: "Billing", icon: CreditCard, run: go("/chat/account/billing") },
      { id: "account", label: "Account settings", icon: User, run: go("/chat/account") },
      ...(currentChat
        ? [
            {
              id: "rename-current",
              label: "Rename this study",
              icon: Pencil,
              run: () => {
                setOpen(false);
                setRenameValue(currentChat.title);
                setRenameOpen(true);
              },
            },
            {
              id: "delete-current",
              label: "Delete this study",
              icon: Trash2,
              run: () => {
                setOpen(false);
                setDeleteOpen(true);
              },
            },
          ]
        : []),
      ...conversations.map((c) => ({
        id: c.id,
        label: c.title || "New study",
        hint: "Open study",
        icon: MessageSquare,
        run: go(`/chat/${c.id}`),
      })),
    ];
  }, [conversations, router, currentChat]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands.slice(0, 8);
    return commands.filter((c) => c.label.toLowerCase().includes(q)).slice(0, 8);
  }, [commands, query]);

  return (
    <>
      {open && (
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
            placeholder="Search studies and actions…"
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
      )}

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <form onSubmit={submitRename}>
            <DialogHeader>
              <DialogTitle>Rename chat</DialogTitle>
              <DialogDescription>Give this chat a name you&apos;ll recognize later.</DialogDescription>
            </DialogHeader>
            <Input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              maxLength={200}
              className="mt-4"
              aria-label="Chat title"
            />
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setRenameOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={renamePending || !renameValue.trim()}>
                {renamePending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{currentChat?.title || "New strategy"}&rdquo; and everything in it will be
              removed. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletePending}
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deletePending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
