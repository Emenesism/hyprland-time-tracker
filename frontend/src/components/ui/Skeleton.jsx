import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }) {
    return (
        <div
            className={cn(
                'rounded-lg bg-surface-2 animate-pulse',
                className
            )}
            {...props}
        />
    )
}

function SkeletonCard({ className }) {
    return (
        <div className={cn('rounded-xl border border-border bg-surface-1/80 p-6', className)}>
            <div className="flex items-center gap-4 mb-4">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
            </div>
            <Skeleton className="h-3 w-full mb-2" />
            <Skeleton className="h-3 w-4/5" />
        </div>
    )
}

function SkeletonList({ count = 3, className }) {
    return (
        <div className={cn('space-y-4', className)}>
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    )
}

export { Skeleton, SkeletonCard, SkeletonList }
