import { Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui'
import { cn } from '@/lib/utils'

export function Header({ trackerStatus }) {
    const isActive = trackerStatus?.running

    return (
        <header className="sticky top-0 z-50 w-full border-b border-primary/10 bg-white/70 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            'p-2.5 rounded-2xl bg-gradient-to-br from-primary via-coral to-peach shadow-cute',
                            isActive && 'animate-pulse-cute'
                        )}>
                            <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold gradient-text font-display">Cozy Tracker</h1>
                            <p className="text-xs text-text-muted -mt-0.5">Your productivity buddy ✨</p>
                        </div>
                    </div>

                    {/* Status Badge */}
                    <Badge
                        variant={isActive ? 'success' : 'cute'}
                        pulse={isActive}
                        className="text-sm"
                    >
                        {isActive ? 'Doing great! 💪' : 'Ready to go~ 🌸'}
                    </Badge>
                </div>
            </div>
        </header>
    )
}
