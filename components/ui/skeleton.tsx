import { cn } from "@/lib/utils";

/**
 * A placeholder shaped like the content that will replace it. Shape is the
 * whole point: a spinner tells you to wait, a skeleton tells you what is
 * coming and reserves its space, so nothing jumps when the data lands.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

/** One line of text. `w` lets a paragraph have believably ragged edges. */
function SkeletonText({ className }: { className?: string }) {
  return <Skeleton className={cn("h-4 w-full", className)} />;
}

export { Skeleton, SkeletonText };
