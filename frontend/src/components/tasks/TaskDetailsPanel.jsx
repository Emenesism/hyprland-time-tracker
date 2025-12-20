import { motion, AnimatePresence } from 'framer-motion'
import { X, PieChart, BarChart3, Activity } from 'lucide-react'
import { PieChart as RechartsPie, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Button, Card, CardHeader, CardTitle } from '@/components/ui'
import { cn, formatDuration, getInitials, CHART_COLORS } from '@/lib/utils'

export function TaskDetailsPanel({ task, stats, onClose }) {
    if (!task) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
                <Card variant="highlight" className="mt-6">
                    <CardHeader>
                        <CardTitle>
                            <Activity className="h-5 w-5" />
                            {task.title}
                        </CardTitle>
                        <Button variant="ghost" size="icon-sm" onClick={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </CardHeader>

                    {stats && (
                        <div className="space-y-6">
                            {/* Stats summary */}
                            <div className="grid grid-cols-3 gap-4">
                                <StatBox label="Total Time" value={formatDuration(stats.total_time)} />
                                <StatBox label="Activities" value={stats.activity_count} />
                                <StatBox label="Apps Used" value={stats.apps.length} />
                            </div>

                            {/* Charts */}
                            {stats.apps.length > 0 && (
                                <>
                                    <div>
                                        <h3 className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-4">
                                            <PieChart className="h-4 w-4" />
                                            Time Distribution
                                        </h3>
                                        <div className="bg-surface-2/50 rounded-xl p-4">
                                            <ResponsiveContainer width="100%" height={250}>
                                                <RechartsPie>
                                                    <Pie
                                                        data={stats.apps}
                                                        dataKey="total_duration"
                                                        nameKey="app_name"
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={50}
                                                        outerRadius={90}
                                                        paddingAngle={2}
                                                    >
                                                        {stats.apps.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        formatter={(value) => [formatDuration(value), 'Duration']}
                                                        contentStyle={{
                                                            backgroundColor: 'rgba(18, 18, 26, 0.95)',
                                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                                            borderRadius: '8px',
                                                            color: '#f8fafc',
                                                        }}
                                                    />
                                                </RechartsPie>
                                            </ResponsiveContainer>
                                        </div>

                                        {/* Legend */}
                                        <div className="grid grid-cols-2 gap-2 mt-4">
                                            {stats.apps.map((app, idx) => {
                                                const total = stats.apps.reduce((sum, a) => sum + a.total_duration, 0)
                                                const percentage = Math.round((app.total_duration / total) * 100)
                                                return (
                                                    <div key={idx} className="flex items-center gap-2 text-sm">
                                                        <div
                                                            className="w-3 h-3 rounded-sm shrink-0"
                                                            style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                                                        />
                                                        <span className="truncate text-text-secondary">{app.app_name}</span>
                                                        <span className="ml-auto text-text-muted">{percentage}%</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-4">
                                            <BarChart3 className="h-4 w-4" />
                                            App Usage
                                        </h3>
                                        <div className="bg-surface-2/50 rounded-xl p-4">
                                            <ResponsiveContainer width="100%" height={200}>
                                                <BarChart data={stats.apps}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                                    <XAxis dataKey="app_name" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12 }} />
                                                    <YAxis stroke="rgba(255,255,255,0.5)" tickFormatter={(v) => formatDuration(v)} tick={{ fontSize: 11 }} />
                                                    <Tooltip
                                                        formatter={(value) => [formatDuration(value), 'Duration']}
                                                        contentStyle={{
                                                            backgroundColor: 'rgba(18, 18, 26, 0.95)',
                                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                                            borderRadius: '8px',
                                                            color: '#f8fafc',
                                                        }}
                                                    />
                                                    <Bar dataKey="total_duration" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* App breakdown list */}
                                    <div>
                                        <h3 className="text-sm font-medium text-text-secondary mb-3">Application Breakdown</h3>
                                        <div className="space-y-2">
                                            {stats.apps.map((app, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-center gap-3 p-3 rounded-lg bg-surface-2/30 border border-border hover:bg-surface-2/50 transition-colors"
                                                >
                                                    <div
                                                        className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm text-white shrink-0"
                                                        style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] + '40' }}
                                                    >
                                                        {getInitials(app.app_name)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-text-primary truncate">{app.app_name}</p>
                                                        <p className="text-xs text-text-muted">{app.session_count} session{app.session_count > 1 ? 's' : ''}</p>
                                                    </div>
                                                    <p className="font-mono font-semibold text-primary">{formatDuration(app.total_duration)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </Card>
            </motion.div>
        </AnimatePresence>
    )
}

function StatBox({ label, value }) {
    return (
        <div className="text-center p-4 rounded-xl bg-surface-2/50 border border-border">
            <p className="text-xs uppercase tracking-wider text-text-muted mb-1">{label}</p>
            <p className="text-2xl font-bold text-primary">{value}</p>
        </div>
    )
}
