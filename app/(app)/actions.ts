"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { signOut } from "@/lib/auth/auth";
import { getApprovedUser } from "@/lib/gate";
import { db } from "@/lib/db/client";
import { chats } from "@/lib/db/schema";

/** Signs the current user out and sends them back to the landing page. */
export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

/** Renames a study. Scoped to the caller's own studies. */
export async function renameStudy(studyId: string, title: string) {
  const gate = await getApprovedUser();
  if (gate.status !== "approved") throw new Error("Not authorized to rename this study.");

  const trimmed = title.trim().slice(0, 200);
  if (!trimmed) return;

  await db
    .update(chats)
    .set({ title: trimmed })
    .where(and(eq(chats.id, studyId), eq(chats.userId, gate.user.id)));
  revalidatePath("/studies", "layout");
}

/**
 * Deletes a study and everything in it — protocol, uploaded runs — through
 * the schema's ON DELETE CASCADE.
 */
export async function deleteStudy(studyId: string) {
  const gate = await getApprovedUser();
  if (gate.status !== "approved") throw new Error("Not authorized to delete this study.");

  await db.delete(chats).where(and(eq(chats.id, studyId), eq(chats.userId, gate.user.id)));
  revalidatePath("/studies", "layout");
  redirect("/studies");
}
