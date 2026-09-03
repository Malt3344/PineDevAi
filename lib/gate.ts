import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";

export type ApprovedUser = {
  id: string;
  email: string;
};

export type GateResult =
  | { status: "approved"; user: ApprovedUser }
  | { status: "unauthenticated" }
  | { status: "unapproved"; user: ApprovedUser };

/**
 * The single source of truth for "is this request allowed to use the
 * product". Every server entry point that touches chat data calls this
 * itself — middleware redirecting unauthenticated visitors is only a UX
 * convenience and is never relied on for security.
 *
 * Today this checks the profiles.isApproved column. If billing is added
 * later, only this function needs to change.
 */
export async function getApprovedUser(): Promise<GateResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return { status: "unauthenticated" };
  }

  const [profile] = await db
    .select({ isApproved: profiles.isApproved })
    .from(profiles)
    .where(eq(profiles.id, user.id));

  const approvedUser: ApprovedUser = { id: user.id, email: user.email };

  if (!profile?.isApproved) {
    return { status: "unapproved", user: approvedUser };
  }

  return { status: "approved", user: approvedUser };
}
