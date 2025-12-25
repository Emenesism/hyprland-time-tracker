import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Palette, Check, Moon, Sun, Flower, Flame } from 'lucide-react'
import { Button } from '@/components/ui'

const themes = [
    {
        id: 'theme-sakura',
        name: 'Sakura',
        icon: Flower,
        color: 'bg-pink-400',
        emoji: '🌸'
    },
    {
        id: 'theme-midnight',
        name: 'Midnight',
        icon: Moon,
        color: 'bg-indigo-400',
        emoji: '🌙'
    },
    {
        id: 'theme-mint',
        name: 'Minty',
        icon: Sun,
        color: 'bg-emerald-400',
        emoji: '🍃'
    },
    {
        id: 'theme-sunset',
        name: 'Sunset',
        icon: Flame,
        color: 'bg-orange-400',
        emoji: '🌅'
    }
]

export function ThemeSwitcher({ currentTheme, onThemeChange }) {
    const [isOpen, setIsOpen] = useState(false)

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isOpen && !event.target.closest('.theme-switcher-container')) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen])

    return (
        <div className="relative theme-switcher-container">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(!isOpen)}
                className="gap-2"
                title="Change Theme"
            >
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">Theme</span>
            </Button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-48 p-2 rounded-2xl bg-surface-1/95 backdrop-blur-md border border-primary/10 shadow-cute z-50 origin-top-right"
                    >
                        <div className="space-y-1">
                            {themes.map((theme) => (
                                <button
                                    key={theme.id}
                                    onClick={() => {
                                        onThemeChange(theme.id)
                                        setIsOpen(false)
                                    }}
                                    className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all ${currentTheme === theme.id
                                            ? 'bg-primary/10 text-primary'
                                            : 'hover:bg-surface-2 text-text-secondary hover:text-text-primary'
                                        }`}
                                >
                                    <div className={`h-6 w-6 rounded-full flex items-center justify-center ${theme.color} text-white text-xs`}>
                                        {theme.emoji}
                                    </div>
                                    <span className="flex-1 text-left font-medium text-sm">
                                        {theme.name}
                                    </span>
                                    {currentTheme === theme.id && (
                                        <Check className="h-3 w-3" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
