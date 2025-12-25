import { cn } from '@/lib/utils'

export function Skeleton({ className }) {
    return (
        <div
            className={cn(
                'rounded-2xl bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5',
                'animate-pulse',
                className
            )}
        />
    )
}

export function SkeletonCard({ className }) {
    return (
        <div className={cn(
            'bg-white/50 rounded-3xl border border-primary/10 p-6 space-y-4',
            className
        )}>
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
        </div>
    )
}

export function SkeletonList({ count = 3, className }) {
    return (
        <div className={cn('space-y-4', className)}>
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    )
}
