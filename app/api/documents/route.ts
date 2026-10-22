import { NextResponse } from "next/server";
import { getApprovedUser } from "@/lib/gate";
import { saveStrategy } from "@/lib/strategies";
import { db } from "@/lib/db/client";

/**
 * Saves a code block from the chat into the current user's strategy
 * library. Requires an approved session; the user id always comes from
 * the server-side session, never from the request body.
 */
export async function POST(req: Request) {
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

  let body: { title?: unknown; code?: unknown; conversationId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof body.code !== "string" || !body.code.trim()) {
    return NextResponse.json({ error: "Missing code." }, { status: 400 });
  }

  const title = typeof body.title === "string" && body.title.trim() ? body.title : "Untitled strategy";
  const sourceConversationId =
    typeof body.conversationId === "string" ? body.conversationId : null;

  const saved = await saveStrategy(db, {
    userId: gateResult.user.id,
    title,
    code: body.code,
    sourceConversationId,
  });

  return NextResponse.json({ strategy: saved }, { status: 201 });
}
