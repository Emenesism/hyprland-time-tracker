import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const Input = forwardRef(({
    className,
    type = 'text',
    error,
    ...props
}, ref) => {
    return (
        <input
            ref={ref}
            type={type}
            className={cn(
                'flex w-full rounded-2xl border-2 bg-white/60 px-4 py-3',
                'text-sm text-text-primary placeholder:text-text-muted',
                'border-primary/20 focus:border-primary/50 focus:bg-white',
                'transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'disabled:cursor-not-allowed disabled:opacity-50',
                error && 'border-danger/50 focus:border-danger focus:ring-danger/20',
                className
            )}
            {...props}
        />
    )
})

Input.displayName = 'Input'

const Textarea = forwardRef(({
    className,
    error,
    ...props
}, ref) => {
    return (
        <textarea
            ref={ref}
            className={cn(
                'flex w-full rounded-2xl border-2 bg-white/60 px-4 py-3',
                'text-sm text-text-primary placeholder:text-text-muted',
                'border-primary/20 focus:border-primary/50 focus:bg-white',
                'transition-all duration-200 resize-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'scrollbar-cute',
                error && 'border-danger/50 focus:border-danger focus:ring-danger/20',
                className
            )}
            {...props}
        />
    )
})

Textarea.displayName = 'Textarea'

export { Input, Textarea }
