import { cn } from '@/lib/utils'

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    className,
    emoji = '🌙'
}) {
    return (
        <div className={cn(
            'flex flex-col items-center justify-center py-12 px-4 text-center',
            className
        )}>
            {Icon ? (
                <div className="mb-4 p-4 rounded-full bg-primary/10 animate-float">
                    <Icon className="h-8 w-8 text-primary" />
                </div>
            ) : (
                <span className="text-5xl mb-4 animate-float">{emoji}</span>
            )}
            <h3 className="text-lg font-semibold text-text-primary mb-2 font-display">
                {title}
            </h3>
            <p className="text-sm text-text-secondary max-w-xs">
                {description}
            </p>
            {action && (
                <div className="mt-4">
                    {action}
                </div>
            )}
        </div>
    )
}
