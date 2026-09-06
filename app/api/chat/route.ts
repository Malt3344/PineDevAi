import { and, eq } from "drizzle-orm";
import { convertToModelMessages, type UIMessage } from "ai";
import { NextResponse } from "next/server";
import { getApprovedUser } from "@/lib/gate";
import { checkDailyCap } from "@/lib/daily-cap";
import { checkMonthlyBudget, recordUsage } from "@/lib/cost-cap";
import { isMessageTooLong, MAX_MESSAGE_LENGTH } from "@/lib/message-limits";
import { insertMessage } from "@/lib/messages";
import { setInitialTitleIfEmpty } from "@/lib/conversations";
import { generateResponse } from "@/lib/agent/generate-response";
import { db } from "@/lib/db/client";
import { conversations } from "@/lib/db/schema";

export const maxDuration = 60;

/** Extracts the plain-text content of the most recent user message. */
function extractLastUserText(messages: UIMessage[]): string | null {
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUserMessage) return null;

  return lastUserMessage.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

/**
 * Handles one chat turn: authenticate, check approval, check the daily
 * cap, persist the user's message, then stream the assistant's reply back
 * (persisting it server-side once generation finishes).
 */
export async function POST(req: Request) {
  // 1. Authenticate + 2. check approval. The client can never assert its
  // own identity — it always comes from the server-side Supabase session.
  const gateResult = await getApprovedUser();

  if (gateResult.status === "unauthenticated") {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }

  if (gateResult.status === "unapproved") {
    return NextResponse.json(
      { error: "Your account is not approved yet. You are on the waitlist." },
      { status: 403 },
    );
  }

  const { user } = gateResult;

  let body: { messages?: UIMessage[]; conversationId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { messages, conversationId } = body;

  if (!conversationId || typeof conversationId !== "string") {
    return NextResponse.json({ error: "Missing conversationId." }, { status: 400 });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Missing messages." }, { status: 400 });
  }

  const userText = extractLastUserText(messages);
  if (!userText) {
    return NextResponse.json({ error: "Empty message." }, { status: 400 });
  }

  if (isMessageTooLong(userText)) {
    return NextResponse.json(
      { error: `Messages are limited to ${MAX_MESSAGE_LENGTH} characters.` },
      { status: 400 },
    );
  }

  // The conversation must belong to this user, and its stored model is the
  // source of truth for which model generates the reply — never a
  // client-supplied value.
  const [conversation] = await db
    .select({ id: conversations.id, model: conversations.model })
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, user.id)));

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  // 3. Two independent limits, both checked before persisting or calling
  // the model. The daily cap bounds request volume; the monthly budget
  // bounds actual spend, which a message count cannot do on its own when
  // models differ by two orders of magnitude in price.
  const cap = await checkDailyCap(db, user.id, user.subscriptionStatus);
  if (!cap.allowed) {
    return NextResponse.json(
      {
        error: `You have reached today's limit of ${cap.cap} messages. Please try again tomorrow.`,
      },
      { status: 429 },
    );
  }

  const budget = await checkMonthlyBudget(db, user.id, user.subscriptionStatus);
  if (!budget.allowed) {
    return NextResponse.json(
      {
        error:
          "You have used this month's included model usage. It resets at the start of next month.",
      },
      { status: 429 },
    );
  }

  // Title the conversation from the first message, before it stops being
  // the first message. No LLM call involved.
  await setInitialTitleIfEmpty(db, conversationId, userText);

  // 4. Persist the user's message before calling the model.
  await insertMessage(db, {
    conversationId,
    userId: user.id,
    role: "user",
    content: userText,
  });

  // 5. Generate and self-review the assistant's reply, persisting it
  // server-side before it streams to the client. The client never writes
  // assistant messages.
  return generateResponse({
    modelId: conversation.model,
    messages: convertToModelMessages(messages),
    onFinish: async ({ text }) => {
      await insertMessage(db, {
        conversationId,
        userId: user.id,
        role: "assistant",
        content: text,
      });
    },
    // Fires once per model call that actually happened — including the
    // review pass, and the fallback model when the primary was skipped.
    onUsage: async (event) => {
      await recordUsage(db, { userId: user.id, ...event });
    },
  });
}
