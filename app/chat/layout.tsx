import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getApprovedUser } from "@/lib/gate";
import { db } from "@/lib/db/client";
import { conversations } from "@/lib/db/schema";
import { ConversationSidebar } from "@/components/ConversationSidebar";
import { signOutAction } from "@/app/chat/actions";

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
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <h1 className="text-lg font-medium">You&apos;re on the waitlist</h1>
        <p className="mt-3 max-w-sm text-sm text-muted">
          Thanks for signing up. We&apos;re approving accounts manually while we
          scale up &mdash; you&apos;ll get access soon.
        </p>
        <form action={signOutAction} className="mt-6">
          <button
            type="submit"
            className="text-sm text-muted underline-offset-2 hover:text-foreground hover:underline"
          >
            Log out
          </button>
        </form>
      </main>
    );
  }

  const userConversations = await db
    .select({ id: conversations.id, title: conversations.title })
    .from(conversations)
    .where(eq(conversations.userId, gate.user.id))
    .orderBy(desc(conversations.createdAt));

  return (
    <div className="flex min-h-screen bg-background">
      <ConversationSidebar conversations={userConversations} userEmail={gate.user.email} />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
