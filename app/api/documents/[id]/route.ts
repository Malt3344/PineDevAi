import { NextResponse } from "next/server";
import { getApprovedUser } from "@/lib/gate";
import { listDocumentVersions } from "@/lib/documents";
import { db } from "@/lib/db/client";

/**
 * Every saved version of one document, newest first — backs the version-
 * history dropdown in the editor panel. Scoped to the caller: a document
 * id that exists but belongs to someone else returns an empty list rather
 * than another user's content or a 404 that would reveal the id is real.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;
  const versions = await listDocumentVersions(db, id, gateResult.user.id);

  return NextResponse.json({ versions });
}
