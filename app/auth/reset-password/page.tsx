"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Status = "idle" | "loading" | "done" | "error";

/**
 * Where a password-reset email link lands (via /auth/callback, which
 * exchanges the recovery code for a session first). The user is already
 * authenticated by the time they reach this page — they just need to set
 * a new password to replace the one they forgot.
 */
export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setStatus("done");
  }

  if (status === "done") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <div className="w-full max-w-sm text-center">
          <Link href="/" className="mb-10 block text-lg font-semibold tracking-tight">
            PineDev
          </Link>
          <Card>
            <CardContent className="text-center">
              <p className="text-sm font-medium text-foreground">Password updated</p>
              <p className="mt-2 text-sm text-muted-foreground">
                You&apos;re signed in with your new password.
              </p>
              <Button className="mt-4 w-full" asChild>
<Link href="/chat">Go to chat</Link>
</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-10 block text-center text-lg font-semibold tracking-tight"
        >
          PineDev
        </Link>
        <h1 className="text-center text-lg font-medium">Set a new password</h1>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your new password"
              className="h-11"
            />
          </div>
          {status === "error" && (
            <p className="text-sm text-destructive">{errorMessage}</p>
          )}
          <Button type="submit" disabled={status === "loading"} className="w-full h-11">
            {status === "loading" ? "Updating…" : "Update password"}
          </Button>
        </form>
      </div>
    </main>
  );
}
