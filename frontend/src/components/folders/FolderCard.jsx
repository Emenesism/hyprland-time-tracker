import { motion } from 'framer-motion'
import { FolderOpen, ChevronRight, Edit2, Trash2 } from 'lucide-react'
import { Card, Button } from '@/components/ui'
import { cn, formatDuration } from '@/lib/utils'

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
                    'group cursor-pointer',
                    'hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5',
                    'hover:translate-y-[-2px] transition-all duration-300'
                )}
            >
                <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className="shrink-0 p-3 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 group-hover:from-accent/30 group-hover:border-accent/30 transition-colors duration-300">
                        <FolderOpen className="h-6 w-6 text-accent" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        {isRenaming ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={renameValue}
                                    onChange={(e) => onRenameChange(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') onRenameSubmit()
                                        if (e.key === 'Escape') onRenameCancel()
                                    }}
                                    autoFocus
                                    className="flex-1 h-9 px-3 rounded-lg bg-surface-2/70 border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                                />
                                <Button size="sm" variant="accent" onClick={onRenameSubmit}>Save</Button>
                                <Button size="sm" variant="ghost" onClick={onRenameCancel}>Cancel</Button>
                            </div>
                        ) : (
                            <>
                                <h3
                                    onClick={onOpen}
                                    className="font-semibold text-text-primary truncate group-hover:text-accent transition-colors cursor-pointer"
                                >
                                    {folder.name}
                                </h3>
                                <p className="text-sm text-text-muted mt-0.5">
                                    {folder.task_count} task{folder.task_count !== 1 ? 's' : ''} · {formatDuration(folder.total_duration)} tracked
                                </p>
                            </>
                        )}
                    </div>

                    {/* Actions */}
                    {!isRenaming && (
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                                size="icon-sm"
                                variant="ghost"
                                onClick={(e) => { e.stopPropagation(); onStartRename() }}
                                title="Rename"
                            >
                                <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={onOpen}
                            >
                                Open
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button
                                size="icon-sm"
                                variant="danger-outline"
                                onClick={(e) => { e.stopPropagation(); onDelete() }}
                                title="Delete"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
            </Card>
        </motion.div>
    )
}
