import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { Activity, Play, Square, Plus, Trash2, Eye, PieChart, BarChart3, ChevronDown, ChevronUp } from 'lucide-react'
import { PieChart as RechartsPie, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import './App.css'

const API_BASE = '/api'
const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899']

function App() {
    const [tasks, setTasks] = useState([])
    const [timeline, setTimeline] = useState([])
    const [trackerStatus, setTrackerStatus] = useState(null)
    const [newTaskTitle, setNewTaskTitle] = useState('')
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [loading, setLoading] = useState(true)
    const [selectedTask, setSelectedTask] = useState(null)
    const [taskStats, setTaskStats] = useState(null)
    const [collapsedTimelines, setCollapsedTimelines] = useState({})

    useEffect(() => {
        fetchData()
        const interval = setInterval(fetchData, 5000)
        return () => clearInterval(interval)
    }, [selectedDate])

    const fetchData = async () => {
        try {
            const [tasksRes, timelineRes, statusRes] = await Promise.all([
                fetch(`${API_BASE}/tasks`),
                fetch(`${API_BASE}/timeline?date=${selectedDate}`),
                fetch(`${API_BASE}/tracker/status`),
            ])

            const tasksData = await tasksRes.json()
            const timelineData = await timelineRes.json()
            const statusData = await statusRes.json()

            setTasks(tasksData.tasks || [])
            setTimeline(timelineData.activities || [])
            setTrackerStatus(statusData)
            setLoading(false)
        } catch (error) {
            console.error('Error fetching data:', error)
            setLoading(false)
        }
    }

    const createTask = async () => {
        if (!newTaskTitle.trim()) return

        try {
            const response = await fetch(`${API_BASE}/tasks?title=${encodeURIComponent(newTaskTitle)}`, {
                method: 'POST'
            })

            if (response.ok) {
                setNewTaskTitle('')
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

    const toggleTimeline = (taskId) => {
        setCollapsedTimelines(prev => ({
            ...prev,
            [taskId]: !prev[taskId]
        }))
    }

    const formatDuration = (seconds) => {
        if (!seconds) return '0s'
        const hours = Math.floor(seconds / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        const secs = Math.floor(seconds % 60)

        if (hours > 0) return `${hours}h ${minutes}m`
        if (minutes > 0) return `${minutes}m ${secs}s`
        return `${secs}s`
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

    const timelineByTask = timeline.reduce((acc, activity) => {
        const taskId = activity.task_id || 'unknown'
        if (!acc[taskId]) {
            acc[taskId] = []
        }
        acc[taskId].push(activity)
        return acc
    }, {})

    if (loading) {
        return (
            <div className="app">
                <div className="loading">Loading...</div>
            </div>
        )
    }

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
                        <input
                            type="text"
                            placeholder="Enter task title..."
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && createTask()}
                            className="task-input"
                        />
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

                {/* Task Details Modal/Panel */}
                {selectedTask && (
                    <div className="card task-details-card">
                        <div className="card-header">
                            <h2 className="card-title">
                                <Activity size={20} style={{ marginRight: '8px' }} />
                                {selectedTask.title}
                            </h2>
                            <button onClick={() => {setSelectedTask(null); setTaskStats(null)}} className="btn btn-secondary">
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
                                                        outerRadius={80}
                                                        label={(entry) => `${entry.app_name}: ${Math.round((entry.total_duration / taskStats.total_time) * 100)}%`}
                                                    >
                                                        {taskStats.apps.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip formatter={(value) => formatDuration(value)} />
                                                </RechartsPie>
                                            </ResponsiveContainer>
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

                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Timeline for {selectedDate}</h2>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="date-picker"
                        />
                    </div>

                    {Object.keys(timelineByTask).length === 0 ? (
                        <p className="no-data">No activities tracked yet.</p>
                    ) : (
                        Object.entries(timelineByTask).map(([taskId, activities]) => {
                            const task = tasks.find(t => t.id === parseInt(taskId))
                            const isCollapsed = collapsedTimelines[taskId]
                            return (
                                <div key={taskId} className="task-timeline">
                                    <div className="timeline-task-header">
                                        <h3 className="timeline-task-title">
                                            Task: {task?.title || `ID ${taskId}`} ({activities.length} activities)
                                        </h3>
                                        <button
                                            onClick={() => toggleTimeline(taskId)}
                                            className="btn btn-secondary btn-collapse"
                                            title={isCollapsed ? 'Expand' : 'Collapse'}
                                        >
                                            {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                                        </button>
                                    </div>
                                    {!isCollapsed && (
                                        <div className="timeline">
                                            {activities.map((activity) => (
                                                <div key={activity.id} className="timeline-item">
                                                    <div className="timeline-time">{formatTime(activity.start_time)}</div>
                                                    <div className="timeline-icon">
                                                        <div className="timeline-initials">{getInitials(activity.app_name)}</div>
                                                    </div>
                                                    <div className="timeline-content">
                                                        <h4>{activity.app_name}</h4>
                                                        {activity.duration && (
                                                            <span className="timeline-duration">{formatDuration(activity.duration)}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    )}
                </div>
            </main>

            <footer className="footer">
                <p>Time Tracker for Arch Linux + Hyprland | Manual Task-Based Tracking</p>
            </footer>
        </div>
    )
}

export default App
