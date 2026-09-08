"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The 500 page. Deliberately standalone rather than reusing ErrorState:
 * this renders when something outside the shell has already failed, so it
 * assumes nothing about the rest of the app being mountable.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled application error", error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center">
      <div className="flex size-11 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10">
        <AlertTriangle className="size-5 text-destructive" />
      </div>
      <p className="mt-4 font-mono text-sm text-muted-foreground">500</p>
      <h1 className="mt-1 text-lg font-medium">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        An unexpected error stopped this page from rendering.
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-xs text-muted-foreground/70">
          Reference: {error.digest}
        </p>
      )}
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" asChild>
<Link href="/chat">Back to your strategies</Link>
</Button>
      </div>
    </main>
  );
}
