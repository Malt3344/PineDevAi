"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/browser";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Status = "idle" | "loading" | "done" | "error";

/**
 * Lets an already-authenticated user set a new password directly —
 * separate from the "forgot password" email flow, which is for someone
 * who can't sign in at all. Works the same whether they originally
 * signed up with a password or with Google; either way this just sets
 * (or replaces) the password on their account.
 */
export function ChangePasswordForm() {
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

    setPassword("");
    setStatus("done");
    setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
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
          placeholder="Enter a new password"
          className="h-11"
        />
      </div>
      {status === "error" && <p className="text-sm text-destructive">{errorMessage}</p>}
      <Button type="submit" variant="outline" disabled={status === "loading"}>
        {status === "loading" ? "Updating…" : status === "done" ? "Updated" : "Update password"}
      </Button>
    </form>
  );
}
