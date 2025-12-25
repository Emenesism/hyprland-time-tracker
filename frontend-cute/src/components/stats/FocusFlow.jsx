import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, Activity, Zap } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Button } from '@/components/ui'
import { format, subDays, isSameDay } from 'date-fns'
import { statsAPI } from '@/lib/api'

export function FocusFlow({ isOpen, onClose }) {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedDate, setSelectedDate] = useState(new Date())

    useEffect(() => {
        if (isOpen) {
            fetchTimelineData()
        }
    }, [isOpen, selectedDate])

    const fetchTimelineData = async () => {
        setLoading(true)
        try {
            const dateStr = format(selectedDate, 'yyyy-MM-dd')
            const response = await statsAPI.getTimeline(dateStr)

            // Process data for the chart
            const processedData = processTimelineToFlow(response.activities || [], selectedDate)
            setData(processedData)
        } catch (error) {
            console.error("Failed to load timeline", error)
        } finally {
            setLoading(false)
        }
    }

    const processTimelineToFlow = (activities, date) => {
        // Create 24h * 4 (15 min) points
        const points = []
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0)

        for (let i = 0; i < 24 * 4; i++) {
            const time = new Date(startOfDay.getTime() + i * 15 * 60 * 1000)
            points.push({
                time: time,
                label: format(time, 'HH:mm'),
                intensity: 0,
                tooltip: []
            })
        }

        // Fill intensity based on activities
        activities.forEach(activity => {
            if (!activity.start_time) return

            // Fix SQLite date format (replace space with T for ISO compatibility)
            const parseDate = (dateStr) => {
                if (!dateStr) return null
                return new Date(dateStr.replace(' ', 'T'))
            }

            const start = parseDate(activity.start_time)
            let end = parseDate(activity.end_time)

            // Fallback for end time
            if (!end || isNaN(end.getTime())) {
                if (activity.duration) {
                    end = new Date(start.getTime() + activity.duration * 1000)
                } else {
                    end = new Date(start.getTime() + 5 * 60 * 1000)
                }
            }

            if (isNaN(start.getTime()) || isNaN(end.getTime())) return

            // Filter out activities not effectively in this day's range
            if (start < startOfDay) return

            const startIndex = Math.floor((start - startOfDay) / (15 * 60 * 1000))
            const endIndex = Math.floor((end - startOfDay) / (15 * 60 * 1000))

            for (let i = startIndex; i <= endIndex && i < points.length; i++) {
                if (i >= 0) {
                    points[i].intensity = 100
                    points[i].tooltip.push(`${activity.app_name}: ${activity.window_title || 'Working'}`)
                }
            }
        })

        // Apply smoothing
        const smoothed = points.map((p, i) => {
            const prev = points[i - 1]?.intensity || 0
            const next = points[i + 1]?.intensity || 0
            const curr = p.intensity
            const val = (prev + curr + next) / 3
            return {
                ...p,
                value: val
            }
        })

        return smoothed
    }

    // Generate last 7 days
    const pastDays = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => subDays(new Date(), i)).reverse()
    }, [])

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-xl flex items-center justify-center p-4"
            >
                <div className="absolute top-4 right-4">
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-6 w-6" />
                    </Button>
                </div>

                <div className="w-full max-w-6xl h-[85vh] flex flex-col">
                    <div className="mb-6 text-center">
                        <h2 className="text-3xl font-bold gradient-text font-display mb-2 flex items-center justify-center gap-2">
                            <Activity className="h-8 w-8 text-primary" />
                            Focus Flow
                        </h2>
                        <p className="text-text-secondary mb-6">Your productivity rhythm 🌊</p>

                        {/* Date Navigation */}
                        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2">
                            {pastDays.map((date) => {
                                const isSelected = isSameDay(date, selectedDate)
                                const isToday = isSameDay(date, new Date())
                                return (
                                    <button
                                        key={date.toISOString()}
                                        onClick={() => setSelectedDate(date)}
                                        className={`
                                            flex flex-col items-center justify-center w-14 h-16 rounded-2xl transition-all duration-300
                                            ${isSelected
                                                ? 'bg-primary text-white shadow-cute scale-110'
                                                : 'bg-surface-1 text-text-muted hover:bg-surface-2 hover:scale-105'
                                            }
                                        `}
                                    >
                                        <span className="text-xs font-medium uppercase opacity-80">
                                            {format(date, 'EEE')}
                                        </span>
                                        <span className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-text-primary'}`}>
                                            {format(date, 'd')}
                                        </span>
                                        {isToday && (
                                            <span className="w-1 h-1 rounded-full bg-current mt-1" />
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="flex-1 w-full bg-surface-1 rounded-3xl p-6 shadow-cute border border-primary/10 relative overflow-hidden">
                        {loading ? (
                            <div className="flex h-full items-center justify-center text-text-muted">
                                Loading waves...
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorFlow" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="rgb(var(--color-primary))" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="rgb(var(--color-primary))" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorStroke" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor="rgb(var(--color-primary))" />
                                            <stop offset="50%" stopColor="rgb(var(--color-secondary))" />
                                            <stop offset="100%" stopColor="rgb(var(--color-accent))" />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(var(--color-border))" />
                                    <XAxis
                                        dataKey="label"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: 'rgb(var(--color-text-muted))', fontSize: 12 }}
                                        interval={12} // Show every ~3 hours
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                            borderRadius: '12px',
                                            border: 'none',
                                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                                        }}
                                        labelStyle={{ color: 'rgb(var(--color-text-primary))', fontWeight: 'bold' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke="url(#colorStroke)"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorFlow)"
                                        animationDuration={2000}
                                        animationEasing="ease-in-out"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}

                        {/* Decorative background vibe */}
                        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                            <Zap className="h-64 w-64 text-primary" />
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
