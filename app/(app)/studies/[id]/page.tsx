import { and, asc, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import type { UIMessage } from "ai";
import { getApprovedUser } from "@/lib/gate";
import { db } from "@/lib/db/client";
import { chats, messages } from "@/lib/db/schema";
import { resolveAgentModelId } from "@/lib/agent/models";
import { ChatView } from "@/components/ChatView";
import { loadStudy } from "@/lib/studies";

/**
 * One study. Verifies the chat belongs to the current user before loading
 * any of it, runs the protocol analysis server-side (it is deterministic,
 * so it is recomputed rather than cached), then hands everything to the
 * client-side ChatView.
 */
export default async function ChatPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = await params;

  // Independently re-validated here (not just in the layout) because this
  // page needs the user's id to enforce chat ownership.
  const gate = await getApprovedUser();

  if (gate.status === "unauthenticated") {
    redirect("/login");
  }

  if (gate.status === "unapproved") {
    redirect("/chat");
  }

  const [chat] = await db
    .select({ id: chats.id, modelId: chats.modelId, title: chats.title })
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, gate.user.id)));

  if (!chat) {
    notFound();
  }

  const [rows, study] = await Promise.all([
    db
      .select({ id: messages.id, role: messages.role, parts: messages.parts })
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(asc(messages.createdAt)),
    loadStudy(db, chatId, gate.user.id),
  ]);

  const initialMessages: UIMessage[] = rows.map((row) => ({
    id: row.id,
    role: row.role,
    parts: row.parts as UIMessage["parts"],
  }));

  return (
    <ChatView
      chatId={chatId}
      chatTitle={chat.title}
      initialMessages={initialMessages}
      modelId={resolveAgentModelId(chat.modelId)}
      study={{ protocol: study.protocol, analysis: study.analysis }}
    />
  );
}
