import { motion } from 'framer-motion'
import { Folder, Edit3, Trash2, ChevronRight } from 'lucide-react'
import { Card, Button, Badge, Input } from '@/components/ui'
import { cn } from '@/lib/utils'

export function FolderCard({
    folder,
    isRenaming,
    renameValue,
    onRenameChange,
    onRenameSubmit,
    onRenameCancel,
    onStartRename,
    onOpen,
    onDelete
}) {
    const taskCount = folder.task_count || 0

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
                {/* Decorative gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-lavender/5 pointer-events-none" />

                <div className="relative flex items-center gap-4">
                    {/* Folder Icon */}
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-lavender/30 to-secondary/20 shrink-0">
                        <Folder className="h-6 w-6 text-secondary" />
                    </div>

                    {/* Content */}
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
                                <h3 className="font-semibold text-text-primary truncate font-display">
                                    {folder.name}
                                </h3>
                                <p className="text-sm text-text-secondary">
                                    {taskCount === 0
                                        ? 'No tasks yet~ 🌙'
                                        : `${taskCount} adorable task${taskCount !== 1 ? 's' : ''} ✨`
                                    }
                                </p>
                            </>
                        )}
                    </div>

                    {/* Actions */}
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
