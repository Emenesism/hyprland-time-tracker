import { cn } from '@/lib/utils'
import { Inbox } from 'lucide-react'

function EmptyState({
    icon: Icon = Inbox,
    title = 'No items',
    description,
    action,
    className
}) {
    return (
        <div className={cn(
            'flex flex-col items-center justify-center py-12 px-4 text-center',
            className
        )}>
            <div className="rounded-2xl bg-surface-2/50 p-4 mb-4">
                <Icon className="h-8 w-8 text-text-muted" />
            </div>
            <h3 className="text-lg font-medium text-text-primary mb-1">{title}</h3>
            {description && (
                <p className="text-sm text-text-muted max-w-sm mb-4">{description}</p>
            )}
            {action}
        </div>
    )
}

export { EmptyState }
