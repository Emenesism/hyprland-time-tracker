import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const Card = forwardRef(({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
        default: 'bg-surface-1/80 border-border',
        elevated: 'bg-surface-2/80 border-border shadow-xl shadow-black/20',
        highlight: 'bg-gradient-to-br from-primary/20 via-surface-1/80 to-accent/10 border-primary/30',
        glass: 'bg-surface-1/50 backdrop-blur-xl border-border',
    }

    return (
        <div
            ref={ref}
            className={cn(
                'rounded-xl border p-6',
                'transition-all duration-300 ease-out',
                variants[variant],
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
})

Card.displayName = 'Card'

const CardHeader = forwardRef(({ className, children, ...props }, ref) => (
    <div
        ref={ref}
        className={cn('flex items-center justify-between gap-4 mb-6', className)}
        {...props}
    >
        {children}
    </div>
))

CardHeader.displayName = 'CardHeader'

const CardTitle = forwardRef(({ className, children, ...props }, ref) => (
    <h2
        ref={ref}
        className={cn(
            'text-lg font-semibold text-text-primary flex items-center gap-2',
            className
        )}
        {...props}
    >
        {children}
    </h2>
))

CardTitle.displayName = 'CardTitle'

const CardContent = forwardRef(({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('', className)} {...props}>
        {children}
    </div>
))

CardContent.displayName = 'CardContent'

export { Card, CardHeader, CardTitle, CardContent }
