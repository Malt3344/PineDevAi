import { and, asc, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import type { UIMessage } from "ai";
import { getApprovedUser } from "@/lib/gate";
import { db } from "@/lib/db/client";
import { conversations, messages } from "@/lib/db/schema";
import { AGENT_MODELS } from "@/lib/agent/models";
import { ChatView } from "@/components/ChatView";

/**
 * The active conversation view. Verifies the conversation belongs to the
 * current user before loading any of its messages, then hands both off to
 * the client-side ChatView for streaming interaction.
 */
export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;

  // Independently re-validated here (not just in the layout) because this
  // page needs the user's id to enforce conversation ownership.
  const gate = await getApprovedUser();

  if (gate.status === "unauthenticated") {
    redirect("/login");
  }

  if (gate.status === "unapproved") {
    redirect("/chat");
  }

  const [conversation] = await db
    .select({ id: conversations.id, model: conversations.model })
    .from(conversations)
    .where(
      and(eq(conversations.id, conversationId), eq(conversations.userId, gate.user.id)),
    );

  if (!conversation) {
    notFound();
  }

  const rows = await db
    .select({ id: messages.id, role: messages.role, content: messages.content })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));

  const initialMessages: UIMessage[] = rows.map((row) => ({
    id: row.id,
    role: row.role,
    parts: [{ type: "text", text: row.content }],
  }));

  const modelLabel =
    AGENT_MODELS.find((model) => model.id === conversation.model)?.label ??
    conversation.model;

  return (
    <ChatView
      conversationId={conversationId}
      initialMessages={initialMessages}
      modelLabel={modelLabel}
    />
  );
}
