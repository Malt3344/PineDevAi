"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { MessageSquare, MoreHorizontal, Pencil, Share2, Trash2 } from "lucide-react";
import { deleteChat, renameChat, setChatVisibility } from "@/app/chat/actions";
import { CHAT_GROUP_ORDER, groupChatsByDate } from "@/lib/chats";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export type SidebarChat = {
  id: string;
  title: string;
  createdAt: Date;
  visibility: "private" | "public";
};

/**
 * The sidebar's own chat list, grouped by recency, with a per-row menu for
 * rename/delete/share. Extracted from ConversationSidebar so the shell
 * (header, footer) stays simple and this can be reasoned about — and
 * tested — on its own.
 */
export function SidebarHistory({ chats }: { chats: SidebarChat[] }) {
  const pathname = usePathname();

  const [renameTarget, setRenameTarget] = useState<SidebarChat | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renamePending, setRenamePending] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<SidebarChat | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const [shareChat, setShareChat] = useState<SidebarChat | null>(null);
  const [sharePending, setSharePending] = useState<string | null>(null);

  function openRename(chat: SidebarChat) {
    setRenameValue(chat.title);
    setRenameTarget(chat);
  }

  async function submitRename(event: FormEvent) {
    event.preventDefault();
    if (!renameTarget) return;
    setRenamePending(true);
    try {
      await renameChat(renameTarget.id, renameValue);
      setRenameTarget(null);
    } catch {
      toast.error("Could not rename that study.");
    } finally {
      setRenamePending(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeletePending(true);
    try {
      await deleteChat(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      toast.error("Could not delete that study.");
    } finally {
      setDeletePending(false);
    }
  }

  async function toggleShare(chat: SidebarChat) {
    setSharePending(chat.id);
    const next = chat.visibility === "public" ? "private" : "public";
    try {
      await setChatVisibility(chat.id, next);
      if (next === "public") {
        setShareChat({ ...chat, visibility: "public" });
      } else {
        toast.success("Study is private again.");
      }
    } catch {
      toast.error("Could not change sharing for that study.");
    } finally {
      setSharePending(null);
    }
  }

  async function copyShareLink() {
    if (!shareChat) return;
    const url = `${window.location.origin}/share/${shareChat.id}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  }

  if (chats.length === 0) {
    return (
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>Studies</SidebarGroupLabel>
        <SidebarGroupContent>
          <p className="px-2 py-1.5 text-xs text-muted-foreground">
            Nothing yet. Start one above.
          </p>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  const groups = groupChatsByDate(chats);

  return (
    <>
      {CHAT_GROUP_ORDER.filter((label) => groups[label].length > 0).map((label) => (
        <SidebarGroup key={label} className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>{label}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {groups[label].map((chat) => {
                const href = `/chat/${chat.id}`;
                const title = chat.title || "New study";
                return (
                  <SidebarMenuItem key={chat.id}>
                    <SidebarMenuButton asChild isActive={pathname === href} tooltip={title}>
                      <Link href={href}>
                        <MessageSquare />
                        <span className="truncate">{title}</span>
                      </Link>
                    </SidebarMenuButton>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <SidebarMenuAction showOnHover aria-label={`Actions for ${title}`}>
                          <MoreHorizontal />
                        </SidebarMenuAction>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="right" align="start" className="w-44">
                        <DropdownMenuItem onSelect={() => openRename(chat)}>
                          <Pencil />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={sharePending === chat.id}
                          onSelect={() => void toggleShare(chat)}
                        >
                          <Share2 />
                          {chat.visibility === "public" ? "Make private" : "Share"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => setDeleteTarget(chat)}
                        >
                          <Trash2 />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}

      <Dialog open={renameTarget !== null} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent>
          <form onSubmit={submitRename}>
            <DialogHeader>
              <DialogTitle>Rename study</DialogTitle>
              <DialogDescription>Give this study a name you&apos;ll recognize later.</DialogDescription>
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
              <Button type="button" variant="outline" onClick={() => setRenameTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={renamePending || !renameValue.trim()}>
                {renamePending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this study?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.title || "New study"}&rdquo; — its hypothesis, uploaded runs and
              conversation — will be removed. This can&apos;t be undone.
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

      <Dialog open={shareChat !== null} onOpenChange={(open) => !open && setShareChat(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Study is public</DialogTitle>
            <DialogDescription>
              Anyone with this link can view a read-only copy of this study: its hypothesis, verdict and conversation.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex items-center gap-2">
            <Input
              readOnly
              value={shareChat ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/${shareChat.id}` : ""}
              onFocus={(e) => e.target.select()}
              aria-label="Share link"
            />
            <Button type="button" onClick={copyShareLink}>
              Copy
            </Button>
          </div>
          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => setShareChat(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
