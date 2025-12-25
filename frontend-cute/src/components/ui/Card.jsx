import { cn } from '@/lib/utils'

export function Card({ className, children, glow, ...props }) {
    return (
        <div
            className={cn(
                'bg-white/80 backdrop-blur-sm rounded-3xl border border-primary/10',
                'p-6 shadow-cute transition-all duration-300',
                glow && 'glow-pink',
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}

export function CardHeader({ className, children }) {
    return (
        <div className={cn('mb-5', className)}>
            {children}
        </div>
    )
}

export function CardTitle({ className, children, emoji = '✨' }) {
    return (
        <h2 className={cn(
            'flex items-center gap-2 text-xl font-bold text-text-primary font-display',
            className
        )}>
            <span className="text-lg">{emoji}</span>
            {children}
        </h2>
    )
}

export function CardDescription({ className, children }) {
    return (
        <p className={cn('text-sm text-text-secondary mt-1', className)}>
            {children}
        </p>
    )
}
