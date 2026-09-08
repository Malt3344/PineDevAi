"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, MessageSquare, NotebookText, Plus, Settings } from "lucide-react";
import { createConversation, signOutAction } from "@/app/chat/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

type Conversation = { id: string; title: string };

function initialsFor(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

/**
 * The workspace rail, built on shadcn's own Sidebar block rather than
 * hand-rolled chrome: collapse-to-icon, the mobile sheet, keyboard
 * shortcut, rail drag and the cookie that remembers the state all come
 * with it. What is ours is the content — the user's strategies.
 */
export function ConversationSidebar({
  conversations,
  userEmail,
}: {
  conversations: Conversation[];
  userEmail: string;
}) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/chat">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <NotebookText className="size-4" />
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold">PineDev</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Pine Script v6
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <form action={createConversation}>
                  <SidebarMenuButton
                    type="submit"
                    tooltip="New strategy"
                    className="bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
                  >
                    <Plus />
                    <span>New strategy</span>
                  </SidebarMenuButton>
                </form>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Saved strategies"
                  isActive={pathname === "/chat/strategies"}
                >
                  <Link href="/chat/strategies">
                    <NotebookText />
                    <span>Saved strategies</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Strategies</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {conversations.length === 0 ? (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">
                  Nothing yet. Start one above.
                </p>
              ) : (
                conversations.map((conversation) => {
                  const href = `/chat/${conversation.id}`;
                  const title = conversation.title || "New strategy";
                  return (
                    <SidebarMenuItem key={conversation.id}>
                      <SidebarMenuButton asChild isActive={pathname === href} tooltip={title}>
                        <Link href={href}>
                          <MessageSquare />
                          <span className="truncate">{title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" tooltip={userEmail}>
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">
                      {initialsFor(userEmail)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm">{userEmail}</span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="w-56">
                <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
                  {userEmail}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/chat/account">
                    <Settings />
                    Account settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <form action={signOutAction}>
                  <DropdownMenuItem asChild variant="destructive">
                    <button type="submit" className="w-full">
                      <LogOut />
                      Log out
                    </button>
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
