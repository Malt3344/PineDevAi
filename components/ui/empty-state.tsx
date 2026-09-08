import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The shape every empty list, panel and chart uses: what this is, why it
 * is empty, and the one thing to do about it. An empty panel with no
 * explanation reads as broken; this is the difference between "nothing
 * here yet" and "something went wrong".
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-12 text-center",
        className,
      )}
    >
      <div className="flex size-11 items-center justify-center rounded-lg border border-border bg-muted/40">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <p className="mt-4 text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
