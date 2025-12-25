import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = {
    variant: {
        primary: 'bg-gradient-to-r from-primary to-coral text-white shadow-cute hover:shadow-cute-lg hover:scale-105',
        secondary: 'bg-gradient-to-r from-secondary to-lavender text-white shadow-lavender hover:shadow-cute-lg hover:scale-105',
        ghost: 'text-text-secondary hover:text-primary hover:bg-primary/5',
        outline: 'border-2 border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50',
        danger: 'bg-gradient-to-r from-danger to-coral text-white shadow-cute hover:shadow-cute-lg',
        'danger-outline': 'border-2 border-danger/30 text-danger hover:bg-danger/5 hover:border-danger/50',
        success: 'bg-gradient-to-r from-accent to-mint text-white shadow-mint hover:shadow-cute-lg hover:scale-105',
        cute: 'bg-gradient-to-r from-primary via-coral to-peach text-white shadow-cute hover:shadow-cute-lg hover:scale-105',
    },
    size: {
        sm: 'h-9 px-4 text-sm gap-1.5',
        md: 'h-11 px-5 text-sm gap-2',
        lg: 'h-13 px-7 text-base gap-2.5',
        icon: 'h-11 w-11',
        'icon-sm': 'h-9 w-9',
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
            type="button"
            disabled={disabled || loading}
            className={cn(
                'inline-flex items-center justify-center font-semibold rounded-full',
                'transition-all duration-200 ease-out',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'disabled:opacity-50 disabled:pointer-events-none',
                'active:scale-95',
                buttonVariants.variant[variant],
                buttonVariants.size[size],
                className
            )}
            {...props}
        >
            {loading ? (
                <>
                    <span className="animate-spin text-base">🌸</span>
                    <span>Working~</span>
                </>
            ) : children}
        </button>
    )
})

Button.displayName = 'Button'

export { Button, buttonVariants }
