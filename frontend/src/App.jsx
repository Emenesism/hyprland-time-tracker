import { useState, useEffect } from 'react'
import {
    BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { format, startOfWeek, parseISO } from 'date-fns'
import {
    Clock, Activity, Calendar, TrendingUp, Zap,
    Monitor, BarChart3, PieChart as PieChartIcon
} from 'lucide-react'
import './App.css'

const API_BASE = '/api'

function App() {
    const [summary, setSummary] = useState(null)
    const [dailyStats, setDailyStats] = useState([])
    const [weeklyStats, setWeeklyStats] = useState({})
    const [timeline, setTimeline] = useState([])
    const [applications, setApplications] = useState([])
    const [trackerStatus, setTrackerStatus] = useState(null)
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('overview')

    useEffect(() => {
        fetchData()
        const interval = setInterval(fetchData, 10000) // Refresh every 10 seconds
        return () => clearInterval(interval)
    }, [selectedDate])

    const fetchData = async () => {
        try {
            const [summaryRes, dailyRes, weeklyRes, timelineRes, appsRes, statusRes] = await Promise.all([
                fetch(`${API_BASE}/stats/summary`),
                fetch(`${API_BASE}/stats/daily?date=${selectedDate}`),
                fetch(`${API_BASE}/stats/weekly`),
                fetch(`${API_BASE}/timeline?date=${selectedDate}&limit=50`),
                fetch(`${API_BASE}/applications`),
                fetch(`${API_BASE}/tracker/status`),
            ])

            const summaryData = await summaryRes.json()
            const dailyData = await dailyRes.json()
            const weeklyData = await weeklyRes.json()
            const timelineData = await timelineRes.json()
            const appsData = await appsRes.json()
            const statusData = await statusRes.json()

            setSummary(summaryData)
            setDailyStats(dailyData.statistics || [])
            setWeeklyStats(weeklyData.statistics || {})
            setTimeline(timelineData.activities || [])
            setApplications(appsData.applications || [])
            setTrackerStatus(statusData)
            setLoading(false)
        } catch (error) {
            console.error('Error fetching data:', error)
            setLoading(false)
        }
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

    const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6']

    const RADIAN = Math.PI / 180
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
        const radius = outerRadius + 18
        const x = cx + radius * Math.cos(-midAngle * RADIAN)
        const y = cy + radius * Math.sin(-midAngle * RADIAN)
        const label = dailyStats && dailyStats[index] ? dailyStats[index].app_name : ''
        return (
            <text x={x} y={y} fill="#ffffff" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" style={{ fontSize: 12 }}>
                {`${label} ${(percent * 100).toFixed(0)}%`}
            </text>
        )
    }

    // Helper: slugify app name for icon filename
    const slugify = (name) => {
        if (!name) return 'unknown'
        return name.toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9\-]/g, '')
            .replace(/-+/g, '-')
    }

    const getInitials = (name) => {
        if (!name) return '??'
        const parts = name.split(/\s+/).filter(Boolean)
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
        return (parts[0][0] + parts[1][0]).toUpperCase()
    }

    if (loading) {
        return (
            <div className="app">
                <div className="loading">
                    <Zap size={48} className="loading-icon" />
                    <p>Loading Time Tracker...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="app">
            {/* Header */}
            <header className="header">
                <div className="header-content">
                    <div className="header-left">
                        <Clock size={32} className="logo-icon" />
                        <h1>Time Tracker</h1>
                    </div>
                    <div className="header-right">
                        {trackerStatus && (
                            <div className={`tracker-status ${trackerStatus.running ? 'active' : 'inactive'}`}>
                                <div className="status-dot"></div>
                                <span>
                                    {trackerStatus.running
                                        ? trackerStatus.current_app || 'Tracking...'
                                        : 'Inactive'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Navigation Tabs */}
            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    <TrendingUp size={18} />
                    Overview
                </button>
                <button
                    className={`tab ${activeTab === 'daily' ? 'active' : ''}`}
                    onClick={() => setActiveTab('daily')}
                >
                    <Calendar size={18} />
                    Daily
                </button>
                <button
                    className={`tab ${activeTab === 'weekly' ? 'active' : ''}`}
                    onClick={() => setActiveTab('weekly')}
                >
                    <BarChart3 size={18} />
                    Weekly
                </button>
                <button
                    className={`tab ${activeTab === 'apps' ? 'active' : ''}`}
                    onClick={() => setActiveTab('apps')}
                >
                    <Monitor size={18} />
                    Applications
                </button>
            </div>

            {/* Main Content */}
            <main className="main-content">
                {/* Overview Tab */}
                {activeTab === 'overview' && summary && (
                    <div className="overview-tab">
                        {/* Summary Cards */}
                        <div className="stats-grid">
                            <div className="stat-card purple">
                                <div className="stat-icon">
                                    <Clock size={24} />
                                </div>
                                <div className="stat-content">
                                    <h3>Total Time Tracked</h3>
                                    <p className="stat-value">{formatDuration(summary.total_time)}</p>
                                </div>
                            </div>

                            <div className="stat-card cyan">
                                <div className="stat-icon">
                                    <Activity size={24} />
                                </div>
                                <div className="stat-content">
                                    <h3>Today's Activity</h3>
                                    <p className="stat-value">{formatDuration(summary.today_time)}</p>
                                </div>
                            </div>

                            <div className="stat-card green">
                                <div className="stat-icon">
                                    <TrendingUp size={24} />
                                </div>
                                <div className="stat-content">
                                    <h3>This Week</h3>
                                    <p className="stat-value">{formatDuration(summary.week_time)}</p>
                                </div>
                            </div>

                            <div className="stat-card orange">
                                <div className="stat-icon">
                                    <Monitor size={24} />
                                </div>
                                <div className="stat-content">
                                    <h3>Applications</h3>
                                    <p className="stat-value">{summary.total_applications}</p>
                                </div>
                            </div>
                        </div>

                        {/* Top Applications Today */}
                        <div className="card">
                            <h2 className="card-title">Top Applications Today</h2>
                            <div className="chart-container">
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={dailyStats.slice(0, 10)}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis dataKey="app_name" stroke="#888" />
                                        <YAxis stroke="#888" tickFormatter={(value) => formatDuration(value)} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                                            formatter={(value) => formatDuration(value)}
                                        />
                                        <Bar dataKey="total_duration" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Time Distribution Pie Chart */}
                        <div className="card">
                            <h2 className="card-title">Time Distribution Today</h2>
                            <div className="chart-container">
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={dailyStats.slice(0, 8)}
                                            dataKey="total_duration"
                                            nameKey="app_name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={6}
                                            labelLine={false}
                                            label={renderCustomizedLabel}
                                        >
                                            {dailyStats.slice(0, 8).map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                                            formatter={(value) => formatDuration(value)}
                                        />
                                        <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ color: '#fff' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {/* Daily Tab */}
                {activeTab === 'daily' && (
                    <div className="daily-tab">
                        <div className="date-selector">
                            <label htmlFor="date-input">Select Date:</label>
                            <input
                                id="date-input"
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                max={format(new Date(), 'yyyy-MM-dd')}
                            />
                        </div>

                        <div className="card">
                            <h2 className="card-title">Activity Timeline - {selectedDate}</h2>
                            <div className="timeline-container">
                                {timeline.length === 0 ? (
                                    <p className="no-data">No activities recorded for this date.</p>
                                ) : (
                                    <div className="timeline-list">
                                        {timeline.map((activity) => {
                                            const slug = slugify(activity.app_name)
                                            const iconUrl = `/assets/icons/${slug}.png`
                                            return (
                                                <div key={activity.id} className="timeline-item">
                                                    <div className="timeline-time">{formatTime(activity.start_time)}</div>
                                                    <div className="timeline-icon">
                                                        <img src={iconUrl} alt={activity.app_name} onError={(e) => { e.currentTarget.style.display = 'none' }} />
                                                        <div className="timeline-initials">{getInitials(activity.app_name)}</div>
                                                    </div>
                                                    <div className="timeline-content">
                                                        <h4>{activity.app_name}</h4>
                                                        {activity.duration && (
                                                            <span className="timeline-duration">{formatDuration(activity.duration)}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="card">
                            <h2 className="card-title">Daily Statistics - {selectedDate}</h2>
                            <div className="stats-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Application</th>
                                            <th>Sessions</th>
                                            <th>Total Time</th>
                                            <th>Avg Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dailyStats.map((stat, index) => (
                                            <tr key={index}>
                                                <td><strong>{stat.app_name}</strong></td>
                                                <td>{stat.session_count}</td>
                                                <td>{formatDuration(stat.total_duration)}</td>
                                                <td>{formatDuration(stat.avg_duration)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Weekly Tab */}
                {activeTab === 'weekly' && (
                    <div className="weekly-tab">
                        <div className="card">
                            <h2 className="card-title">Weekly Activity Trend</h2>
                            <div className="chart-container">
                                {Object.keys(weeklyStats).length === 0 ? (
                                    <p className="no-data">No weekly data available.</p>
                                ) : (
                                    <ResponsiveContainer width="100%" height={400}>
                                        <LineChart
                                            data={Object.entries(weeklyStats).map(([date, apps]) => ({
                                                date,
                                                total: apps.reduce((sum, app) => sum + app.total_duration, 0)
                                            })).reverse()}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                            <XAxis dataKey="date" stroke="#888" />
                                            <YAxis stroke="#888" tickFormatter={(value) => formatDuration(value)} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                                                formatter={(value) => formatDuration(value)}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="total"
                                                stroke="#8b5cf6"
                                                strokeWidth={2}
                                                dot={{ fill: '#8b5cf6', r: 4 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        <div className="card">
                            <h2 className="card-title">Weekly Breakdown by Application</h2>
                            <div className="weekly-breakdown">
                                {Object.entries(weeklyStats).reverse().map(([date, apps]) => (
                                    <div key={date} className="weekly-day">
                                        <h3>{date}</h3>
                                        <div className="weekly-apps">
                                            {apps.slice(0, 5).map((app, index) => (
                                                <div key={index} className="weekly-app-item">
                                                    <span className="app-name">{app.app_name}</span>
                                                    <span className="app-time">{formatDuration(app.total_duration)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Applications Tab */}
                {activeTab === 'apps' && (
                    <div className="apps-tab">
                        <div className="card">
                            <h2 className="card-title">All Applications</h2>
                            <div className="apps-grid">
                                {applications.map((app, index) => {
                                    const slug = slugify(app.app_name)
                                    const iconUrl = `/assets/icons/${slug}.png`
                                    return (
                                        <div key={index} className="app-card">
                                            <div className="app-icon">
                                                <img src={iconUrl} alt={app.app_name} onError={(e) => { e.currentTarget.style.display = 'none' }} />
                                                <div className="app-initials">{getInitials(app.app_name)}</div>
                                            </div>
                                            <div className="app-info">
                                                <h3>{app.app_name}</h3>
                                                <p className="app-time">{formatDuration(app.total_time)}</p>
                                                {app.last_used && (
                                                    <p className="app-last-used">Last used: {format(parseISO(app.last_used), 'MMM dd, HH:mm')}</p>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="footer">
                <p>Time Tracker for Arch Linux + Hyprland | All data stored locally</p>
            </footer>
        </div>
    )
}

export default App
