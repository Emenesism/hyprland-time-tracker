import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { FolderPlus, Plus, ArrowLeft, Download, Folder, Sparkles } from 'lucide-react'

// Components
import { Header } from '@/components/layout/Header'
import { Button, Card, CardHeader, CardTitle, Input, Textarea, EmptyState, SkeletonList } from '@/components/ui'
import { FolderCard } from '@/components/folders/FolderCard'
import { TaskCard } from '@/components/tasks/TaskCard'
import { TaskDetailsPanel } from '@/components/tasks/TaskDetailsPanel'
import { TrackingStatus } from '@/components/tracking/TrackingStatus'
import { SummaryStatsCard } from '@/components/stats/StatsCard'
import { MotivationalQuotes } from '@/components/quotes/MotivationalQuotes'

// Utils
import { trackerAPI, statsAPI, foldersAPI, tasksAPI } from '@/lib/api'

export default function App() {
    // State
    const [folders, setFolders] = useState([])
    const [tasks, setTasks] = useState([])
    const [selectedFolderId, setSelectedFolderId] = useState(null)
    const [summaryStats, setSummaryStats] = useState(null)
    const [trackerStatus, setTrackerStatus] = useState(null)
    const [loading, setLoading] = useState(true)

    // Form state
    const [newFolderName, setNewFolderName] = useState('')
    const [newTaskTitle, setNewTaskTitle] = useState('')
    const [newTaskDescription, setNewTaskDescription] = useState('')

    // Rename state
    const [renamingFolderId, setRenamingFolderId] = useState(null)
    const [renameFolderValue, setRenameFolderValue] = useState('')

    // Task details state
    const [selectedTask, setSelectedTask] = useState(null)
    const [taskStats, setTaskStats] = useState(null)

    // Derived state
    const selectedFolder = useMemo(
        () => folders.find((f) => f.id === selectedFolderId) || null,
        [folders, selectedFolderId]
    )
    const inFolderView = selectedFolderId !== null

    // Data fetching
    useEffect(() => {
        fetchData()
        const interval = setInterval(fetchData, 5000)
        return () => clearInterval(interval)
    }, [selectedFolderId])

    const fetchData = async () => {
        try {
            // Fetch each endpoint independently to handle partial failures gracefully
            // Tracker status might fail with 503 if tracker isn't running
            try {
                const statusData = await trackerAPI.getStatus()
                setTrackerStatus(statusData)
            } catch (error) {
                console.log('Tracker status unavailable:', error.message)
                setTrackerStatus(null)
            }

            // Stats might also fail if tracker isn't available
            try {
                const summaryData = await statsAPI.getSummary()
                setSummaryStats(summaryData)
            } catch (error) {
                console.log('Stats unavailable:', error.message)
                setSummaryStats(null)
            }

            // Folders should always work
            try {
                const foldersData = await foldersAPI.list()
                setFolders(foldersData)
            } catch (error) {
                console.error('Error fetching folders:', error)
            }

            // Tasks for selected folder
            if (selectedFolderId !== null) {
                try {
                    const tasksData = await tasksAPI.list(selectedFolderId)
                    setTasks(tasksData.tasks || [])
                } catch (error) {
                    console.error('Error fetching tasks:', error)
                }
            } else {
                setTasks([])
            }

            setLoading(false)
        } catch (error) {
            console.error('Error fetching data:', error)
            setLoading(false)
        }
    }

    // Folder actions
    const handleCreateFolder = async () => {
        const name = newFolderName.trim()
        if (!name) return
        try {
            await foldersAPI.create(name)
            setNewFolderName('')
            fetchData()
        } catch (error) {
            alert(error.message)
        }
    }

    const handleRenameFolder = async (folderId) => {
        const name = renameFolderValue.trim()
        if (!name) return
        try {
            await foldersAPI.rename(folderId, name)
            setRenamingFolderId(null)
            setRenameFolderValue('')
            fetchData()
        } catch (error) {
            alert(error.message)
        }
    }

    const handleDeleteFolder = async (folderId) => {
        if (!confirm('Aww, are you sure you want to delete this cozy space? 🥺\nAll tasks inside will find a new home~')) return
        try {
            await foldersAPI.delete(folderId)
            if (selectedFolderId === folderId) setSelectedFolderId(null)
            fetchData()
        } catch (error) {
            alert(error.message)
        }
    }

    // Task actions
    const handleCreateTask = async () => {
        if (!newTaskTitle.trim() || selectedFolderId === null) return
        try {
            await tasksAPI.create(newTaskTitle, newTaskDescription, selectedFolderId)
            setNewTaskTitle('')
            setNewTaskDescription('')
            fetchData()
        } catch (error) {
            alert(error.message)
        }
    }

    const handleDeleteTask = async (taskId) => {
        if (!confirm('Aww, are you sure? 🥺\nThis adventure and all its memories will be gone~')) return
        try {
            await tasksAPI.delete(taskId)
            if (selectedTask?.id === taskId) {
                setSelectedTask(null)
                setTaskStats(null)
            }
            fetchData()
        } catch (error) {
            alert(error.message)
        }
    }

    const handleViewTaskDetails = async (task) => {
        setSelectedTask(task)
        try {
            const data = await tasksAPI.getStats(task.id)
            setTaskStats(data.stats)
        } catch (error) {
            console.error('Error fetching task stats:', error)
        }
    }

    // Tracker actions
    const handleStartTracking = async (taskId) => {
        try {
            await trackerAPI.start(taskId)
            fetchData()
        } catch (error) {
            alert(error.message)
        }
    }

    const handleStopTracking = async () => {
        try {
            await trackerAPI.stop()
            fetchData()
        } catch (error) {
            alert(error.message)
        }
    }

    // Export actions
    const handleExportPDF = async () => {
        if (!selectedFolderId) return
        try {
            const response = await foldersAPI.exportPDF(selectedFolderId)
            if (!response.ok) throw new Error('Export failed')
            const blob = await response.blob()
            downloadBlob(blob, `${selectedFolder?.name || 'folder'}.pdf`)
        } catch (error) {
            alert(error.message)
        }
    }

    const handleExportDetailsPDF = async () => {
        if (!selectedFolderId) return
        try {
            const response = await foldersAPI.exportDetailsPDF(selectedFolderId)
            if (!response.ok) throw new Error('Export failed')
            const blob = await response.blob()
            downloadBlob(blob, `${selectedFolder?.name || 'folder'}_details.pdf`)
        } catch (error) {
            alert(error.message)
        }
    }

    const downloadBlob = (blob, filename) => {
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(url)
    }

    // Reset task details when changing folders
    useEffect(() => {
        setSelectedTask(null)
        setTaskStats(null)
    }, [selectedFolderId])

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header trackerStatus={null} />
                <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                    <SkeletonList count={4} />
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col">
            <Header trackerStatus={trackerStatus} />

            <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                >
                    {/* Stats Card */}
                    <SummaryStatsCard summaryStats={summaryStats} selectedFolder={selectedFolder} />

                    {/* Motivational Quotes - only on home */}
                    {!inFolderView && <MotivationalQuotes />}

                    {/* Folder View or Task View */}
                    <AnimatePresence mode="wait">
                        {!inFolderView ? (
                            <motion.div
                                key="folders"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.2 }}
                            >
                                {/* Folders Section */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle emoji="🏠">
                                            Your Cozy Spaces
                                        </CardTitle>
                                    </CardHeader>

                                    {/* Create folder form */}
                                    <div className="flex gap-3 mb-6">
                                        <Input
                                            placeholder="Name your new space~ ✨"
                                            value={newFolderName}
                                            onChange={(e) => setNewFolderName(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
                                            className="flex-1"
                                        />
                                        <Button onClick={handleCreateFolder}>
                                            <FolderPlus className="h-4 w-4" />
                                            Create 💕
                                        </Button>
                                    </div>

                                    {/* Folders list */}
                                    {folders.length === 0 ? (
                                        <EmptyState
                                            emoji="🌙"
                                            title="No cozy spaces yet~"
                                            description="Create a space to organize your tasks and start your productivity journey! 🌸"
                                        />
                                    ) : (
                                        <div className="space-y-3">
                                            <AnimatePresence>
                                                {folders.map((folder) => (
                                                    <FolderCard
                                                        key={folder.id}
                                                        folder={folder}
                                                        isRenaming={renamingFolderId === folder.id}
                                                        renameValue={renameFolderValue}
                                                        onRenameChange={setRenameFolderValue}
                                                        onRenameSubmit={() => handleRenameFolder(folder.id)}
                                                        onRenameCancel={() => {
                                                            setRenamingFolderId(null)
                                                            setRenameFolderValue('')
                                                        }}
                                                        onStartRename={() => {
                                                            setRenamingFolderId(folder.id)
                                                            setRenameFolderValue(folder.name)
                                                        }}
                                                        onOpen={() => setSelectedFolderId(folder.id)}
                                                        onDelete={() => handleDeleteFolder(folder.id)}
                                                    />
                                                ))}
                                            </AnimatePresence>
                                        </div>
                                    )}
                                </Card>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="tasks"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-6"
                            >
                                {/* Navigation + Export */}
                                <div className="flex items-center justify-between gap-4 flex-wrap">
                                    <Button variant="outline" onClick={() => setSelectedFolderId(null)}>
                                        <ArrowLeft className="h-4 w-4" />
                                        Back home 🏠
                                    </Button>

                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="sm" onClick={handleExportPDF}>
                                            <Download className="h-4 w-4" />
                                            Export PDF
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={handleExportDetailsPDF}>
                                            <Download className="h-4 w-4" />
                                            Detailed PDF
                                        </Button>
                                    </div>
                                </div>

                                {/* Tracking Status */}
                                <TrackingStatus
                                    trackerStatus={trackerStatus}
                                    onStop={handleStopTracking}
                                />

                                {/* Tasks Section */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle emoji="✨">
                                            {selectedFolder?.name}'s Adventures
                                        </CardTitle>
                                    </CardHeader>

                                    {/* Create task form */}
                                    <div className="space-y-3 mb-6">
                                        <Input
                                            placeholder="What's your next adventure? 🚀"
                                            value={newTaskTitle}
                                            onChange={(e) => setNewTaskTitle(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleCreateTask()}
                                        />
                                        <Textarea
                                            placeholder="Add some details~ (optional) 📝"
                                            value={newTaskDescription}
                                            onChange={(e) => setNewTaskDescription(e.target.value)}
                                            rows={2}
                                        />
                                        <Button onClick={handleCreateTask} className="w-full sm:w-auto">
                                            <Plus className="h-4 w-4" />
                                            Add new adventure! ✨
                                        </Button>
                                    </div>

                                    {/* Tasks list */}
                                    {tasks.length === 0 ? (
                                        <EmptyState
                                            emoji="🌸"
                                            title="No adventures yet~"
                                            description="Add your first task and start something amazing! 💪"
                                        />
                                    ) : (
                                        <div className="space-y-3">
                                            <AnimatePresence>
                                                {tasks.map((task) => (
                                                    <TaskCard
                                                        key={task.id}
                                                        task={task}
                                                        isActive={trackerStatus?.running && trackerStatus?.task_id === task.id}
                                                        onStart={() => handleStartTracking(task.id)}
                                                        onViewDetails={() => handleViewTaskDetails(task)}
                                                        onDelete={() => handleDeleteTask(task.id)}
                                                    />
                                                ))}
                                            </AnimatePresence>
                                        </div>
                                    )}
                                </Card>

                                {/* Task Details Panel */}
                                <TaskDetailsPanel
                                    task={selectedTask}
                                    stats={taskStats}
                                    onClose={() => {
                                        setSelectedTask(null)
                                        setTaskStats(null)
                                    }}
                                    onUpdate={async () => {
                                        await fetchData()
                                        // Update the selected task object from the fresh list
                                        // We need the new list to be set first, but setState is async.
                                        // A better way: fetch the single task again or use the response from update if we had it.
                                        // But here, fetchData updates 'tasks'. We can just close and reopen or just find it.
                                        // Let's just fetch everything and try to update selectedTask if it still exists.
                                        const updatedTask = await tasksAPI.list(selectedFolderId).then(data => data.tasks.find(t => t.id === selectedTask.id))
                                        if (updatedTask) setSelectedTask(updatedTask)
                                    }}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </main>

            {/* Footer */}
            <footer className="border-t border-primary/10 py-6 text-center bg-white/50">
                <p className="text-sm text-text-muted">
                    Made with 💕 for your productivity journey
                </p>
            </footer>
        </div>
    )
}
