import { motion } from 'framer-motion'
import { Clock, Calendar, Target, TrendingUp, Sparkles } from 'lucide-react'
import { Card, CardHeader, CardTitle, Badge } from '@/components/ui'
import { formatDurationLong } from '@/lib/utils'

export function SummaryStatsCard({ summaryStats, selectedFolder }) {
    if (!summaryStats) return null

    let stats;

    // If a folder is selected, show stats for that folder
    if (selectedFolder) {
        // We only have total duration and task count for folders in the list response
        // So we'll show those, and maybe placeholders or derived data for others
        stats = [
            {
                icon: Clock,
                label: 'Total Time',
                value: formatDurationLong(selectedFolder.total_duration || 0),
                emoji: '🌸',
                color: 'from-primary to-coral',
                bg: 'bg-primary/10'
            },
            {
                icon: Target,
                label: 'Total Tasks',
                value: `${selectedFolder.task_count || 0} adventures`,
                emoji: '✨',
                color: 'from-accent to-mint',
                bg: 'bg-accent/10'
            },
            // Since we don't have daily/weekly breakdown for folders in the simple list,
            // we can either hide these or show something generic.
            // For now, let's keep it clean with just the reliable data.
            // Ideally we'd fetch specific folder stats, but let's use what we have.
        ]
    } else {
        // Global stats
        stats = [
            {
                icon: Clock,
                label: 'Time Today',
                value: formatDurationLong(summaryStats.today_time || 0),
                emoji: '🌸',
                color: 'from-primary to-coral',
                bg: 'bg-primary/10'
            },
            {
                icon: Calendar,
                label: 'This Week',
                value: formatDurationLong(summaryStats.week_time || 0),
                emoji: '🌈',
                color: 'from-secondary to-lavender',
                bg: 'bg-secondary/10'
            },
            {
                icon: Target,
                label: 'Total Tasks',
                value: `${summaryStats.total_activities || 0} adventures`,
                emoji: '✨',
                color: 'from-accent to-mint',
                bg: 'bg-accent/10'
            },
            {
                icon: TrendingUp,
                label: 'This Month',
                value: formatDurationLong(summaryStats.last_30_days_time || 0),
                emoji: '🔥',
                color: 'from-peach to-coral',
                bg: 'bg-peach/20'
            }
        ]
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <Card className="relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-4 right-4 animate-sparkle">
                    <Sparkles className="h-5 w-5 text-primary/40" />
                </div>

                <CardHeader>
                    <CardTitle emoji="🎉">
                        {selectedFolder
                            ? `${selectedFolder.name}'s Progress`
                            : "Look how amazing you are!"
                        }
                    </CardTitle>
                </CardHeader>

                <div className={`grid gap-4 ${stats.length === 2 ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
                    {stats.map((stat, index) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                            className={`p-4 rounded-2xl ${stat.bg} border border-primary/5 flex flex-col items-center justify-center text-center`}
                        >
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <stat.icon className={`h-4 w-4 bg-gradient-to-r ${stat.color} bg-clip-text`} style={{ color: 'transparent', WebkitBackgroundClip: 'text' }} />
                                <span className="text-xs text-text-secondary font-medium">{stat.label}</span>
                                <span className="text-sm">{stat.emoji}</span>
                            </div>
                            <p className="font-bold text-text-primary font-display">
                                {stat.value}
                            </p>
                        </motion.div>
                    ))}
                </div>

                {/* Encouraging message */}
                <div className="mt-4 pt-4 border-t border-primary/10 text-center">
                    <p className="text-sm text-text-secondary">
                        Every moment counts! You're doing wonderful 💕
                    </p>
                </div>
            </Card>
        </motion.div>
    )
}
