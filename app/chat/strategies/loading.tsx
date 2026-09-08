import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/** Matches the saved-strategies list: heading, then a stack of code cards. */
export default function Loading() {
  return (
    <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Skeleton className="h-5 w-44" />
        <SkeletonText className="mt-2 w-72" />
        <div className="mt-6 space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="overflow-hidden rounded-lg border border-border">
              <div className="flex items-center justify-between border-b border-border bg-muted px-3 py-2.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-14" />
              </div>
              <div className="space-y-2 p-4">
                {[0, 1, 2, 3, 4].map((j) => (
                  <SkeletonText key={j} className={j % 3 === 0 ? "w-2/3" : "w-11/12"} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
