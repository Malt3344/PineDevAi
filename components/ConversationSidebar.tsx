"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LogOut,
  Menu,
  NotebookText,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
} from "lucide-react";
import { createConversation, signOutAction } from "@/app/chat/actions";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { usePersistedState } from "@/lib/use-persisted-state";
import { cn } from "@/lib/utils";

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
  collapsed = false,
}: {
  conversations: Conversation[];
  pathname: string;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  return (
    <>
      <div className={cn("space-y-2", collapsed ? "p-2" : "p-3")}>
        <form action={createConversation}>
          <Button
            type="submit"
            variant="outline"
            aria-label="New chat"
            title={collapsed ? "New chat" : undefined}
            className={cn("w-full", collapsed ? "justify-center px-0" : "justify-start")}
          >
            <Plus />
            {!collapsed && "New chat"}
          </Button>
        </form>
        <Button
          variant={pathname === "/chat/strategies" ? "secondary" : "ghost"}
          aria-label="Saved strategies"
          title={collapsed ? "Saved strategies" : undefined}
          className={cn("w-full", collapsed ? "justify-center px-0" : "justify-start")}
          nativeButton={false}
          render={<Link href="/chat/strategies" onClick={onNavigate} />}
        >
          <NotebookText />
          {!collapsed && "Saved strategies"}
        </Button>
      </div>

      <Separator />

      <ScrollArea className="min-h-0 flex-1 px-2 py-2">
        {conversations.length === 0 ? (
          collapsed ? null : (
            <p className="px-2 py-4 text-sm text-muted-foreground">No conversations yet.</p>
          )
        ) : (
          <ul className="space-y-0.5">
            {conversations.map((conversation) => {
              const href = `/chat/${conversation.id}`;
              const isActive = pathname === href;
              const title = conversation.title || "New chat";
              return (
                <li key={conversation.id}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    aria-label={title}
                    title={collapsed ? title : undefined}
                    className={cn(
                      "w-full truncate font-normal",
                      collapsed ? "justify-center px-0" : "justify-start",
                    )}
                    nativeButton={false}
                    render={<Link href={href} onClick={onNavigate} />}
                  >
                    {collapsed ? (
                      <span aria-hidden="true">{title.slice(0, 1).toUpperCase()}</span>
                    ) : (
                      <span className="truncate">{title}</span>
                    )}
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

function AccountMenu({ userEmail, collapsed = false }: { userEmail: string; collapsed?: boolean }) {
  return (
    <div className={cn("border-t border-border", collapsed ? "p-2" : "p-3")}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              aria-label={userEmail}
              className={cn(
                "w-full gap-2 has-data-[icon=inline-end]:pr-2",
                collapsed ? "justify-center px-0" : "justify-start px-2",
              )}
            />
          }
        >
          <Avatar size="sm">
            <AvatarFallback>{initialsFor(userEmail)}</AvatarFallback>
          </Avatar>
          {!collapsed && <span className="truncate text-sm">{userEmail}</span>}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
              {userEmail}
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href="/chat/account" />}>
            <Settings />
            Account settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <form action={signOutAction}>
            <DropdownMenuItem
              render={<button type="submit" className="w-full" />}
              nativeButton
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
  const [collapsed, setCollapsed] = usePersistedState("pinedev:sidebar-collapsed", false);
  const pathname = usePathname();

  return (
    <>
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(true)}
          aria-label="Open conversation list"
          className="size-11"
        >
          <Menu />
        </Button>
        <Link
          href="/chat"
          className="flex min-h-11 items-center px-3 text-sm font-semibold tracking-tight"
        >
          PineDev
        </Link>
        <div className="size-11" aria-hidden="true" />
      </div>

      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-150 md:flex",
          collapsed ? "w-14" : "w-64",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2 py-4",
            collapsed ? "justify-center px-2" : "px-4",
          )}
        >
          {!collapsed && (
            <Link href="/chat" className="flex-1 truncate text-sm font-semibold tracking-tight">
              PineDev
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </Button>
        </div>
        <SidebarNav conversations={conversations} pathname={pathname} collapsed={collapsed} />
        <AccountMenu userEmail={userEmail} collapsed={collapsed} />
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
