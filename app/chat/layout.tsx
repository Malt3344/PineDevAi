import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getApprovedUser } from "@/lib/gate";
import { db } from "@/lib/db/client";
import { chats } from "@/lib/db/schema";
import { CommandPalette } from "@/components/CommandPalette";
import { ConversationSidebar } from "@/components/ConversationSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { signOutAction } from "@/app/chat/actions";
import { Button } from "@/components/ui/button";

const SUPPORT_EMAIL = "hello@pinedev.app";

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

  // Signing up is instant for everyone — there is no manual approval queue.
  // Reaching this branch means an admin has specifically suspended the
  // account (see lib/db/schema.ts's isApproved column), so this reads as a
  // suspension notice, not a "please wait" screen, and offers no way to pay
  // past it — paying for the paid plan is unrelated to this flag.
  if (gate.status === "unapproved") {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center">
        <h1 className="text-lg font-medium">This account is suspended</h1>
        <p className="mt-3 max-w-sm text-sm text-muted-foreground">
          If you think this is a mistake, email{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-foreground underline underline-offset-4"
          >
            {SUPPORT_EMAIL}
          </a>{" "}
          from the address on your account.
        </p>
        <form action={signOutAction} className="mt-6">
          <Button type="submit" variant="ghost">
            Log out
          </Button>
        </form>
      </main>
    );
  }

  const userChats = await db
    .select({
      id: chats.id,
      title: chats.title,
      createdAt: chats.createdAt,
      visibility: chats.visibility,
    })
    .from(chats)
    .where(eq(chats.userId, gate.user.id))
    .orderBy(desc(chats.createdAt));

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
      <CommandPalette conversations={userChats} />
      <ConversationSidebar conversations={userChats} userEmail={gate.user.email} />
      {/* min-h-0: a flex item defaults to min-height:auto and would refuse
          to shrink below its content, growing past the shell instead of
          letting the panes scroll inside themselves. */}
      <SidebarInset className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
