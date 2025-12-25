import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, RefreshCw, Heart, Quote } from 'lucide-react'
import { Card, Button } from '@/components/ui'

const motivationalQuotes = [
    { text: "Believe in yourself and all that you are! ✨", author: "Your inner champion" },
    { text: "Small steps lead to big dreams 🌈", author: "Cozy wisdom" },
    { text: "You are capable of amazing things 💪", author: "Your cheerleader" },
    { text: "Every moment is a fresh beginning 🌸", author: "New day magic" },
    { text: "Your potential is endless, keep going! 🚀", author: "Motivation fairy" },
    { text: "Progress, not perfection 💕", author: "Gentle reminder" },
    { text: "You bring magic to everything you do ✨", author: "Universe" },
    { text: "Today is your day to shine! 🌟", author: "Morning sunshine" },
    { text: "Be proud of how far you've come 🎉", author: "Your journey" },
    { text: "You've got this, one task at a time 🍃", author: "Peaceful mind" },
    { text: "Kindness to yourself is productivity too 💗", author: "Self-care guru" },
    { text: "Every effort counts, you're doing great! 🌼", author: "Your biggest fan" },
]

export function MotivationalQuotes() {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isAnimating, setIsAnimating] = useState(false)

    useEffect(() => {
        // Auto-rotate every 15 seconds
        const interval = setInterval(() => {
            nextQuote()
        }, 15000)
        return () => clearInterval(interval)
    }, [])

    const nextQuote = () => {
        if (isAnimating) return
        setIsAnimating(true)
        setCurrentIndex((prev) => (prev + 1) % motivationalQuotes.length)
        setTimeout(() => setIsAnimating(false), 500)
    }

    const quote = motivationalQuotes[currentIndex]

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <Card className="relative overflow-hidden bg-gradient-to-br from-lavender/20 via-primary/10 to-sky/20">
                {/* Decorative sparkles */}
                <div className="absolute top-3 left-4 animate-sparkle">
                    <Sparkles className="h-4 w-4 text-primary/50" />
                </div>
                <div className="absolute bottom-4 right-4 animate-float" style={{ animationDelay: '0.5s' }}>
                    <Heart className="h-4 w-4 text-coral/50" />
                </div>
                <div className="absolute top-1/2 right-8 animate-float" style={{ animationDelay: '1s' }}>
                    <Sparkles className="h-3 w-3 text-lavender/60" />
                </div>

                <div className="relative text-center py-4">
                    <div className="flex items-center justify-center gap-2 mb-3">
                        <Quote className="h-4 w-4 text-primary" />
                        <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                            Daily Inspiration
                        </span>
                        <Quote className="h-4 w-4 text-primary transform rotate-180" />
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentIndex}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.4 }}
                            className="px-4"
                        >
                            <p className="text-lg font-medium text-text-primary font-display mb-2">
                                "{quote.text}"
                            </p>
                            <p className="text-sm text-text-secondary">
                                — {quote.author}
                            </p>
                        </motion.div>
                    </AnimatePresence>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={nextQuote}
                        className="mt-4"
                        disabled={isAnimating}
                    >
                        <RefreshCw className={`h-4 w-4 ${isAnimating ? 'animate-spin' : ''}`} />
                        Another one please! ✨
                    </Button>
                </div>
            </Card>
        </motion.div>
    )
}
