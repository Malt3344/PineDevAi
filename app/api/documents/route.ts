import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getApprovedUser } from "@/lib/gate";
import { saveDocument, saveDocumentVersion } from "@/lib/documents";
import { db } from "@/lib/db/client";
import { documents } from "@/lib/db/schema";

/**
 * Saves a code block from the chat into the current user's document
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

  let body: { title?: unknown; code?: unknown; chatId?: unknown; id?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof body.code !== "string" || !body.code.trim()) {
    return NextResponse.json({ error: "Missing code." }, { status: 400 });
  }

  const title = typeof body.title === "string" && body.title.trim() ? body.title : "Untitled strategy";
  const chatId = typeof body.chatId === "string" ? body.chatId : null;
  const requestedId = typeof body.id === "string" ? body.id : null;

  // A second (or later) save in the same editing session reuses the
  // document's id, so this becomes a new version instead of a new,
  // unrelated document. An id that does not belong to this user (or does
  // not exist at all) is silently treated like no id was sent — it looks
  // and behaves like a fresh save rather than erroring.
  let owns = false;
  if (requestedId) {
    const [existing] = await db
      .select({ id: documents.id })
      .from(documents)
      .where(and(eq(documents.id, requestedId), eq(documents.userId, gateResult.user.id)));
    owns = Boolean(existing);
  }

  const saved = owns
    ? await saveDocumentVersion(db, {
        id: requestedId as string,
        userId: gateResult.user.id,
        title,
        code: body.code,
        chatId,
      })
    : await saveDocument(db, {
        userId: gateResult.user.id,
        title,
        code: body.code,
        chatId,
      });

  return NextResponse.json({ document: saved }, { status: 201 });
}
