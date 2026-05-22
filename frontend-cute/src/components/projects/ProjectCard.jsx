import { motion } from 'framer-motion'
import { Briefcase, Edit3, Trash2, ChevronRight, Sparkles } from 'lucide-react'
import { Card, Button, Badge, Input } from '@/components/ui'
import { formatDurationLong } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function ProjectCard({
    project,
    isRenaming,
    renameValue,
    onRenameChange,
    onRenameSubmit,
    onRenameCancel,
    onStartRename,
    onOpen,
    onDelete,
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
                    'group relative overflow-hidden cursor-pointer',
                    'hover:border-primary/30 hover:shadow-cute-lg hover:scale-[1.01]',
                    'transition-all duration-300'
                )}
                onClick={() => !isRenaming && onOpen()}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-lavender/10 to-accent/5 pointer-events-none" />
                <div className="absolute top-4 right-16 animate-sparkle opacity-70">
                    <Sparkles className="h-4 w-4 text-primary" />
                </div>

                <div className="relative flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-coral/20 shrink-0">
                        <Briefcase className="h-6 w-6 text-primary" />
                    </div>

                    <div className="flex-1 min-w-0">
                        {isRenaming ? (
                            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                <Input
                                    value={renameValue}
                                    onChange={(e) => onRenameChange(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && onRenameSubmit()}
                                    autoFocus
                                    className="text-sm"
                                />
                                <Button size="sm" onClick={onRenameSubmit}>Save 💕</Button>
                                <Button size="sm" variant="ghost" onClick={onRenameCancel}>Cancel</Button>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-semibold text-text-primary truncate font-display">
                                        {project.name}
                                    </h3>
                                    <Badge variant="cute" className="shrink-0">
                                        {formatDurationLong(project.total_duration || 0)}
                                    </Badge>
                                </div>
                                <p className="text-sm text-text-secondary">
                                    {(project.folder_count || 0) === 0
                                        ? 'No cozy spaces yet~ 🌙'
                                        : `${project.folder_count} space${project.folder_count !== 1 ? 's' : ''} • ${project.task_count || 0} adventure${project.task_count !== 1 ? 's' : ''} ✨`
                                    }
                                </p>
                            </>
                        )}
                    </div>

                    {!isRenaming && (
                        <div className="relative z-10 flex items-center gap-2 shrink-0">
                            <Button
                                size="icon-sm"
                                variant="ghost"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onStartRename()
                                }}
                                title="Rename"
                                className="text-secondary hover:text-secondary hover:bg-secondary/10"
                            >
                                <Edit3 className="h-4 w-4" />
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

                            <ChevronRight className="h-5 w-5 text-text-muted group-hover:text-primary transition-colors" />
                        </div>
                    )}
                </div>
            </Card>
        </motion.div>
    )
}
