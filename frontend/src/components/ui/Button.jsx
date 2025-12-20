import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = {
    variant: {
        primary: 'bg-gradient-to-r from-primary to-indigo-500 text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:from-primary-hover hover:to-indigo-400',
        secondary: 'bg-surface-2 text-text-primary border border-border hover:bg-surface-3 hover:border-border-active',
        ghost: 'text-text-secondary hover:text-text-primary hover:bg-surface-2',
        danger: 'bg-gradient-to-r from-danger to-red-500 text-white shadow-lg shadow-danger/25 hover:shadow-danger/40',
        'danger-outline': 'border border-danger/40 text-danger hover:bg-danger/10 hover:border-danger',
        success: 'bg-gradient-to-r from-success to-emerald-400 text-white shadow-lg shadow-success/25 hover:shadow-success/40',
        accent: 'bg-gradient-to-r from-accent to-cyan-400 text-background shadow-lg shadow-accent/25 hover:shadow-accent/40',
    },
    size: {
        sm: 'h-8 px-3 text-sm gap-1.5',
        md: 'h-10 px-4 text-sm gap-2',
        lg: 'h-12 px-6 text-base gap-2.5',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
    },
}

const Button = forwardRef(({
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    children,
    ...props
}, ref) => {
    return (
        <button
            ref={ref}
            disabled={disabled || loading}
            className={cn(
                'inline-flex items-center justify-center font-medium rounded-lg',
                'transition-all duration-200 ease-out',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'disabled:opacity-50 disabled:pointer-events-none',
                'active:scale-[0.98]',
                buttonVariants.variant[variant],
                buttonVariants.size[size],
                className
            )}
            {...props}
        >
            {loading ? (
                <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Loading...</span>
                </>
            ) : children}
        </button>
    )
})

Button.displayName = 'Button'

export { Button, buttonVariants }
