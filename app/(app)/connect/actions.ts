"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { getApprovedUser } from "@/lib/gate";
import { disconnectClient } from "@/lib/oauth";

/** Revokes every token one connected Claude holds for the current user. */
export async function disconnectAction(formData: FormData) {
  const gate = await getApprovedUser();
  if (gate.status !== "approved") return;
  const clientId = String(formData.get("client_id") ?? "");
  if (!clientId) return;
  await disconnectClient(db, gate.user.id, clientId);
  revalidatePath("/connect");
}
