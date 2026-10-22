"use server";

import { hash } from "bcrypt-ts";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export type RegisterResult = { ok: true } | { ok: false; error: string };

/**
 * Creates a new password-based account. Does not sign the user in — the
 * caller (the login page) does that immediately after via next-auth/react's
 * client-side signIn("credentials", ...), so there's exactly one place that
 * turns credentials into a session.
 */
export async function registerAction(email: string, password: string): Promise<RegisterResult> {
  const normalizedEmail = email.toLowerCase().trim();

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail));

  if (existing) {
    return { ok: false, error: "An account with that email already exists." };
  }

  const passwordHash = await hash(password, 10);
  await db.insert(users).values({ email: normalizedEmail, passwordHash });

  return { ok: true };
}
