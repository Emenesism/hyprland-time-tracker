import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Coffee, Clock, Star } from 'lucide-react'
import { Card, Button, Badge } from '@/components/ui'
import { formatDuration } from '@/lib/utils'

const productivityMessages = [
    "You're being so productive! ⭐",
    "Amazing focus today! 🎯",
    "Keep up the great work! 🌟",
    "You're on fire! 🔥",
    "Wonderful dedication! 💪",
]

export function TrackingStatus({ trackerStatus, onStop }) {
    const [elapsedTime, setElapsedTime] = useState(0)
    const [message] = useState(() =>
        productivityMessages[Math.floor(Math.random() * productivityMessages.length)]
    )

    const isRunning = trackerStatus?.running

    useEffect(() => {
        if (!isRunning || !trackerStatus?.start_time) {
            setElapsedTime(0)
            return
        }

        const startTime = new Date(trackerStatus.start_time).getTime()

        const updateElapsed = () => {
            setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
        }

        updateElapsed()
        const interval = setInterval(updateElapsed, 1000)
        return () => clearInterval(interval)
    }, [isRunning, trackerStatus?.start_time])

    if (!isRunning) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
            >
                <Card glow className="relative overflow-hidden bg-gradient-to-r from-mint/20 via-accent/10 to-sky/20">
                    {/* Sparkle decorations */}
                    <div className="absolute top-2 left-4 animate-float">
                        <Star className="h-4 w-4 text-accent opacity-60" />
                    </div>
                    <div className="absolute bottom-2 right-8 animate-float" style={{ animationDelay: '0.5s' }}>
                        <Star className="h-3 w-3 text-primary opacity-60" />
                    </div>

                    <div className="relative flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-accent/20 animate-pulse-cute">
                                <Clock className="h-6 w-6 text-accent" />
                            </div>

                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-bold text-text-primary font-display">
                                        {trackerStatus?.task_title || 'Current Task'}
                                    </h3>
                                    <Badge variant="success" pulse>Active</Badge>
                                </div>
                                <p className="text-sm text-accent font-medium">
                                    {message}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Timer Display */}
                            <div className="text-center">
                                <p className="text-3xl font-bold text-accent font-display tracking-wider">
                                    {formatDuration(elapsedTime)}
                                </p>
                                <p className="text-xs text-text-muted">Time invested 💕</p>
                            </div>

                            {/* Stop Button */}
                            <Button
                                variant="outline"
                                onClick={onStop}
                                className="border-accent/30 text-accent hover:bg-accent/10"
                            >
                                <Coffee className="h-4 w-4" />
                                Take a break 🍃
                            </Button>
                        </div>
                    </div>
                </Card>
            </motion.div>
        </AnimatePresence>
    )
}
