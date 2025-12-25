import { motion, AnimatePresence } from 'framer-motion'
import { Play, Eye, Trash2, Sparkles, Heart } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { Card, Button, Badge } from '@/components/ui'
import { cn } from '@/lib/utils'

const encouragingMessages = [
    "Yay! Keep going! 🌟",
    "You're amazing! ✨",
    "So proud of you! 💕",
    "You got this! 🚀",
    "Wonderful progress! 🌈",
]

function getRandomMessage() {
    return encouragingMessages[Math.floor(Math.random() * encouragingMessages.length)]
}

export function TaskCard({
    task,
    isActive,
    onStart,
    onViewDetails,
    onDelete
}) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
        >
            <Card
                className={cn(
                    'group relative overflow-hidden',
                    'hover:border-primary/30 hover:shadow-cute-lg',
                    'transition-all duration-300',
                    isActive && 'border-accent/40 bg-gradient-to-r from-mint/10 to-accent/5 glow-mint'
                )}
            >
                {/* Active sparkle decoration */}
                {isActive && (
                    <div className="absolute top-3 right-3 animate-sparkle">
                        <Sparkles className="h-5 w-5 text-accent" />
                    </div>
                )}

                <div className="relative flex items-start gap-4">
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-text-primary truncate font-display">
                                {task.title}
                            </h3>
                            {isActive && (
                                <Badge variant="success" pulse className="shrink-0">
                                    <Heart className="h-3 w-3 mr-1" />
                                    Active
                                </Badge>
                            )}
                        </div>

                        {task.description && (
                            <p className="text-sm text-text-secondary line-clamp-2 mb-2">
                                {task.description}
                            </p>
                        )}

                        {/* Encouraging message when active */}
                        <AnimatePresence>
                            {isActive && (
                                <motion.p
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="text-sm font-medium text-accent mb-2"
                                >
                                    {getRandomMessage()}
                                </motion.p>
                            )}
                        </AnimatePresence>

                        <p className="text-xs text-text-muted">
                            Created {format(parseISO(task.created_at), 'MMM dd, yyyy')} 🌸
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="relative z-10 flex items-center gap-2 shrink-0">
                        <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={(e) => {
                                e.stopPropagation()
                                onViewDetails()
                            }}
                            title="View Details"
                            className="text-secondary hover:text-secondary hover:bg-secondary/10"
                        >
                            <Eye className="h-4 w-4" />
                        </Button>

                        <Button
                            size="sm"
                            variant={isActive ? 'outline' : 'success'}
                            onClick={(e) => {
                                e.stopPropagation()
                                onStart()
                            }}
                            disabled={isActive}
                            className="min-w-[90px]"
                        >
                            {isActive ? (
                                <>Working~ 💫</>
                            ) : (
                                <>
                                    <Play className="h-4 w-4" />
                                    Let's go!
                                </>
                            )}
                        </Button>

                        <Button
                            size="icon-sm"
                            variant="danger-outline"
                            onClick={(e) => {
                                e.stopPropagation()
                                onDelete()
                            }}
                            title="Delete"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </Card>
        </motion.div>
    )
}
