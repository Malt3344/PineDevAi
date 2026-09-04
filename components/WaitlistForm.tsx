"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Status = "idle" | "loading" | "success" | "error";

/**
 * Email capture form for the Pro (coming-soon) tier's waitlist, posting
 * to /api/waitlist. Always stacked vertically — it lives inside a narrow
 * pricing card, not a wide page section.
 */
export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim()) {
      setStatus("error");
      setMessage("Please enter your email address.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setStatus("success");
      setMessage(data.message ?? "You are on the waitlist.");
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div
        role="status"
        className="flex w-full items-center justify-center rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary"
      >
        {message}
      </div>
    );
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
        <Label htmlFor="waitlist-email" className="sr-only">
          Email address
        </Label>
        <Input
          id="waitlist-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="h-11"
        />
        <Button type="submit" disabled={status === "loading"} className="h-11 w-full">
          {status === "loading" ? "Joining…" : "Join waitlist"}
        </Button>
      </form>
      {status === "error" && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {message}
        </p>
      )}
    </div>
  );
}
