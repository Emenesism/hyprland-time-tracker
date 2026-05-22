import { motion } from 'framer-motion'
import { Code2, Globe2, Terminal, Palette, MessageCircle, FileText, Music2, Sparkles, Box } from 'lucide-react'
import { Card, CardHeader, CardTitle, Badge } from '@/components/ui'
import { formatDurationLong } from '@/lib/utils'

const categoryMeta = {
    Coding: { icon: Code2, emoji: '💻', bg: 'from-secondary/15 to-lavender/20', text: 'text-secondary' },
    Browser: { icon: Globe2, emoji: '🌐', bg: 'from-sky/20 to-primary/10', text: 'text-primary' },
    Terminal: { icon: Terminal, emoji: '⌨️', bg: 'from-accent/15 to-mint/20', text: 'text-accent' },
    Design: { icon: Palette, emoji: '🎨', bg: 'from-coral/15 to-peach/20', text: 'text-coral' },
    Chat: { icon: MessageCircle, emoji: '💬', bg: 'from-primary/15 to-coral/15', text: 'text-primary' },
    Docs: { icon: FileText, emoji: '📝', bg: 'from-lavender/20 to-secondary/10', text: 'text-secondary' },
    Media: { icon: Music2, emoji: '🎧', bg: 'from-peach/20 to-coral/15', text: 'text-coral' },
    Other: { icon: Box, emoji: '✨', bg: 'from-surface-2 to-primary/5', text: 'text-text-secondary' },
}

export function AppCategoriesCard({ categories }) {
    if (!categories?.length) return null

    const visibleCategories = categories.slice(0, 6)
    const totalDuration = categories.reduce((sum, category) => sum + (category.total_duration || 0), 0)

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
        >
            <Card className="relative overflow-hidden">
                <div className="absolute top-4 right-4 animate-sparkle">
                    <Sparkles className="h-5 w-5 text-secondary/40" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />

                <div className="relative">
                    <CardHeader>
                        <CardTitle emoji="🧺">App categories basket</CardTitle>
                        <p className="text-sm text-text-secondary mt-1">
                            Your apps grouped into cozy little focus families~
                        </p>
                    </CardHeader>

                    <div className="grid gap-3 md:grid-cols-2">
                        {visibleCategories.map((category, index) => {
                            const meta = categoryMeta[category.category] || categoryMeta.Other
                            const Icon = meta.icon
                            const percent = totalDuration > 0
                                ? Math.round((category.total_duration / totalDuration) * 100)
                                : 0
                            const topApps = (category.apps || []).slice(0, 3)

                            return (
                                <motion.div
                                    key={category.category}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.25, delay: index * 0.06 }}
                                    className={`rounded-2xl border border-primary/10 bg-gradient-to-br ${meta.bg} p-4`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="rounded-2xl bg-white/60 p-3 shadow-sm shrink-0">
                                            <Icon className={`h-5 w-5 ${meta.text}`} />
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <h3 className="font-display font-bold text-text-primary truncate">
                                                    {category.category} {meta.emoji}
                                                </h3>
                                                <Badge variant="cute" className="shrink-0">
                                                    {percent}%
                                                </Badge>
                                            </div>

                                            <p className="text-sm font-semibold text-text-secondary mb-3">
                                                {formatDurationLong(category.total_duration || 0)}
                                            </p>

                                            <div className="h-2 rounded-full bg-white/50 overflow-hidden mb-3">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-primary via-coral to-secondary transition-all duration-500"
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>

                                            <div className="flex flex-wrap gap-1.5">
                                                {topApps.map((app) => (
                                                    <span
                                                        key={app.app_name}
                                                        className="rounded-full bg-white/55 px-2.5 py-1 text-xs font-semibold text-text-secondary border border-white/60"
                                                    >
                                                        {app.app_name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>

                    <div className="mt-4 pt-4 border-t border-primary/10 text-center">
                        <p className="text-sm text-text-secondary">
                            Cleaner charts, softer chaos, happier tracking 💕
                        </p>
                    </div>
                </div>
            </Card>
        </motion.div>
    )
}
