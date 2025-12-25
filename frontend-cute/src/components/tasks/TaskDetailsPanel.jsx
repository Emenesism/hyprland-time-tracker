import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Clock, Calendar, Play, BarChart3, Star, Heart, Edit2, Save } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { Card, CardHeader, CardTitle, Button, Badge, Input, Textarea } from '@/components/ui'
import { formatDuration, formatDurationLong } from '@/lib/utils'
import { tasksAPI } from '@/lib/api'

export function TaskDetailsPanel({ task, stats, onClose, onUpdate }) {
    const [isEditing, setIsEditing] = useState(false)
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')

    useEffect(() => {
        if (task) {
            setTitle(task.title)
            setDescription(task.description || '')
        }
    }, [task])

    const handleSave = async () => {
        try {
            await tasksAPI.update(task.id, { title, description })
            setIsEditing(false)
            if (onUpdate) onUpdate()
        } catch (error) {
            console.error('Failed to update task:', error)
            alert('Failed to update task 🥺')
        }
    }

    if (!task) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3 }}
            >
                <Card className="relative overflow-hidden bg-gradient-to-br from-white via-lavender/5 to-primary/5">
                    {/* Decorative elements */}
                    <div className="absolute top-4 right-12 animate-sparkle">
                        <Star className="h-4 w-4 text-primary/30" />
                    </div>
                    <div className="absolute bottom-4 left-4 animate-float">
                        <Heart className="h-3 w-3 text-coral/30" />
                    </div>

                    {/* Actions */}
                    <div className="absolute top-4 right-4 flex gap-2">
                        {!isEditing && (
                            <Button
                                size="icon-sm"
                                variant="ghost"
                                onClick={() => setIsEditing(true)}
                                title="Edit Task"
                            >
                                <Edit2 className="h-4 w-4" />
                            </Button>
                        )}
                        <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={onClose}
                            title="Close"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    <CardHeader>
                        {isEditing ? (
                            <div className="space-y-3 mt-2 pr-8">
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Task title ✨"
                                    className="font-bold text-lg"
                                />
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Add some details~ 📝"
                                    rows={3}
                                />
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={handleSave}>
                                        <Save className="h-4 w-4 mr-1" />
                                        Save
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <CardTitle emoji="📋">
                                    {task.title}
                                </CardTitle>
                                {task.description && (
                                    <p className="text-sm text-text-secondary mt-2">
                                        {task.description}
                                    </p>
                                )}
                            </>
                        )}
                    </CardHeader>

                    {/* Task metadata */}
                    <div className="flex flex-wrap gap-3 mb-6">
                        <Badge variant="primary">
                            <Calendar className="h-3 w-3 mr-1" />
                            Created {format(parseISO(task.created_at), 'MMM dd, yyyy')}
                        </Badge>
                    </div>

                    {/* Stats */}
                    {stats && (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-text-primary flex items-center gap-2 font-display">
                                <BarChart3 className="h-4 w-4 text-secondary" />
                                Your amazing progress! ✨
                            </h3>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <StatCard
                                    icon={Clock}
                                    label="Total Time"
                                    value={formatDuration(stats.total_time || 0)}
                                    emoji="⏰"
                                    bgClass="bg-primary/10"
                                />
                                <StatCard
                                    icon={Play}
                                    label="Sessions"
                                    value={`${stats.activity_count || 0} sessions`}
                                    emoji="🎯"
                                    bgClass="bg-secondary/10"
                                />
                                <StatCard
                                    icon={BarChart3}
                                    label="Top Apps"
                                    value={`${stats.apps?.length || 0} apps`}
                                    emoji="🌸"
                                    bgClass="bg-accent/10"
                                />
                                <StatCard
                                    icon={Calendar}
                                    label="Activities"
                                    value={`${stats.timeline?.length || 0} entries`}
                                    emoji="🌈"
                                    bgClass="bg-peach/20"
                                />
                            </div>

                            {/* Recent sessions */}
                            {stats.recent_sessions && stats.recent_sessions.length > 0 && (
                                <div className="mt-6">
                                    <h4 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
                                        <Star className="h-4 w-4 text-primary" />
                                        Recent work sessions 💕
                                    </h4>
                                    <div className="space-y-2">
                                        {stats.recent_sessions.slice(0, 5).map((session, index) => (
                                            <motion.div
                                                key={index}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.1 }}
                                                className="flex items-center justify-between p-3 rounded-xl bg-surface-1/50 border border-primary/5"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm">🌸</span>
                                                    <span className="text-sm text-text-secondary">
                                                        {format(parseISO(session.start_time), 'MMM dd, HH:mm')}
                                                    </span>
                                                </div>
                                                <Badge variant="cute">
                                                    {formatDuration(session.duration_seconds || 0)}
                                                </Badge>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Encouraging message */}
                            <div className="mt-4 pt-4 border-t border-primary/10 text-center">
                                <p className="text-sm text-text-secondary">
                                    Every session brings you closer to your goals! 🌟
                                </p>
                            </div>
                        </div>
                    )}
                </Card>
            </motion.div>
        </AnimatePresence>
    )
}

function StatCard({ icon: Icon, label, value, emoji, bgClass }) {
    return (
        <div className={`p-3 rounded-xl ${bgClass} border border-primary/5`}>
            <div className="flex items-center gap-1.5 mb-1">
                <Icon className="h-3.5 w-3.5 text-text-secondary" />
                <span className="text-xs text-text-muted">{label}</span>
                <span className="text-xs">{emoji}</span>
            </div>
            <p className="font-semibold text-text-primary font-display text-sm">
                {value}
            </p>
        </div>
    )
}
