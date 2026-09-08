import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getApprovedUser } from "@/lib/gate";
import { db } from "@/lib/db/client";
import { conversations } from "@/lib/db/schema";
import { CommandPalette } from "@/components/CommandPalette";
import { ConversationSidebar } from "@/components/ConversationSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { signOutAction } from "@/app/chat/actions";
import { startCheckoutAction } from "@/app/chat/account/billing/actions";
import { Button } from "@/components/ui/button";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Middleware already redirects unauthenticated visitors, but that is a
  // UX convenience only — this server-side check is the real gate, run on
  // every request to anything under /chat.
  const gate = await getApprovedUser();

  if (gate.status === "unauthenticated") {
    redirect("/login");
  }

  if (gate.status === "unapproved") {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center">
        <h1 className="text-lg font-medium">You&apos;re on the waitlist</h1>
        <p className="mt-3 max-w-sm text-sm text-muted-foreground">
          Thanks for signing up. We&apos;re approving accounts manually while we
          scale up &mdash; you&apos;ll get access soon.
        </p>
        <form action={startCheckoutAction} className="mt-6">
          <Button type="submit">Skip the wait — upgrade to Pro</Button>
        </form>
        <form action={signOutAction} className="mt-3">
          <Button type="submit" variant="ghost">
            Log out
          </Button>
        </form>
      </main>
    );
  }

  const userConversations = await db
    .select({ id: conversations.id, title: conversations.title })
    .from(conversations)
    .where(eq(conversations.userId, gate.user.id))
    .orderBy(desc(conversations.createdAt));

  // shadcn's SidebarProvider owns the rail: collapse state (persisted in a
  // cookie so it survives a reload without a flash), the mobile sheet, and
  // the ⌘B shortcut. SidebarInset is the content pane beside it.
  //
  // h-dvh, not vh: on iOS Safari 100vh is the height the page would have if
  // the browser chrome were hidden, which puts the composer behind it. The
  // window itself never scrolls — every pane scrolls inside itself, the way
  // an editor does.
  return (
    <SidebarProvider className="h-dvh min-h-0 overflow-hidden">
      <CommandPalette conversations={userConversations} />
      <ConversationSidebar conversations={userConversations} userEmail={gate.user.email} />
      {/* min-h-0: a flex item defaults to min-height:auto and would refuse
          to shrink below its content, growing past the shell instead of
          letting the panes scroll inside themselves. */}
      <SidebarInset className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
