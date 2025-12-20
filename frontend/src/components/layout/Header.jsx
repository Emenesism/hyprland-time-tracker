import { Activity } from 'lucide-react'
import { Badge } from '@/components/ui'
import { cn } from '@/lib/utils'

export function Header({ trackerStatus }) {
    const isActive = trackerStatus?.running

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            'p-2 rounded-xl bg-gradient-to-br from-primary to-accent',
                            isActive && 'animate-pulse-slow'
                        )}>
                            <Activity className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold gradient-text">Time Tracker</h1>
                            <p className="text-xs text-text-muted -mt-0.5">Manual Task-Based Tracking</p>
                        </div>
                    </div>

                    {/* Status Badge */}
                    <Badge
                        variant={isActive ? 'success' : 'default'}
                        pulse={isActive}
                        className="text-sm"
                    >
                        {isActive ? 'Tracking Active' : 'Inactive'}
                    </Badge>
                </div>
            </div>
        </header>
    )
}
