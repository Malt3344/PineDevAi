"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, NotebookText, Plus, Settings } from "lucide-react";
import { createConversation, signOutAction } from "@/app/chat/actions";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

type Conversation = {
  id: string;
  title: string;
};

function initialsFor(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

function SidebarNav({
  conversations,
  pathname,
  onNavigate,
}: {
  conversations: Conversation[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="space-y-2 p-3">
        <form action={createConversation}>
          <Button type="submit" variant="outline" className="w-full justify-start">
            <Plus />
            New chat
          </Button>
        </form>
        <Button
          variant={pathname === "/chat/strategies" ? "secondary" : "ghost"}
          className="w-full justify-start"
          nativeButton={false}
          render={<Link href="/chat/strategies" onClick={onNavigate} />}
        >
          <NotebookText />
          Saved strategies
        </Button>
      </div>

      <Separator />

      <ScrollArea className="flex-1 px-2 py-2">
        {conversations.length === 0 ? (
          <p className="px-2 py-4 text-sm text-muted-foreground">No conversations yet.</p>
        ) : (
          <ul className="space-y-0.5">
            {conversations.map((conversation) => {
              const href = `/chat/${conversation.id}`;
              const isActive = pathname === href;
              return (
                <li key={conversation.id}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className="w-full justify-start truncate font-normal"
                    nativeButton={false}
                    render={<Link href={href} onClick={onNavigate} />}
                  >
                    <span className="truncate">{conversation.title || "New chat"}</span>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
    </>
  );
}

function AccountMenu({ userEmail }: { userEmail: string }) {
  return (
    <div className="border-t border-border p-3">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 px-2 has-data-[icon=inline-end]:pr-2"
            />
          }
        >
          <Avatar size="sm">
            <AvatarFallback>{initialsFor(userEmail)}</AvatarFallback>
          </Avatar>
          <span className="truncate text-sm">{userEmail}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
            {userEmail}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href="/chat/account" />}>
            <Settings />
            Account settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <form action={signOutAction}>
            <DropdownMenuItem
              render={<button type="submit" className="w-full" />}
              variant="destructive"
            >
              <LogOut />
              Log out
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/**
 * The chat navigation rail: new-chat action, saved-strategies link,
 * conversation list, and account menu (email + sign out). Renders as a
 * fixed rail on desktop and a slide-out sheet on narrow screens.
 */
export function ConversationSidebar({
  conversations,
  userEmail,
}: {
  conversations: Conversation[];
  userEmail: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(true)}
          aria-label="Open conversation list"
        >
          <Menu />
        </Button>
        <Link href="/chat" className="text-sm font-semibold tracking-tight">
          PineDev
        </Link>
        <div className="w-8" aria-hidden="true" />
      </div>

      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
        <div className="flex items-center px-4 py-4">
          <Link href="/chat" className="text-sm font-semibold tracking-tight">
            PineDev
          </Link>
        </div>
        <SidebarNav conversations={conversations} pathname={pathname} />
        <AccountMenu userEmail={userEmail} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="flex w-72 flex-col p-0">
          <SheetTitle className="sr-only">Conversations</SheetTitle>
          <div className="flex items-center px-4 py-4">
            <span className="text-sm font-semibold tracking-tight">PineDev</span>
          </div>
          <SidebarNav
            conversations={conversations}
            pathname={pathname}
            onNavigate={() => setMobileOpen(false)}
          />
          <AccountMenu userEmail={userEmail} />
        </SheetContent>
      </Sheet>
    </>
  );
}
