import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const Input = forwardRef(({ className, type = 'text', ...props }, ref) => {
    return (
        <input
            type={type}
            ref={ref}
            className={cn(
                'flex h-11 w-full rounded-lg px-4',
                'bg-surface-2/50 border border-border',
                'text-text-primary placeholder:text-text-muted',
                'transition-all duration-200',
                'hover:border-border-active hover:bg-surface-2/70',
                'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary focus:bg-surface-2',
                'disabled:cursor-not-allowed disabled:opacity-50',
                className
            )}
            {...props}
        />
    )
})

Input.displayName = 'Input'

const Textarea = forwardRef(({ className, ...props }, ref) => {
    return (
        <textarea
            ref={ref}
            className={cn(
                'flex min-h-[80px] w-full rounded-lg px-4 py-3',
                'bg-surface-2/50 border border-border',
                'text-text-primary placeholder:text-text-muted',
                'transition-all duration-200 resize-y',
                'hover:border-border-active hover:bg-surface-2/70',
                'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary focus:bg-surface-2',
                'disabled:cursor-not-allowed disabled:opacity-50',
                className
            )}
            {...props}
        />
    )
})

Textarea.displayName = 'Textarea'

export { Input, Textarea }
