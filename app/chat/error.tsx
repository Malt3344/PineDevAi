"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/error-state";

/**
 * Failure boundary for everything under /chat. Renders inside the app
 * shell, so the sidebar and navigation survive — the user keeps their
 * place instead of being dropped onto a blank framework page.
 */
export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Chat area failed", error);
  }, [error]);

  return (
    <main className="flex flex-1 items-center justify-center">
      <ErrorState
        title="This page failed to load"
        description="The rest of the app is still working — try again, or pick another conversation."
        reason={error.message}
        onRetry={reset}
      />
    </main>
  );
}
