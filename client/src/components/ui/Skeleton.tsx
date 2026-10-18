import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden="true" />;
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2.5', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="skeleton h-3.5"
          style={{ width: `${82 - (index % 3) * 14}%` }}
        />
      ))}
    </div>
  );
}

export function PageSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="space-y-5" role="status" aria-label="جارٍ تحميل الصفحة">
      <div className="space-y-3">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-3.5 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }).map((_, index) => (
          <div key={index} className="card p-5">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="mt-4 h-4 w-32" />
            <div className="mt-3">
              <SkeletonText lines={2} />
            </div>
            <Skeleton className="mt-5 h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
      <span className="sr-only">جارٍ تحميل المحتوى…</span>
    </div>
  );
}
