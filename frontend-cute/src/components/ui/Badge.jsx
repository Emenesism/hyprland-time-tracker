import { cn } from '@/lib/utils'

const badgeVariants = {
    default: 'bg-surface-2 text-text-secondary border-primary/10',
    primary: 'bg-primary/15 text-primary border-primary/20',
    secondary: 'bg-secondary/15 text-secondary border-secondary/20',
    success: 'bg-success/15 text-accent border-accent/20',
    warning: 'bg-warning/15 text-amber-600 border-warning/20',
    danger: 'bg-danger/15 text-danger border-danger/20',
    cute: 'bg-gradient-to-r from-primary/15 to-coral/15 text-primary border-primary/20',
}

export function Badge({
    className,
    variant = 'default',
    pulse = false,
    children,
    ...props
}) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1',
                'text-xs font-semibold border',
                'transition-all duration-200',
                badgeVariants[variant],
                pulse && 'animate-pulse-cute',
                className
            )}
            {...props}
        >
            {pulse && (
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
                </span>
            )}
            {children}
        </span>
    )
}
