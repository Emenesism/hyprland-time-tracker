import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sprout, ChevronLeft, ChevronRight, Flower2 } from 'lucide-react'
import { statsAPI } from '@/lib/api'
import { Button } from '@/components/ui'
import { format, eachDayOfInterval, startOfYear, endOfYear, startOfWeek, endOfWeek } from 'date-fns'

export function FocusGarden({ isOpen, onClose }) {
    const [year, setYear] = useState(new Date().getFullYear())
    const [stats, setStats] = useState([])
    const [loading, setLoading] = useState(false)
    const [hoveredDay, setHoveredDay] = useState(null)

    useEffect(() => {
        if (isOpen) {
            fetchYearStats()
        }
    }, [isOpen, year])

    const fetchYearStats = async () => {
        setLoading(true)
        try {
            const data = await statsAPI.getYearStats(year)
            setStats(data.statistics || [])
        } catch (error) {
            console.error("Failed to load garden stats", error)
        } finally {
            setLoading(false)
        }
    }

    // Map intensity to flower stage/color
    const getIntensityLevel = (seconds) => {
        if (!seconds) return 0
        const minutes = seconds / 60
        if (minutes < 30) return 1 // Sprout
        if (minutes < 120) return 2 // Bud
        if (minutes < 240) return 3 // Bloom
        return 4 // Full Garden
    }

    const getFlowerColor = (level) => {
        switch (level) {
            case 0: return 'bg-surface-2' // Soil
            case 1: return 'bg-emerald-200' // Sprout
            case 2: return 'bg-teal-300' // Bud
            case 3: return 'bg-pink-300' // Bloom
            case 4: return 'bg-rose-400' // Full
            default: return 'bg-surface-2'
        }
    }

    const getFlowerIcon = (level) => {
        if (level === 0) return null
        if (level === 1) return <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
        if (level === 2) return <div className="w-2 h-2 rounded-full bg-teal-600/50" />
        if (level === 3) return <Flower2 className="w-2.5 h-2.5 text-pink-600/70" />
        return <Flower2 className="w-3 h-3 text-rose-100" />
    }

    const days = useMemo(() => {
        const baseDate = new Date(year, 0, 1)
        const yearStart = startOfYear(baseDate)
        const yearEnd = endOfYear(baseDate)
        const calendarStart = startOfWeek(yearStart, { weekStartsOn: 0 })
        const calendarEnd = endOfWeek(yearEnd, { weekStartsOn: 0 })

        // Expand to full weeks so weekdays line up with the grid rows.
        return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
    }, [year])

    // Create a map for quick access
    const statsMap = useMemo(() => {
        const map = new Map()
        stats.forEach(s => {
            if (!s?.date) return
            const key = typeof s.date === 'string' ? s.date.slice(0, 10) : null
            if (key) map.set(key, s)
        })
        return map
    }, [stats])

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto"
            >
                <div className="absolute top-4 right-4">
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-6 w-6" />
                    </Button>
                </div>

                <div className="w-full max-w-7xl flex flex-col items-center">
                    <motion.div
                        initial={{ y: -20 }}
                        animate={{ y: 0 }}
                        className="mb-8 text-center"
                    >
                        <h2 className="text-4xl font-bold gradient-text font-display mb-3 flex items-center justify-center gap-3">
                            <Sprout className="h-10 w-10 text-primary" />
                            Garden of Focus
                        </h2>
                        <p className="text-text-secondary text-lg">Watch your productivity bloom over time 🌸</p>
                    </motion.div>

                    <div className="flex items-center gap-6 mb-8 bg-surface-1 p-2 rounded-2xl shadow-sm border border-border">
                        <Button variant="ghost" size="icon" onClick={() => setYear(y => y - 1)}>
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <span className="text-2xl font-bold font-display w-24 text-center">{year}</span>
                        <Button variant="ghost" size="icon" onClick={() => setYear(y => y + 1)} disabled={year >= new Date().getFullYear()}>
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                    </div>

                    <div className="bg-surface-1 rounded-[2rem] p-8 shadow-cute border border-primary/10 relative overflow-hidden max-w-full">
                        {loading ? (
                            <div className="h-64 flex items-center justify-center w-full min-w-[800px]">
                                <span className="animate-pulse text-text-muted">Planting seeds...</span>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <div className="flex text-xs text-text-muted ml-8 mb-2">
                                    {/* Simplified Month Labels could go here if grid alignment is perfect, keeping it neat for now */}
                                    <span className="flex-1">Jan</span>
                                    <span className="flex-1">Feb</span>
                                    <span className="flex-1">Mar</span>
                                    <span className="flex-1">Apr</span>
                                    <span className="flex-1">May</span>
                                    <span className="flex-1">Jun</span>
                                    <span className="flex-1">Jul</span>
                                    <span className="flex-1">Aug</span>
                                    <span className="flex-1">Sep</span>
                                    <span className="flex-1">Oct</span>
                                    <span className="flex-1">Nov</span>
                                    <span className="flex-1">Dec</span>
                                </div>
                                <div className="flex gap-2">
                                    <div className="grid grid-rows-7 gap-[3px] text-[10px] text-text-muted font-medium pt-2">
                                        <span className="text-transparent select-none">Sun</span>
                                        <span>Mon</span>
                                        <span className="text-transparent select-none">Tue</span>
                                        <span>Wed</span>
                                        <span className="text-transparent select-none">Thu</span>
                                        <span>Fri</span>
                                        <span className="text-transparent select-none">Sat</span>
                                    </div>
                                    <div className="grid grid-flow-col grid-rows-7 gap-[3px]">
                                        {days.map(day => {
                                            const dateStr = format(day, 'yyyy-MM-dd')
                                            const inYear = day.getFullYear() === year
                                            const stat = inYear ? statsMap.get(dateStr) : null
                                            const duration = inYear ? stat?.total_duration || 0 : 0
                                            const level = inYear ? getIntensityLevel(duration) : 0
                                            const cellColor = inYear ? getFlowerColor(level) : 'bg-surface-2/40'

                                            return (
                                                <motion.div
                                                    key={dateStr}
                                                    whileHover={inYear ? { scale: 1.4, zIndex: 10 } : undefined}
                                                    onHoverStart={() => inYear && setHoveredDay({ date: day, duration })}
                                                    onHoverEnd={() => setHoveredDay(null)}
                                                    className={`
                                                        w-3.5 h-3.5 rounded-md flex items-center justify-center transition-colors duration-300
                                                        ${cellColor}
                                                    `}
                                                    title={inYear ? `${format(day, 'MMM d, yyyy')}: ${Math.round(duration / 60)} mins` : ''}
                                                >
                                                    {level > 2 && getFlowerIcon(level)}
                                                </motion.div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Hover Tooltip/Legend */}
                        <div className="mt-6 flex items-center justify-between text-sm text-text-secondary border-t border-border/50 pt-4">
                            <div className="flex items-center gap-2">
                                {hoveredDay ? (
                                    <>
                                        <span className="font-bold text-primary">{format(hoveredDay.date, 'MMM d, yyyy')}</span>
                                        <span className="text-text-muted">•</span>
                                        <span>{Math.round(hoveredDay.duration / 60)} mins focus</span>
                                    </>
                                ) : (
                                    <span className="text-text-muted italic">Hover over a flower to see details</span>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-xs">Less</span>
                                <div className="flex gap-1">
                                    {[0, 1, 2, 3, 4].map(l => (
                                        <div key={l} className={`w-3.5 h-3.5 rounded-md ${getFlowerColor(l)}`} />
                                    ))}
                                </div>
                                <span className="text-xs">More</span>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
