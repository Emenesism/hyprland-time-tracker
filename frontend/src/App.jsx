import { useState, useEffect, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { Activity, Play, Square, Plus, Trash2, Eye, PieChart, BarChart3, Download, Calendar, Folder, FolderPlus, FolderOpen, Edit2, ArrowLeft, ChevronRight } from 'lucide-react'
import { PieChart as RechartsPie, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import './App.css'

const API_BASE = '/api'
const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899']

function App() {
    const [tasks, setTasks] = useState([])
    const [timeline, setTimeline] = useState([])
    const [folders, setFolders] = useState([])
    const [selectedFolderId, setSelectedFolderId] = useState(null)
    const selectedFolder = useMemo(() => folders.find(f => f.id === selectedFolderId) || null, [folders, selectedFolderId])
    const [newFolderName, setNewFolderName] = useState('')
    const [renamingFolderId, setRenamingFolderId] = useState(null)
    const [renameFolderValue, setRenameFolderValue] = useState('')
    const [summaryStats, setSummaryStats] = useState(null)
    const [trackerStatus, setTrackerStatus] = useState(null)
    const [newTaskTitle, setNewTaskTitle] = useState('')
    const [newTaskDescription, setNewTaskDescription] = useState('')
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [loading, setLoading] = useState(true)
    const [selectedTask, setSelectedTask] = useState(null)
    const [taskStats, setTaskStats] = useState(null)

    // (Export to PDF feature removed)

    useEffect(() => {
        fetchData()
        const interval = setInterval(fetchData, 5000)
        return () => clearInterval(interval)
    }, [selectedDate, selectedFolderId])

    const fetchData = async () => {
        try {
            const tasksPromise = selectedFolderId !== null
                ? fetch(`${API_BASE}/tasks?folder_id=${selectedFolderId}`)
                : Promise.resolve(null)

            const [statusRes, summaryRes, foldersRes, timelineRes, tasksRes] = await Promise.all([
                fetch(`${API_BASE}/tracker/status`),
                fetch(`${API_BASE}/stats/summary`),
                fetch(`${API_BASE}/folders`),
                fetch(`${API_BASE}/timeline?date=${selectedDate}`),
                tasksPromise
            ])

            const responses = [statusRes, summaryRes, foldersRes, timelineRes]
            if (!responses.every(res => res.ok) || (tasksRes && !tasksRes.ok)) {
                throw new Error('Failed to fetch data')
            }

            const [statusData, summaryData, foldersData, timelineData] = await Promise.all([
                statusRes.json(),
                summaryRes.json(),
                foldersRes.json(),
                timelineRes.json()
            ])

            setTrackerStatus(statusData)
            setSummaryStats(summaryData)
            setFolders(foldersData)
            setTimeline(timelineData.activities || [])

            if (tasksRes) {
                const tasksData = await tasksRes.json()
                setTasks(tasksData.tasks || [])
            } else {
                setTasks([])
            }

            setLoading(false)
        } catch (error) {
            console.error('Error fetching data:', error)
            setSummaryStats(null)
            setLoading(false)
        }
    }

    const createTask = async () => {
        if (!newTaskTitle.trim()) return
        if (selectedFolderId === null) {
            alert('Select a folder before creating tasks.')
            return
        }

        try {
            const url = new URL(`${API_BASE}/tasks`, window.location.origin)
            url.searchParams.append('title', newTaskTitle)
            if (newTaskDescription.trim()) {
                url.searchParams.append('description', newTaskDescription)
            }
            url.searchParams.append('folder_id', selectedFolderId)

            const response = await fetch(url.toString(), {
                method: 'POST'
            })

            if (response.ok) {
                setNewTaskTitle('')
                setNewTaskDescription('')
                fetchData()
            }
        } catch (error) {
            console.error('Error creating task:', error)
        }
    }

    const startTracking = async (taskId) => {
        try {
            await fetch(`${API_BASE}/tracker/start?task_id=${taskId}`, {
                method: 'POST'
            })
            fetchData()
        } catch (error) {
            console.error('Error starting tracking:', error)
        }
    }

    const stopTracking = async () => {
        try {
            await fetch(`${API_BASE}/tracker/stop`, {
                method: 'POST'
            })
            fetchData()
        } catch (error) {
            console.error('Error stopping tracking:', error)
        }
    }

    const deleteTask = async (taskId) => {
        if (!confirm('Are you sure you want to delete this task? All associated activities will be removed.')) {
            return
        }

        try {
            await fetch(`${API_BASE}/tasks/${taskId}`, {
                method: 'DELETE'
            })
            if (selectedTask?.id === taskId) {
                setSelectedTask(null)
                setTaskStats(null)
            }
            fetchData()
        } catch (error) {
            console.error('Error deleting task:', error)
        }
    }

    const viewTaskDetails = async (task) => {
        setSelectedTask(task)
        try {
            const response = await fetch(`${API_BASE}/tasks/${task.id}/stats`)
            const data = await response.json()
            setTaskStats(data.stats)
        } catch (error) {
            console.error('Error fetching task stats:', error)
        }
    }

    useEffect(() => {
        setSelectedTask(null)
        setTaskStats(null)
    }, [selectedFolderId])

    const handleCreateFolder = async () => {
        const name = newFolderName.trim()
        if (!name) return

        try {
            const response = await fetch(`${API_BASE}/folders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                alert(errorData.detail || 'Failed to create folder')
                return
            }

            setNewFolderName('')
            fetchData()
        } catch (error) {
            console.error('Error creating folder:', error)
        }
    }

    const handleRenameFolder = async (folderId) => {
        const name = renameFolderValue.trim()
        if (!name) return

        try {
            const response = await fetch(`${API_BASE}/folders/${folderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                alert(errorData.detail || 'Failed to rename folder')
                return
            }

            setRenamingFolderId(null)
            setRenameFolderValue('')
            fetchData()
        } catch (error) {
            console.error('Error renaming folder:', error)
        }
    }

    const handleDeleteFolder = async (folderId) => {
        if (!confirm('Delete this folder? All tasks inside will move to the default folder.')) {
            return
        }

        try {
            const response = await fetch(`${API_BASE}/folders/${folderId}`, {
                method: 'DELETE'
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                alert(errorData.detail || 'Failed to delete folder')
                return
            }

            if (selectedFolderId === folderId) {
                setSelectedFolderId(null)
            }
            fetchData()
        } catch (error) {
            console.error('Error deleting folder:', error)
        }
    }

    const moveTaskToFolder = async (taskId, folderId) => {
        try {
            const response = await fetch(`${API_BASE}/tasks/${taskId}/move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder_id: folderId })
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                alert(errorData.detail || 'Failed to move task')
                return
            }

            fetchData()
        } catch (error) {
            console.error('Error moving task:', error)
        }
    }

    const handleBackToFolders = () => {
        setSelectedFolderId(null)
    }

    // Export all tasks for a folder as a PDF
    const exportFolderPDF = async (folderId) => {
        if (!folderId) return
        try {
            const response = await fetch(`${API_BASE}/export/folder/${folderId}/pdf`)

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                alert(errorData.detail || 'Failed to export PDF')
                return
            }

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${selectedFolder?.name || 'folder'}.pdf`
            document.body.appendChild(a)
            a.click()
            a.remove()
            window.URL.revokeObjectURL(url)
        } catch (error) {
            console.error('Export error', error)
            alert('Export failed')
        }
    }

    // Export folder tasks as a detail-only PDF (first page folder name only,
    // subsequent pages list task title + description, no durations)
    const exportFolderDetailsPDF = async (folderId) => {
        if (!folderId) return
        try {
            const response = await fetch(`${API_BASE}/export/folder/${folderId}/details.pdf`)

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                alert(errorData.detail || 'Failed to export details PDF')
                return
            }

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${selectedFolder?.name || 'folder'}_details.pdf`
            document.body.appendChild(a)
            a.click()
            a.remove()
            window.URL.revokeObjectURL(url)
        } catch (error) {
            console.error('Export details error', error)
            alert('Export failed')
        }
    }

    // exportToPDF function removed

    const formatDuration = (seconds) => {
        if (!seconds) return '0s'
        const hours = Math.floor(seconds / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        const secs = Math.floor(seconds % 60)

        if (hours > 0) return `${hours}h ${minutes}m`
        if (minutes > 0) return `${minutes}m ${secs}s`
        return `${secs}s`
    }

    const formatHours = (seconds, precision = 1) => {
        if (!seconds) return '0'
        const hours = seconds / 3600
        const digits = hours >= 10 ? precision : Math.max(precision, 2)
        return parseFloat(hours.toFixed(digits)).toString()
    }

    const formatTime = (timestamp) => {
        if (!timestamp) return 'N/A'
        try {
            return format(parseISO(timestamp), 'HH:mm:ss')
        } catch {
            return timestamp
        }
    }

    const getInitials = (name) => {
        if (!name) return '??'
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }

    if (loading) {
        return (
            <div className="app">
                <div className="loading">Loading...</div>
            </div>
        )
    }

    const last30DaysSeconds = summaryStats?.last_30_days_time ?? 0
    const last30DaysHours = formatHours(last30DaysSeconds)
    const last30DaysAverageHours = last30DaysSeconds ? formatHours(last30DaysSeconds / 30) : '0'
    const inFolderView = selectedFolderId !== null

    return (
        <div className="app">
            <header className="header">
                <div className="header-content">
                    <div>
                        <h1>
                            <Activity className="icon" />
                            Time Tracker
                        </h1>
                        <p>Manual Task-Based Tracking</p>
                    </div>
                    <div className="tracker-status">
                        {trackerStatus?.running ? (
                            <div className="status-badge status-active">
                                <div className="pulse"></div>
                                Tracking Active
                            </div>
                        ) : (
                            <div className="status-badge status-inactive">
                                Inactive
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="main">
                {summaryStats && (
                    <div className="card highlight-card">
                        <div className="highlight-main">
                            <div className="highlight-icon">
                                <Calendar size={32} />
                            </div>
                            <div>
                                <p className="highlight-label">Last 30 Days</p>
                                <p className="highlight-value">{last30DaysHours} hrs</p>
                                <p className="highlight-muted">{formatDuration(last30DaysSeconds)} tracked</p>
                            </div>
                        </div>
                        <div className="highlight-meta">
                            <span className="highlight-meta-label">Avg / day</span>
                            <span className="highlight-meta-value">{last30DaysAverageHours} hrs</span>
                        </div>
                    </div>
                )}

                {/* Export to PDF UI removed */}

                {!inFolderView ? (
                    /* Folders Overview */
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">
                                <Folder size={20} style={{ marginRight: '8px' }} />
                                Folders
                            </h2>
                        </div>

                        <div className="create-task" style={{ marginBottom: '1.5rem' }}>
                            <input
                                type="text"
                                placeholder="New folder name..."
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
                                className="task-input"
                                style={{ flex: 1 }}
                            />
                            <button onClick={handleCreateFolder} className="btn btn-primary">
                                <FolderPlus size={18} />
                                Create Folder
                            </button>
                        </div>

                        <div className="folders-list">
                            {folders.length === 0 ? (
                                <p className="no-data">No folders yet. Create one to organize your tasks!</p>
                            ) : (
                                folders.map((folder) => (
                                    <div key={folder.id} className="folder-card-item">
                                        <div className="folder-icon">
                                            <FolderOpen size={24} />
                                        </div>
                                        <div className="folder-info">
                                            {renamingFolderId === folder.id ? (
                                                <div className="folder-rename-wrapper">
                                                    <input
                                                        type="text"
                                                        value={renameFolderValue}
                                                        onChange={(e) => setRenameFolderValue(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault()
                                                                handleRenameFolder(folder.id)
                                                            }
                                                            if (e.key === 'Escape') {
                                                                setRenamingFolderId(null)
                                                                setRenameFolderValue('')
                                                            }
                                                        }}
                                                        autoFocus
                                                        className="folder-rename-input"
                                                    />
                                                    <div className="folder-rename-actions">
                                                        <button
                                                            onClick={() => handleRenameFolder(folder.id)}
                                                            className="btn btn-primary btn-small"
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setRenamingFolderId(null)
                                                                setRenameFolderValue('')
                                                            }}
                                                            className="btn btn-secondary btn-small"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <h3 onClick={() => setSelectedFolderId(folder.id)} style={{ cursor: 'pointer' }}>
                                                    {folder.name}
                                                </h3>
                                            )}
                                            <p className="folder-meta">
                                                {folder.task_count} task{folder.task_count !== 1 ? 's' : ''} · {formatDuration(folder.total_duration)} tracked
                                            </p>
                                        </div>
                                        <div className="folder-actions">
                                            <button
                                                onClick={() => {
                                                    setRenamingFolderId(folder.id)
                                                    setRenameFolderValue(folder.name)
                                                }}
                                                className="btn btn-secondary"
                                                title="Rename Folder"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => setSelectedFolderId(folder.id)}
                                                className="btn btn-primary"
                                                title="Open Folder"
                                            >
                                                <ChevronRight size={18} />
                                                Open
                                            </button>
                                            <button
                                                onClick={() => handleDeleteFolder(folder.id)}
                                                className="btn btn-danger-outline"
                                                title="Delete Folder"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ) : (
                    /* Folder View - Tasks */
                    <>
                        <div className="card">
                            <div className="card-header">
                                <button onClick={handleBackToFolders} className="btn btn-secondary">
                                    <ArrowLeft size={18} />
                                    Back to Folders
                                </button>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <h2 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                                            <FolderOpen size={20} style={{ marginRight: '8px' }} />
                                            {selectedFolder?.name || 'Folder'}
                                        </h2>
                                    </div>

                                    <div className="mehr-section">
                                        <div className="mehr-title">Mehr</div>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <button
                                                className="btn btn-export"
                                                onClick={() => exportFolderPDF(selectedFolderId)}
                                                title="Export folder to PDF"
                                            >
                                                <Download size={16} style={{ marginRight: '6px' }} />
                                                Export PDF
                                            </button>

                                            <button
                                                className="btn btn-export"
                                                onClick={() => exportFolderDetailsPDF(selectedFolderId)}
                                                title="Export folder tasks (details only) as PDF"
                                            >
                                                <Download size={16} style={{ marginRight: '6px' }} />
                                                Export Details
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <h2 className="card-title">Current Tracking</h2>
                            {trackerStatus?.running ? (
                                <div className="current-tracking">
                                    <div className="tracking-info">
                                        <p><strong>Task ID:</strong> {trackerStatus.task_id}</p>
                                        <p><strong>Current App:</strong> {trackerStatus.current_app || 'None'}</p>
                                        <p><strong>Window:</strong> {trackerStatus.current_window || 'N/A'}</p>
                                    </div>
                                    <button onClick={stopTracking} className="btn btn-danger">
                                        <Square size={18} />
                                        Stop Tracking
                                    </button>
                                </div>
                            ) : (
                                <p className="no-tracking">No active tracking. Start a task below.</p>
                            )}
                        </div>

                        <div className="card">
                            <h2 className="card-title">Tasks</h2>

                            <div className="create-task">
                                <div className="task-input-group">
                                    <input
                                        type="text"
                                        placeholder="Enter task name..."
                                        value={newTaskTitle}
                                        onChange={(e) => setNewTaskTitle(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && createTask()}
                                        className="task-input"
                                    />
                                    <textarea
                                        placeholder="Enter task description (optional)..."
                                        value={newTaskDescription}
                                        onChange={(e) => setNewTaskDescription(e.target.value)}
                                        className="task-description-input"
                                        rows="2"
                                    />
                                </div>
                                <button onClick={createTask} className="btn btn-primary">
                                    <Plus size={18} />
                                    Create Task
                                </button>
                            </div>

                            <div className="tasks-list">
                                {tasks.length === 0 ? (
                                    <p className="no-data">No tasks yet. Create one to start tracking!</p>
                                ) : (
                                    tasks.map((task) => (
                                        <div key={task.id} className="task-card-item">
                                            <div className="task-info">
                                                <h3>{task.title}</h3>
                                                {task.description && (
                                                    <p className="task-description">{task.description}</p>
                                                )}
                                                <p className="task-meta">
                                                    Created: {format(parseISO(task.created_at), 'MMM dd, yyyy HH:mm')}
                                                </p>
                                            </div>
                                            <div className="task-actions">
                                                <button
                                                    onClick={() => viewTaskDetails(task)}
                                                    className="btn btn-info"
                                                    title="View Details"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button
                                                    onClick={() => startTracking(task.id)}
                                                    className="btn btn-success"
                                                    disabled={trackerStatus?.running && trackerStatus?.task_id === task.id}
                                                >
                                                    <Play size={18} />
                                                    {trackerStatus?.running && trackerStatus?.task_id === task.id ? 'Active' : 'Start'}
                                                </button>
                                                <button
                                                    onClick={() => deleteTask(task.id)}
                                                    className="btn btn-danger-outline"
                                                    title="Delete Task"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Task Details Modal/Panel (inside folder view) */}
                        {selectedTask && (
                            <div className="card task-details-card">
                                <div className="card-header">
                                    <h2 className="card-title">
                                        <Activity size={20} style={{ marginRight: '8px' }} />
                                        {selectedTask.title}
                                    </h2>
                                    <button onClick={() => { setSelectedTask(null); setTaskStats(null) }} className="btn btn-secondary">
                                        Close
                                    </button>
                                </div>

                                {taskStats && (
                                    <>
                                        <div className="stats-summary">
                                            <div className="stat-box">
                                                <h4>Total Time</h4>
                                                <p className="stat-value">{formatDuration(taskStats.total_time)}</p>
                                            </div>
                                            <div className="stat-box">
                                                <h4>Activities</h4>
                                                <p className="stat-value">{taskStats.activity_count}</p>
                                            </div>
                                            <div className="stat-box">
                                                <h4>Apps Used</h4>
                                                <p className="stat-value">{taskStats.apps.length}</p>
                                            </div>
                                        </div>

                                        {taskStats.apps.length > 0 && (
                                            <>
                                                <h3 className="section-title">
                                                    <PieChart size={20} />
                                                    Time Distribution by App
                                                </h3>
                                                <div className="chart-container">
                                                    <ResponsiveContainer width="100%" height={300}>
                                                        <RechartsPie>
                                                            <Pie
                                                                data={taskStats.apps}
                                                                dataKey="total_duration"
                                                                nameKey="app_name"
                                                                cx="50%"
                                                                cy="50%"
                                                                innerRadius={40}
                                                                outerRadius={100}
                                                                paddingAngle={2}
                                                            >
                                                                {taskStats.apps.map((entry, index) => (
                                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip
                                                                formatter={(value, name) => [formatDuration(value), name]}
                                                                contentStyle={{
                                                                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                                                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                                                    borderRadius: '8px',
                                                                    padding: '8px 12px',
                                                                    color: '#ffffff'
                                                                }}
                                                                labelStyle={{
                                                                    color: '#ffffff'
                                                                }}
                                                                itemStyle={{
                                                                    color: '#ffffff'
                                                                }}
                                                            />
                                                        </RechartsPie>
                                                    </ResponsiveContainer>
                                                </div>

                                                <div className="pie-legend">
                                                    {taskStats.apps.map((app, idx) => {
                                                        const total = taskStats.apps.reduce((sum, a) => sum + a.total_duration, 0)
                                                        const percentage = Math.round((app.total_duration / total) * 100)
                                                        return (
                                                            <div key={idx} className="pie-legend-item">
                                                                <div
                                                                    className="pie-legend-color"
                                                                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                                                                />
                                                                <span className="pie-legend-name">{app.app_name}</span>
                                                                <span className="pie-legend-value">{percentage}% · {formatDuration(app.total_duration)}</span>
                                                            </div>
                                                        )
                                                    })}
                                                </div>

                                                <h3 className="section-title">
                                                    <BarChart3 size={20} />
                                                    App Usage Details
                                                </h3>
                                                <div className="chart-container">
                                                    <ResponsiveContainer width="100%" height={300}>
                                                        <BarChart data={taskStats.apps}>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                                                            <XAxis dataKey="app_name" stroke="#ffffff80" />
                                                            <YAxis stroke="#ffffff80" tickFormatter={(value) => formatDuration(value)} />
                                                            <Tooltip formatter={(value) => formatDuration(value)} />
                                                            <Bar dataKey="total_duration" fill="#8b5cf6" />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>

                                                <h3 className="section-title">Application Breakdown</h3>
                                                <div className="apps-breakdown">
                                                    {taskStats.apps.map((app, idx) => (
                                                        <div key={idx} className="app-breakdown-item">
                                                            <div className="app-breakdown-info">
                                                                <div className="app-breakdown-icon" style={{ backgroundColor: COLORS[idx % COLORS.length] }}>
                                                                    {getInitials(app.app_name)}
                                                                </div>
                                                                <div>
                                                                    <h4>{app.app_name}</h4>
                                                                    <p>{app.session_count} session{app.session_count > 1 ? 's' : ''}</p>
                                                                </div>
                                                            </div>
                                                            <div className="app-breakdown-time">
                                                                {formatDuration(app.total_duration)}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </>
                )}
            </main>

            <footer className="footer">
                <p>Time Tracker for Arch Linux + Hyprland | Manual Task-Based Tracking</p>
            </footer>
        </div>
    )
}

export default App
