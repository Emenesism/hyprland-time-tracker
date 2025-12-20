import { cn } from '@/lib/utils'

const badgeVariants = {
    default: 'bg-surface-2 text-text-secondary border-border',
    primary: 'bg-primary/15 text-primary border-primary/30',
    accent: 'bg-accent/15 text-accent border-accent/30',
    success: 'bg-success/15 text-success border-success/30',
    warning: 'bg-warning/15 text-warning border-warning/30',
    danger: 'bg-danger/15 text-danger border-danger/30',
}

function Badge({ className, variant = 'default', pulse = false, children, ...props }) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
                'transition-colors duration-200',
                badgeVariants[variant],
                className
            )}
            {...props}
        >
            {pulse && (
                <span className="relative flex h-2 w-2">
                    <span className={cn(
                        'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                        variant === 'success' && 'bg-success',
                        variant === 'primary' && 'bg-primary',
                        variant === 'accent' && 'bg-accent',
                        variant === 'danger' && 'bg-danger',
                    )} />
                    <span className={cn(
                        'relative inline-flex rounded-full h-2 w-2',
                        variant === 'success' && 'bg-success',
                        variant === 'primary' && 'bg-primary',
                        variant === 'accent' && 'bg-accent',
                        variant === 'danger' && 'bg-danger',
                    )} />
                </span>
            )}
            {children}
        </span>
    )
}

export { Badge, badgeVariants }
