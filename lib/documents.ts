import { and, desc, eq } from "drizzle-orm";
import type { db as Db } from "@/lib/db/client";
import { documents } from "@/lib/db/schema";

const MAX_TITLE_LENGTH = 80;

export type SaveDocumentInput = {
  userId: string;
  title: string;
  code: string;
  chatId?: string | null;
};

/**
 * Saves a Pine Script snippet to the user's document library, independent
 * of the chat it came from. `chatId` is kept only as a soft reference for
 * traceability; deleting that chat later does not delete the saved
 * document (the column is set null on delete).
 *
 * `documents` has a composite (id, createdAt) primary key so a later "save
 * a new version of this document" path can reuse an id with a fresh
 * createdAt. There's no versioning UI wired up yet, so for now every call
 * here is an independent new document — a fresh id, generated explicitly
 * rather than left to the column's own default, so that later path has an
 * id to reuse.
 */
export async function saveDocument(db: typeof Db, input: SaveDocumentInput) {
  const [row] = await db
    .insert(documents)
    .values({
      id: crypto.randomUUID(),
      userId: input.userId,
      title: input.title.slice(0, MAX_TITLE_LENGTH) || "Untitled strategy",
      content: input.code,
      chatId: input.chatId ?? null,
    })
    .returning();

  return row;
}

/** Lists a user's saved documents, most recently saved first. */
export async function listDocuments(db: typeof Db, userId: string) {
  return db
    .select()
    .from(documents)
    .where(eq(documents.userId, userId))
    .orderBy(desc(documents.createdAt));
}

export type SaveDocumentVersionInput = SaveDocumentInput & {
  /** The existing document's id — this version reuses it rather than
   * generating a new one, which is what makes it a version of the same
   * document instead of an unrelated new one. */
  id: string;
};

/**
 * Saves a new version of an existing document: same `id`, a fresh
 * `createdAt` (the composite primary key), so the previous version is
 * kept rather than overwritten. Callers are expected to have already
 * confirmed the id belongs to this user — this does not re-check, the
 * same way `saveDocument` does not check anything about the id it mints.
 */
export async function saveDocumentVersion(db: typeof Db, input: SaveDocumentVersionInput) {
  const [row] = await db
    .insert(documents)
    .values({
      id: input.id,
      userId: input.userId,
      title: input.title.slice(0, MAX_TITLE_LENGTH) || "Untitled strategy",
      content: input.code,
      chatId: input.chatId ?? null,
    })
    .returning();

  return row;
}

/**
 * Every version of one document, newest first — the source for the
 * version-history dropdown. Scoped to `userId` so one user can never list
 * another's versions by guessing an id.
 */
export async function listDocumentVersions(db: typeof Db, id: string, userId: string) {
  return db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, userId)))
    .orderBy(desc(documents.createdAt));
}
