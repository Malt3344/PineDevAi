"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, FlaskConical, LayoutDashboard, LogOut, NotebookText, Plug, Plus, Settings } from "lucide-react";
import { createChat, signOutAction } from "@/app/chat/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarHistory, type SidebarChat } from "@/components/sidebar-history";
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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

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
  conversations: SidebarChat[];
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
                  <FlaskConical className="size-4" />
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold">PineDev</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Strategy validation
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
                <form action={createChat}>
                  <SidebarMenuButton
                    type="submit"
                    tooltip="New study"
                    className="bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
                  >
                    <Plus />
                    <span>New study</span>
                  </SidebarMenuButton>
                </form>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Connect Claude" isActive={pathname === "/chat/connect"}>
                  <Link href="/chat/connect">
                    <Plug />
                    <span>Connect Claude</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Research desk" isActive={pathname === "/chat"}>
                  <Link href="/chat">
                    <LayoutDashboard />
                    <span>Research desk</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Script library"
                  isActive={pathname === "/chat/strategies"}
                >
                  <Link href="/chat/strategies">
                    <NotebookText />
                    <span>Script library</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Methodology">
                  <Link href="/methodology">
                    <BookOpen />
                    <span>Methodology</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarHistory chats={conversations} />
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
