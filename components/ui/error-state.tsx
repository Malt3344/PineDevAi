"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The shape every failure uses: what broke, the real reason when it is
 * safe to show, and a way to try again. A dead end with no retry is the
 * thing that makes an app feel unfinished.
 */
export function ErrorState({
  title = "Something went wrong",
  description,
  reason,
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  reason?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center px-6 py-12 text-center",
        className,
      )}
    >
      <div className="flex size-11 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10">
        <AlertTriangle className="size-5 text-destructive" />
      </div>
      <p className="mt-4 text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {description ?? "This part of the app failed to load."}
      </p>
      {reason && (
        <p className="mt-3 max-w-sm rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-xs break-words text-muted-foreground">
          {reason}
        </p>
      )}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-5">
          <RotateCw />
          Try again
        </Button>
      )}
    </div>
  );
}
