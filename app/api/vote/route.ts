import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getApprovedUser } from "@/lib/gate";
import { db } from "@/lib/db/client";
import { chats, messages, votes } from "@/lib/db/schema";

/** Confirms the chat belongs to the caller. Returns it, or null if not. */
async function ownedChat(userId: string, chatId: string) {
  const [chat] = await db
    .select({ id: chats.id })
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)));
  return chat ?? null;
}

/**
 * Lists this chat's votes. Scoped to the caller: the chat must belong to
 * them, the same ownership check every chat-scoped route makes.
 */
export async function GET(req: Request) {
  const gateResult = await getApprovedUser();

  if (gateResult.status === "unauthenticated") {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }
  if (gateResult.status === "unapproved") {
    return NextResponse.json(
      { error: "Your account is not approved yet." },
      { status: 403 },
    );
  }

  const chatId = new URL(req.url).searchParams.get("chatId");
  if (!chatId) {
    return NextResponse.json({ error: "Missing chatId." }, { status: 400 });
  }

  const chat = await ownedChat(gateResult.user.id, chatId);
  if (!chat) {
    return NextResponse.json({ error: "Chat not found." }, { status: 404 });
  }

  const rows = await db
    .select({ messageId: votes.messageId, isUpvoted: votes.isUpvoted })
    .from(votes)
    .where(eq(votes.chatId, chatId));

  return NextResponse.json({ votes: rows });
}

/**
 * Upserts one message's vote. Both the chat and the message must belong to
 * the caller — a message id from another chat (even the caller's own) is
 * rejected, since a vote is scoped to the (chatId, messageId) pair.
 *
 * Toggling the same vote again does not un-vote here — that's DELETE's
 * job (see below). PATCH always sets the vote to exactly the value given.
 */
export async function PATCH(req: Request) {
  const gateResult = await getApprovedUser();

  if (gateResult.status === "unauthenticated") {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }
  if (gateResult.status === "unapproved") {
    return NextResponse.json(
      { error: "Your account is not approved yet." },
      { status: 403 },
    );
  }

  let body: { chatId?: unknown; messageId?: unknown; isUpvoted?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { chatId, messageId, isUpvoted } = body;
  if (
    typeof chatId !== "string" ||
    typeof messageId !== "string" ||
    typeof isUpvoted !== "boolean"
  ) {
    return NextResponse.json({ error: "Missing chatId, messageId or isUpvoted." }, { status: 400 });
  }

  const chat = await ownedChat(gateResult.user.id, chatId);
  if (!chat) {
    return NextResponse.json({ error: "Chat not found." }, { status: 404 });
  }

  const [message] = await db
    .select({ id: messages.id })
    .from(messages)
    .where(and(eq(messages.id, messageId), eq(messages.chatId, chatId)));
  if (!message) {
    return NextResponse.json({ error: "Message not found." }, { status: 404 });
  }

  await db
    .insert(votes)
    .values({ chatId, messageId, isUpvoted })
    .onConflictDoUpdate({ target: [votes.chatId, votes.messageId], set: { isUpvoted } });

  return NextResponse.json({ ok: true });
}

/**
 * Removes a vote entirely — the "un-vote" path. Toggling a thumbs button
 * that is already active calls this instead of PATCH, returning the
 * message to its neutral, unvoted state rather than cycling between up
 * and down.
 */
export async function DELETE(req: Request) {
  const gateResult = await getApprovedUser();

  if (gateResult.status === "unauthenticated") {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }
  if (gateResult.status === "unapproved") {
    return NextResponse.json(
      { error: "Your account is not approved yet." },
      { status: 403 },
    );
  }

  let body: { chatId?: unknown; messageId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { chatId, messageId } = body;
  if (typeof chatId !== "string" || typeof messageId !== "string") {
    return NextResponse.json({ error: "Missing chatId or messageId." }, { status: 400 });
  }

  const chat = await ownedChat(gateResult.user.id, chatId);
  if (!chat) {
    return NextResponse.json({ error: "Chat not found." }, { status: 404 });
  }

  await db
    .delete(votes)
    .where(and(eq(votes.chatId, chatId), eq(votes.messageId, messageId)));

  return NextResponse.json({ ok: true });
}
