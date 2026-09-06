import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getApprovedUser } from "@/lib/gate";
import { db } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";
import { signOutAction } from "@/app/chat/actions";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/** Profile tab: account identity, approval status, and sign out. */
export default async function ProfilePage() {
  const gate = await getApprovedUser();

  if (gate.status !== "approved") {
    redirect("/login");
  }

  const [profile] = await db
    .select({ createdAt: profiles.createdAt })
    .from(profiles)
    .where(eq(profiles.id, gate.user.id));

  const memberSince = profile?.createdAt
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(profile.createdAt)
    : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="text-sm">{gate.user.email}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge variant="secondary" className="mt-1 text-primary">
              Approved
            </Badge>
          </div>
          {memberSince && (
            <div>
              <p className="text-sm text-muted-foreground">Member since</p>
              <p className="text-sm">{memberSince}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Set or change your password. If you signed in with Google, this adds a
            password as an alternate way in.
          </p>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Sign out of PineDev on this device.
          </p>
          <form action={signOutAction}>
            <Button type="submit" variant="outline">
              Log out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
