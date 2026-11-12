"use client";

import { useState, useTransition } from "react";
import { ArrowRight } from "lucide-react";
import { submitEnquiry } from "@/app/apply/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * A closed door until it is asked to open: one quiet button, then a short
 * form, then a single line of acknowledgement.
 */
export function EnquiryForm() {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (sent) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Received. If there is a fit, we will be in touch.
      </p>
    );
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)} className="rounded-full px-5">
        Make an enquiry
        <ArrowRight />
      </Button>
    );
  }

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          setError(null);
          const result = await submitEnquiry(formData);
          if (result.ok) setSent(true);
          else setError(result.error);
        })
      }
      className="relative w-full max-w-md space-y-4 text-left"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="e-name">Name</Label>
          <Input id="e-name" name="name" required autoComplete="name" autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="e-email">Email</Label>
          <Input id="e-email" name="email" type="email" required autoComplete="email" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="e-org">
          Organisation <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input id="e-org" name="organisation" autoComplete="organization" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="e-message">How can we help?</Label>
        <Textarea
          id="e-message"
          name="message"
          required
          minLength={10}
          rows={4}
          placeholder="Strategy development, deployment, or both."
        />
      </div>

      {/* Honeypot: invisible to people, irresistible to form bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="e-website">Website</label>
        <input id="e-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Send"}
      </Button>
    </form>
  );
}
