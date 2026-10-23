"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { FlaskConical, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { deleteStudy, renameStudy } from "@/app/(app)/actions";
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

export type SidebarStudy = { id: string; title: string; createdAt: Date };

/** The user's studies in the rail, grouped by recency, with rename and delete. */
export function SidebarStudies({ studies }: { studies: SidebarStudy[] }) {
  const pathname = usePathname();
  const [renameTarget, setRenameTarget] = useState<SidebarStudy | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SidebarStudy | null>(null);
  const [pending, setPending] = useState(false);

  async function submitRename(event: FormEvent) {
    event.preventDefault();
    if (!renameTarget) return;
    setPending(true);
    try {
      await renameStudy(renameTarget.id, renameValue);
      setRenameTarget(null);
    } catch {
      toast.error("Could not rename that study.");
    } finally {
      setPending(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setPending(true);
    try {
      await deleteStudy(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      toast.error("Could not delete that study.");
    } finally {
      setPending(false);
    }
  }

  if (studies.length === 0) return null;

  const groups = groupChatsByDate(studies);

  return (
    <>
      {CHAT_GROUP_ORDER.filter((label) => groups[label].length > 0).map((label) => (
        <SidebarGroup key={label} className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>{label}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {groups[label].map((study) => {
                const href = `/studies/${study.id}`;
                const title = study.title || "New study";
                return (
                  <SidebarMenuItem key={study.id}>
                    <SidebarMenuButton asChild isActive={pathname === href} tooltip={title}>
                      <Link href={href}>
                        <FlaskConical />
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
                        <DropdownMenuItem
                          onSelect={() => {
                            setRenameValue(study.title);
                            setRenameTarget(study);
                          }}
                        >
                          <Pencil />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onSelect={() => setDeleteTarget(study)}>
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
              aria-label="Study title"
            />
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setRenameTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !renameValue.trim()}>
                {pending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this study?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.title || "New study"}&rdquo; — its hypothesis, script and uploaded
              trades — will be removed. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {pending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
