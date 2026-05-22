import { Skeleton } from "@/components/ui/skeleton";

/**
 * Generic page loading skeleton — a title bar, a row of stat cards, and a
 * content block. Used as the fallback in route-group `loading.tsx` files
 * so navigation shows an instant, on-brand placeholder instead of a
 * frozen page while the server component streams.
 */
export function PageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Title */}
      <Skeleton className="h-8 w-56" />

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-gray-100 bg-white p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Content block */}
      <div className="rounded-xl border border-gray-100 bg-white p-6">
        <Skeleton className="h-5 w-40" />
        <div className="mt-4 space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
