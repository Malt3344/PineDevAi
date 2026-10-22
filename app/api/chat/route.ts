import { and, eq } from "drizzle-orm";
import { convertToModelMessages, type UIMessage } from "ai";
import { NextResponse } from "next/server";
import { getApprovedUser } from "@/lib/gate";
import { checkDailyCap } from "@/lib/daily-cap";
import { checkMonthlyBudget, recordUsage } from "@/lib/cost-cap";
import { isMessageTooLong, MAX_MESSAGE_LENGTH } from "@/lib/message-limits";
import { insertMessage } from "@/lib/messages";
import { setInitialTitleIfEmpty } from "@/lib/chats";
import { generateResponse } from "@/lib/agent/generate-response";
import { resolveAgentModelId } from "@/lib/agent/models";
import { db } from "@/lib/db/client";
import { loadStudy } from "@/lib/studies";
import { studyContext } from "@/lib/quant/context";
import { chats } from "@/lib/db/schema";

// A turn is two model calls — the draft, then the review pass — and the
// free models measure 30-40s each, so 60s was not enough and every reply
// timed out. Vercel clamps this to whatever the plan allows (60s on Hobby,
// 300s on Pro), so on Hobby the review pass is what has to go, not this
// number.
export const maxDuration = 300;

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
  // own identity — it always comes from the server-side Auth.js session.
  const gateResult = await getApprovedUser();

  if (gateResult.status === "unauthenticated") {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }

  if (gateResult.status === "unapproved") {
    return NextResponse.json(
      { error: "This account is suspended. Contact support if you think this is a mistake." },
      { status: 403 },
    );
  }

  const { user } = gateResult;

  let body: {
    messages?: UIMessage[];
    chatId?: string;
    mode?: unknown;
    thinking?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { messages, chatId } = body;
  // Both come from the client, so both are narrowed rather than trusted.
  const mode = body.mode === "plan" ? "plan" : "act";
  const thinking = body.thinking === true;

  if (!chatId || typeof chatId !== "string") {
    return NextResponse.json({ error: "Missing chatId." }, { status: 400 });
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

  // The chat must belong to this user, and its stored model is the source
  // of truth for which model generates the reply — never a client-supplied
  // value.
  const [chat] = await db
    .select({ id: chats.id, modelId: chats.modelId })
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, user.id)));

  if (!chat) {
    return NextResponse.json({ error: "Chat not found." }, { status: 404 });
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

  // Title the chat from the first message, before it stops being the first
  // message. No LLM call involved.
  await setInitialTitleIfEmpty(db, chatId, userText);

  // 4. Persist the user's message before calling the model.
  await insertMessage(db, {
    chatId,
    userId: user.id,
    role: "user",
    parts: [{ type: "text", text: userText }],
  });

  // 5. Generate and self-review the assistant's reply, persisting it
  // server-side before it streams to the client. The client never writes
  // assistant messages.
  //
  // Every model in the chain can still fail together — an unfunded or
  // misconfigured provider fails identically for all of them. That must
  // reach the user as a diagnosable message, not an unhandled 500.
  // The assistant argues from the study's real hypothesis and numbers.
  // Best-effort: a failure here should cost the context, not the reply.
  let context: string | undefined;
  try {
    const study = await loadStudy(db, chatId, user.id);
    context = studyContext(study.protocol, study.analysis);
  } catch (error) {
    console.warn("Could not load study context", error);
  }

  try {
    return await generateResponse({
      context,
      // Re-validated, not trusted: a chat started on a model that has since
      // been removed from the registry would otherwise fail every request
      // forever. Unknown ids fall back to the current default.
      modelId: resolveAgentModelId(chat.modelId),
      mode,
      thinking,
      messages: convertToModelMessages(messages),
      onFinish: async ({ text, id }) => {
        await insertMessage(db, {
          id,
          chatId,
          userId: user.id,
          role: "assistant",
          parts: [{ type: "text", text }],
        });
      },
      // Fires once per model call that actually happened — including the
      // review pass, and the fallback model when the primary was skipped.
      onUsage: async (event) => {
        await recordUsage(db, { userId: user.id, ...event });
      },
    });
  } catch (error) {
    // The real cause goes to the server log, where it is readable; the
    // client gets something honest but free of internal detail.
    console.error("Chat generation failed", error);
    const isConfig =
      error instanceof Error && /API_KEY is not set|Unknown model id/.test(error.message);

    return NextResponse.json(
      {
        error: isConfig
          ? "The model provider is not configured. This is a server-side problem, not something you did."
          : "The model provider could not be reached. Please try again in a moment.",
      },
      { status: 502 },
    );
  }
}
