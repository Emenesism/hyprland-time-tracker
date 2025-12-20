import { Calendar, Clock, Folder } from 'lucide-react'
import { Card } from '@/components/ui'
import { cn, formatDuration, formatHours } from '@/lib/utils'

export function StatsCard({
    icon: Icon = Clock,
    label,
    value,
    subValue,
    variant = 'default',
    className
}) {
    const variants = {
        default: {
            card: 'from-primary/20 via-surface-1/80 to-accent/10 border-primary/30',
            icon: 'from-primary/30 to-primary/10 border-primary/30 text-primary',
            value: 'text-text-primary',
        },
        accent: {
            card: 'from-accent/20 via-surface-1/80 to-primary/10 border-accent/30',
            icon: 'from-accent/30 to-accent/10 border-accent/30 text-accent',
            value: 'text-accent',
        },
    }

    const v = variants[variant]

    return (
        <Card
            className={cn(
                'bg-gradient-to-br',
                'hover:shadow-lg hover:shadow-primary/10 transition-all duration-300',
                v.card,
                className
            )}
        >
            <div className="flex items-center gap-4">
                <div className={cn(
                    'p-4 rounded-2xl bg-gradient-to-br border',
                    v.icon
                )}>
                    <Icon className="h-7 w-7" />
                </div>

                <div>
                    <p className="text-xs uppercase tracking-wider text-text-muted font-medium mb-1">
                        {label}
                    </p>
                    <p className={cn('text-3xl font-bold', v.value)}>
                        {value}
                    </p>
                    {subValue && (
                        <p className="text-sm text-text-muted mt-0.5">{subValue}</p>
                    )}
                </div>
            </div>
        </Card>
    )
}

export function SummaryStatsCard({ summaryStats, selectedFolder }) {
    if (selectedFolder) {
        return (
            <StatsCard
                icon={Folder}
                label={selectedFolder.name}
                value={`${formatHours(selectedFolder.total_duration)} hrs`}
                subValue={`${formatDuration(selectedFolder.total_duration)} · ${selectedFolder.task_count} task${selectedFolder.task_count !== 1 ? 's' : ''}`}
                variant="accent"
            />
        )
    }

    if (!summaryStats) return null

    const last30DaysSeconds = summaryStats.last_30_days_time ?? 0
    const avgPerDay = last30DaysSeconds ? formatHours(last30DaysSeconds / 30) : '0'

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatsCard
                icon={Calendar}
                label="Last 30 Days"
                value={`${formatHours(last30DaysSeconds)} hrs`}
                subValue={formatDuration(last30DaysSeconds)}
            />
            <StatsCard
                icon={Clock}
                label="Daily Average"
                value={`${avgPerDay} hrs`}
                subValue="per day"
                variant="accent"
            />
        </div>
    )
}
