import { motion } from 'framer-motion'
import { Play, Eye, Trash2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { Card, Button, Badge } from '@/components/ui'
import { cn } from '@/lib/utils'

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
                    'hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5',
                    'transition-all duration-300',
                    isActive && 'border-success/50 bg-success/5'
                )}
            >
                {/* Active indicator */}
                {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-success/10 to-transparent pointer-events-none" />
                )}

                <div className="relative flex items-start gap-4">
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-text-primary truncate">
                                {task.title}
                            </h3>
                            {isActive && (
                                <Badge variant="success" pulse className="shrink-0">
                                    Active
                                </Badge>
                            )}
                        </div>

                        {task.description && (
                            <p className="text-sm text-text-secondary line-clamp-2 mb-2">
                                {task.description}
                            </p>
                        )}

                        <p className="text-xs text-text-muted">
                            Created {format(parseISO(task.created_at), 'MMM dd, yyyy · HH:mm')}
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={onViewDetails}
                            title="View Details"
                            className="text-accent hover:text-accent hover:bg-accent/10"
                        >
                            <Eye className="h-4 w-4" />
                        </Button>

                        <Button
                            size="sm"
                            variant={isActive ? 'secondary' : 'success'}
                            onClick={onStart}
                            disabled={isActive}
                            className="min-w-[80px]"
                        >
                            <Play className="h-4 w-4" />
                            {isActive ? 'Active' : 'Start'}
                        </Button>

                        <Button
                            size="icon-sm"
                            variant="danger-outline"
                            onClick={onDelete}
                            title="Delete"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </Card>
        </motion.div>
    )
}
