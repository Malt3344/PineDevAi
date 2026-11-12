import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getApprovedUser } from "@/lib/gate";
import { db } from "@/lib/db/client";
import { chats } from "@/lib/db/schema";
import { AppSidebar } from "@/components/AppSidebar";
import { Logo } from "@/components/Logo";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { signOutAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";

const SUPPORT_EMAIL = "hello@pinedev.com";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Middleware already redirects unauthenticated visitors, but that is a
  // UX convenience only — this server-side check is the real gate, run on
  // every request to anything in the app.
  const gate = await getApprovedUser();

  if (gate.status === "unauthenticated") {
    redirect("/login");
  }

  // The platform is internal: reaching this branch means the account is
  // not on the team allowlist (lib/access.ts) or has been suspended by hand
  // (lib/db/schema.ts's isApproved column).
  if (gate.status === "unapproved") {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center">
        <h1 className="text-lg font-medium">This account doesn&apos;t have access</h1>
        <p className="mt-3 max-w-sm text-sm text-muted-foreground">
          The PineDev platform is for our team only. If you think this is a mistake, email{" "}
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

  const studies = await db
    .select({ id: chats.id, title: chats.title, createdAt: chats.createdAt })
    .from(chats)
    .where(eq(chats.userId, gate.user.id))
    .orderBy(desc(chats.createdAt));

  // shadcn's SidebarProvider owns the rail: collapse state (persisted in a
  // cookie so it survives a reload without a flash), the mobile sheet, and
  // the ⌘B shortcut. SidebarInset is the content pane beside it.
  //
  // h-dvh, not vh: on iOS Safari 100vh is the height the page would have if
  // the browser chrome were hidden. The window itself never scrolls; the
  // content pane scrolls inside itself.
  return (
    <SidebarProvider className="h-dvh min-h-0 overflow-hidden">
      <AppSidebar studies={studies} userEmail={gate.user.email} />
      {/* min-h-0: a flex item defaults to min-height:auto and would refuse
          to shrink below its content, growing past the shell instead of
          letting the panes scroll inside themselves. */}
      <SidebarInset className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {/* Phones only: the rail is a sheet there, and this opens it. */}
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3 md:hidden">
          <SidebarTrigger />
          <Logo size={24} />
        </div>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
