"use server";

import { hash } from "bcrypt-ts";
import { eq } from "drizzle-orm";
import { getApprovedUser } from "@/lib/gate";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export type ChangePasswordResult = { ok: true } | { ok: false; error: string };

/**
 * Sets (or replaces) the signed-in user's password directly — separate from
 * the "forgot password" support-email flow, which is for someone who can't
 * sign in at all. Works the same whether they originally signed up with a
 * password or with Google; either way this just sets the password on their
 * account, so Google-only users gain a password login too.
 */
export async function changePasswordAction(password: string): Promise<ChangePasswordResult> {
  const gate = await getApprovedUser();
  if (gate.status === "unauthenticated") {
    return { ok: false, error: "You need to be signed in to do that." };
  }

  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  const passwordHash = await hash(password, 10);
  await db.update(users).set({ passwordHash }).where(eq(users.id, gate.user.id));

  return { ok: true };
}
