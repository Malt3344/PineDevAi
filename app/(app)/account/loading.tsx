import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/** Matches the account tabs: a card, then a small grid of stat cards. */
export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border p-6">
        <Skeleton className="h-4 w-36" />
        <SkeletonText className="mt-4 w-full" />
        <Skeleton className="mt-3 h-2 w-full rounded-full" />
        <SkeletonText className="mt-4 w-3/4" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-border p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-7 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}
