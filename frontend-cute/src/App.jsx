import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Briefcase, FolderPlus, Plus, ArrowLeft, Download } from 'lucide-react'

import { Header } from '@/components/layout/Header'
import { Button, Card, CardHeader, CardTitle, Input, Textarea, EmptyState, SkeletonList } from '@/components/ui'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { FolderCard } from '@/components/folders/FolderCard'
import { TaskCard } from '@/components/tasks/TaskCard'
import { TaskDetailsPanel } from '@/components/tasks/TaskDetailsPanel'
import { TrackingStatus } from '@/components/tracking/TrackingStatus'
import { SummaryStatsCard } from '@/components/stats/StatsCard'
import { AppCategoriesCard } from '@/components/stats/AppCategoriesCard'
import { MotivationalQuotes } from '@/components/quotes/MotivationalQuotes'
import { FocusFlow } from '@/components/stats/FocusFlow'
import { FocusGarden } from '@/components/stats/FocusGarden'
import { trackerAPI, statsAPI, projectsAPI, foldersAPI, tasksAPI } from '@/lib/api'

export default function App() {
    const [projects, setProjects] = useState([])
    const [folders, setFolders] = useState([])
    const [tasks, setTasks] = useState([])
    const [selectedProjectId, setSelectedProjectId] = useState(null)
    const [selectedFolderId, setSelectedFolderId] = useState(null)
    const [summaryStats, setSummaryStats] = useState(null)
    const [appCategories, setAppCategories] = useState([])
    const [trackerStatus, setTrackerStatus] = useState(null)
    const [loading, setLoading] = useState(true)

    const [newProjectName, setNewProjectName] = useState('')
    const [newFolderName, setNewFolderName] = useState('')
    const [newTaskTitle, setNewTaskTitle] = useState('')
    const [newTaskDescription, setNewTaskDescription] = useState('')

    const [renamingProjectId, setRenamingProjectId] = useState(null)
    const [renameProjectValue, setRenameProjectValue] = useState('')
    const [renamingFolderId, setRenamingFolderId] = useState(null)
    const [renameFolderValue, setRenameFolderValue] = useState('')

    const [selectedTask, setSelectedTask] = useState(null)
    const [taskStats, setTaskStats] = useState(null)
    const [showFocusFlow, setShowFocusFlow] = useState(false)
    const [showFocusGarden, setShowFocusGarden] = useState(false)

    const [currentTheme, setCurrentTheme] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') || 'theme-sakura'
        }
        return 'theme-sakura'
    })

    useEffect(() => {
        document.body.className = currentTheme
        localStorage.setItem('theme', currentTheme)
    }, [currentTheme])

    const selectedProject = useMemo(
        () => projects.find((project) => project.id === selectedProjectId) || null,
        [projects, selectedProjectId]
    )
    const selectedFolder = useMemo(
        () => folders.find((folder) => folder.id === selectedFolderId) || null,
        [folders, selectedFolderId]
    )

    const inProjectView = selectedProjectId !== null
    const inFolderView = selectedFolderId !== null

    useEffect(() => {
        fetchData()
        const interval = setInterval(fetchData, 5000)
        return () => clearInterval(interval)
    }, [selectedProjectId, selectedFolderId])

    useEffect(() => {
        setSelectedFolderId(null)
        setSelectedTask(null)
        setTaskStats(null)
    }, [selectedProjectId])

    useEffect(() => {
        setSelectedTask(null)
        setTaskStats(null)
    }, [selectedFolderId])

    const fetchData = async () => {
        try {
            try {
                const statusData = await trackerAPI.getStatus()
                setTrackerStatus(statusData)
            } catch (error) {
                console.log('Tracker status unavailable:', error.message)
                setTrackerStatus(null)
            }

            try {
                const summaryData = await statsAPI.getSummary()
                setSummaryStats(summaryData)
            } catch (error) {
                console.log('Stats unavailable:', error.message)
                setSummaryStats(null)
            }

            try {
                const categoryData = await statsAPI.getCategories()
                setAppCategories(categoryData.categories || [])
            } catch (error) {
                console.log('Category stats unavailable:', error.message)
                setAppCategories([])
            }

            try {
                const projectsData = await projectsAPI.list()
                setProjects(projectsData)
            } catch (error) {
                console.error('Error fetching projects:', error)
            }

            if (selectedProjectId !== null) {
                try {
                    const foldersData = await foldersAPI.list(selectedProjectId)
                    setFolders(foldersData)
                } catch (error) {
                    console.error('Error fetching folders:', error)
                }
            } else {
                setFolders([])
            }

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

    const handleCreateProject = async () => {
        const name = newProjectName.trim()
        if (!name) return
        try {
            await projectsAPI.create(name)
            setNewProjectName('')
            fetchData()
        } catch (error) {
            alert(error.message)
        }
    }

    const handleRenameProject = async (projectId) => {
        const name = renameProjectValue.trim()
        if (!name) return
        try {
            await projectsAPI.rename(projectId, name)
            setRenamingProjectId(null)
            setRenameProjectValue('')
            fetchData()
        } catch (error) {
            alert(error.message)
        }
    }

    const handleDeleteProject = async (projectId) => {
        if (!confirm('Delete this project? Its folders will move back to Cozy Projects, so tasks stay safe.')) return
        try {
            await projectsAPI.delete(projectId)
            if (selectedProjectId === projectId) {
                setSelectedProjectId(null)
                setSelectedFolderId(null)
            }
            fetchData()
        } catch (error) {
            alert(error.message)
        }
    }

    const handleCreateFolder = async () => {
        const name = newFolderName.trim()
        if (!name || selectedProjectId === null) return
        try {
            await foldersAPI.create(name, selectedProjectId)
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

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header
                    trackerStatus={null}
                    currentTheme={currentTheme}
                    onThemeChange={setCurrentTheme}
                    onToggleFocusFlow={() => setShowFocusFlow(true)}
                    onToggleFocusGarden={() => setShowFocusGarden(true)}
                />
                <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                    <SkeletonList count={4} />
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col">
            <Header
                trackerStatus={trackerStatus}
                currentTheme={currentTheme}
                onThemeChange={setCurrentTheme}
                onToggleFocusFlow={() => setShowFocusFlow(true)}
                onToggleFocusGarden={() => setShowFocusGarden(true)}
            />

            <FocusFlow isOpen={showFocusFlow} onClose={() => setShowFocusFlow(false)} />
            <FocusGarden isOpen={showFocusGarden} onClose={() => setShowFocusGarden(false)} />

            <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                >
                    <SummaryStatsCard summaryStats={summaryStats} selectedFolder={selectedFolder} />

                    {!inProjectView && <AppCategoriesCard categories={appCategories} />}
                    {!inProjectView && <MotivationalQuotes />}

                    <AnimatePresence mode="wait">
                        {!inProjectView ? (
                            <ProjectsView
                                projects={projects}
                                newProjectName={newProjectName}
                                setNewProjectName={setNewProjectName}
                                handleCreateProject={handleCreateProject}
                                renamingProjectId={renamingProjectId}
                                renameProjectValue={renameProjectValue}
                                setRenameProjectValue={setRenameProjectValue}
                                handleRenameProject={handleRenameProject}
                                setRenamingProjectId={setRenamingProjectId}
                                handleDeleteProject={handleDeleteProject}
                                setSelectedProjectId={setSelectedProjectId}
                            />
                        ) : !inFolderView ? (
                            <FoldersView
                                selectedProject={selectedProject}
                                folders={folders}
                                newFolderName={newFolderName}
                                setNewFolderName={setNewFolderName}
                                handleCreateFolder={handleCreateFolder}
                                renamingFolderId={renamingFolderId}
                                renameFolderValue={renameFolderValue}
                                setRenameFolderValue={setRenameFolderValue}
                                handleRenameFolder={handleRenameFolder}
                                setRenamingFolderId={setRenamingFolderId}
                                handleDeleteFolder={handleDeleteFolder}
                                setSelectedFolderId={setSelectedFolderId}
                                onBack={() => setSelectedProjectId(null)}
                            />
                        ) : (
                            <TasksView
                                selectedFolder={selectedFolder}
                                tasks={tasks}
                                trackerStatus={trackerStatus}
                                newTaskTitle={newTaskTitle}
                                setNewTaskTitle={setNewTaskTitle}
                                newTaskDescription={newTaskDescription}
                                setNewTaskDescription={setNewTaskDescription}
                                handleCreateTask={handleCreateTask}
                                handleStartTracking={handleStartTracking}
                                handleStopTracking={handleStopTracking}
                                handleDeleteTask={handleDeleteTask}
                                handleViewTaskDetails={handleViewTaskDetails}
                                handleExportPDF={handleExportPDF}
                                handleExportDetailsPDF={handleExportDetailsPDF}
                                selectedTask={selectedTask}
                                taskStats={taskStats}
                                setSelectedTask={setSelectedTask}
                                setTaskStats={setTaskStats}
                                selectedFolderId={selectedFolderId}
                                fetchData={fetchData}
                                onBack={() => setSelectedFolderId(null)}
                            />
                        )}
                    </AnimatePresence>
                </motion.div>
            </main>

            <footer className="border-t border-primary/10 py-6 text-center bg-white/50">
                <p className="text-sm text-text-muted">
                    Made with 💕 for your productivity journey
                </p>
            </footer>
        </div>
    )
}

function ProjectsView({
    projects,
    newProjectName,
    setNewProjectName,
    handleCreateProject,
    renamingProjectId,
    renameProjectValue,
    setRenameProjectValue,
    handleRenameProject,
    setRenamingProjectId,
    handleDeleteProject,
    setSelectedProjectId,
}) {
    return (
        <motion.div key="projects" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
            <Card>
                <CardHeader>
                    <CardTitle emoji="🧺">Your Cozy Projects</CardTitle>
                </CardHeader>

                <div className="flex gap-3 mb-6">
                    <Input
                        placeholder="Name your new project~ ✨"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleCreateProject()}
                        className="flex-1"
                    />
                    <Button onClick={handleCreateProject}>
                        <Briefcase className="h-4 w-4" />
                        Create 💕
                    </Button>
                </div>

                {projects.length === 0 ? (
                    <EmptyState
                        emoji="🌙"
                        title="No projects yet~"
                        description="Create a project, then fill it with cozy spaces and adventures! 🌸"
                    />
                ) : (
                    <div className="space-y-3">
                        <AnimatePresence>
                            {projects.map((project) => (
                                <ProjectCard
                                    key={project.id}
                                    project={project}
                                    isRenaming={renamingProjectId === project.id}
                                    renameValue={renameProjectValue}
                                    onRenameChange={setRenameProjectValue}
                                    onRenameSubmit={() => handleRenameProject(project.id)}
                                    onRenameCancel={() => {
                                        setRenamingProjectId(null)
                                        setRenameProjectValue('')
                                    }}
                                    onStartRename={() => {
                                        setRenamingProjectId(project.id)
                                        setRenameProjectValue(project.name)
                                    }}
                                    onOpen={() => setSelectedProjectId(project.id)}
                                    onDelete={() => handleDeleteProject(project.id)}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </Card>
        </motion.div>
    )
}

function FoldersView({
    selectedProject,
    folders,
    newFolderName,
    setNewFolderName,
    handleCreateFolder,
    renamingFolderId,
    renameFolderValue,
    setRenameFolderValue,
    handleRenameFolder,
    setRenamingFolderId,
    handleDeleteFolder,
    setSelectedFolderId,
    onBack,
}) {
    return (
        <motion.div key="folders" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-6">
            <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
                Back to projects 🏡
            </Button>

            <Card>
                <CardHeader>
                    <CardTitle emoji="🏠">
                        {selectedProject?.name || 'Project'}'s Cozy Spaces
                    </CardTitle>
                </CardHeader>

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

                {folders.length === 0 ? (
                    <EmptyState
                        emoji="🌙"
                        title="No cozy spaces yet~"
                        description="Create a folder inside this project to organize your tasks! 🌸"
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
    )
}

function TasksView({
    selectedFolder,
    tasks,
    trackerStatus,
    newTaskTitle,
    setNewTaskTitle,
    newTaskDescription,
    setNewTaskDescription,
    handleCreateTask,
    handleStartTracking,
    handleStopTracking,
    handleDeleteTask,
    handleViewTaskDetails,
    handleExportPDF,
    handleExportDetailsPDF,
    selectedTask,
    taskStats,
    setSelectedTask,
    setTaskStats,
    selectedFolderId,
    fetchData,
    onBack,
}) {
    return (
        <motion.div key="tasks" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <Button variant="outline" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4" />
                    Back to project 🧺
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

            <TrackingStatus trackerStatus={trackerStatus} onStop={handleStopTracking} />

            <Card>
                <CardHeader>
                    <CardTitle emoji="✨">
                        {selectedFolder?.name}'s Adventures
                    </CardTitle>
                </CardHeader>

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

            <TaskDetailsPanel
                task={selectedTask}
                stats={taskStats}
                onClose={() => {
                    setSelectedTask(null)
                    setTaskStats(null)
                }}
                onUpdate={async () => {
                    await fetchData()
                    const updatedTask = await tasksAPI.list(selectedFolderId).then(data => data.tasks.find(t => t.id === selectedTask.id))
                    if (updatedTask) setSelectedTask(updatedTask)
                }}
            />
        </motion.div>
    )
}
