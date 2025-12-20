import { Square } from 'lucide-react'
import { Card, CardHeader, CardTitle, Button } from '@/components/ui'
import { cn } from '@/lib/utils'

export function TrackingStatus({ trackerStatus, onStop }) {
    if (!trackerStatus?.running) {
        return (
            <Card className="border-dashed border-2 border-border bg-surface-1/50">
                <p className="text-center text-text-muted py-4">
                    No active tracking. Start a task below to begin.
                </p>
            </Card>
        )
    }

    return (
        <Card className={cn(
            'relative overflow-hidden',
            'border-success/50 bg-gradient-to-r from-success/10 to-transparent'
        )}>
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-r from-success/5 via-transparent to-success/5 animate-pulse-slow" />

            <CardHeader className="relative">
                <CardTitle className="text-success">
                    <span className="relative flex h-3 w-3 mr-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-success" />
                    </span>
                    Currently Tracking
                </CardTitle>
                <Button variant="danger" size="sm" onClick={onStop}>
                    <Square className="h-4 w-4" />
                    Stop Tracking
                </Button>
            </CardHeader>

            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                    <p className="text-text-muted mb-1">Task ID</p>
                    <p className="font-mono text-text-primary">{trackerStatus.task_id}</p>
                </div>
                <div>
                    <p className="text-text-muted mb-1">Current App</p>
                    <p className="font-semibold text-text-primary">{trackerStatus.current_app || 'None'}</p>
                </div>
                <div>
                    <p className="text-text-muted mb-1">Window</p>
                    <p className="text-text-secondary truncate">{trackerStatus.current_window || 'N/A'}</p>
                </div>
            </div>
        </Card>
    )
}
