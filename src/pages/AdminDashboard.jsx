import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import SiteFooter from '../components/SiteFooter'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { formatCallbackSchedule } from '../utils/callbackSlots'
import { canViewCallRequests } from '../utils/employeeAccess'
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, CartesianGrid,
} from 'recharts'
import './AdminDashboard.css'

const CHART_PURPLE = '#d946ef'
const CHART_PINK = '#ec4899'
const CHART_VIOLET = '#a855f7'
const CHART_RED = '#dc2626'

const PIE_COLORS = [CHART_PURPLE, CHART_PINK]
const ROLE_COLORS = [CHART_VIOLET, CHART_RED]

function formatJoinedDate(dateValue) {
    if (!dateValue) return '—'
    const date = new Date(dateValue)
    if (Number.isNaN(date.getTime())) return '—'
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}-${month}-${year}`
}

function getJoinedTimestamp(dateValue) {
    if (!dateValue) return 0
    const time = new Date(dateValue).getTime()
    return Number.isNaN(time) ? 0 : time
}

export default function AdminDashboard() {
    const { user } = useAuth()
    const { isDark } = useTheme()
    const canViewCallbacks = canViewCallRequests(user)
    const [stats, setStats] = useState(null)
    const [users, setUsers] = useState([])
    const [scheduledCallbacks, setScheduledCallbacks] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    // null = API order; 'desc' = newest first; 'asc' = oldest first
    const [dateSort, setDateSort] = useState(null)

    useEffect(() => {
        const load = async () => {
            try {
                const [statsRes, usersRes] = await Promise.all([
                    api.get('/admin/stats'),
                    api.get('/admin/users'),
                ])
                setStats(statsRes.data)
                setUsers(usersRes.data)
            } catch (e) {
                setError('Failed to load dashboard data')
            } finally {
                setLoading(false)
            }

            if (canViewCallbacks) {
                try {
                    const callbacksRes = await api.get('/admin/callback-alerts/callbacks')
                    setScheduledCallbacks(callbacksRes.data || [])
                } catch {
                    setScheduledCallbacks([])
                }
            } else {
                setScheduledCallbacks([])
            }
        }
        load()
    }, [canViewCallbacks])

    const sortedUsers = !dateSort
        ? users
        : [...users].sort((a, b) => {
            const diff = getJoinedTimestamp(a.createdAt) - getJoinedTimestamp(b.createdAt)
            return dateSort === 'asc' ? diff : -diff
        })

    const toggleDateSort = () => {
        setDateSort((prev) => {
            if (prev === null) return 'desc'
            if (prev === 'desc') return 'asc'
            return null
        })
    }

    const dateSortLabel = dateSort === 'desc'
        ? 'Newest first'
        : dateSort === 'asc'
            ? 'Oldest first'
            : 'Click to sort'

    const chartGrid = isDark ? '#1f293d' : '#e2e8f0'
    const chartTick = isDark ? '#94a3b8' : '#64748b'
    const tooltipStyle = isDark
        ? { background: '#111726', border: '1px solid #1f293d', color: '#f1f5f9' }
        : undefined

    if (loading) {
        return (
            <>
                <Navbar />
                <div className="admin-dashboard-page">
                    <div className="admin-dashboard-container">
                        <div className="dashboard-loading">Loading dashboard...</div>
                    </div>
                </div>
            </>
        )
    }

    if (error) {
        return (
            <>
                <Navbar />
                <div className="admin-dashboard-page">
                    <div className="admin-dashboard-container">
                        <div className="alert alert-error">{error}</div>
                    </div>
                </div>
            </>
        )
    }

    return (
        <>
            <Navbar />
            <div className="admin-dashboard-page">
                <div className="admin-dashboard-container">
                    <div className="admin-dashboard-header">
                        <div className="header-content">
                            <div className="breadcrumb-tag">Platform Overview</div>
                            <h1>Admin Dashboard</h1>
                            <p>Monitor user growth, profile completion, and subscription activity at a glance.</p>
                        </div>
                    </div>

                    {canViewCallbacks && scheduledCallbacks.length > 0 && (
                        <div className="dashboard-callbacks-card" aria-labelledby="dashboard-callbacks-heading">
                            <div className="dashboard-callbacks-head">
                                <div>
                                    <h2 id="dashboard-callbacks-heading">
                                        Scheduled Phone Callbacks ({scheduledCallbacks.length})
                                    </h2>
                                    <p>24/7 member-selected 2-hour callback windows across Super Admin, Admin &amp; Customer Support.</p>
                                </div>
                            </div>
                            <div className="dashboard-table-wrapper">
                                <table className="dashboard-table dashboard-callbacks-table">
                                    <thead>
                                        <tr>
                                            <th>Member</th>
                                            <th>Phone</th>
                                            <th>Selected Day</th>
                                            <th>2-Hour Time Slot</th>
                                            <th>Note</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {scheduledCallbacks.slice(0, 10).map((row) => {
                                            const schedule = formatCallbackSchedule(row)
                                            return (
                                                <tr key={row.id}>
                                                    <td>
                                                        <div className="dashboard-cb-member">{row.userName}</div>
                                                        <div className="dashboard-cb-email">{row.userEmail}</div>
                                                    </td>
                                                    <td>
                                                        <a href={`tel:${row.phoneNumber}`} className="dashboard-cb-phone">
                                                            {row.phoneNumber}
                                                        </a>
                                                    </td>
                                                    <td>{schedule.dayLine}</td>
                                                    <td>
                                                        <span className="dashboard-cb-slot-pill">{schedule.slotLine}</span>
                                                    </td>
                                                    <td>{row.note || '—'}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="stats-grid">
                        <StatCard value={stats.totalUsers} label="Total Users" icon="👥" iconClass="icon-purple" />
                        <StatCard value={stats.completedProfiles} label="Completed Profiles" icon="✓" iconClass="icon-green" />
                        <StatCard value={stats.incompleteProfiles} label="Incomplete Profiles" icon="○" iconClass="icon-pink" />
                        <StatCard value={stats.newUsersLast7Days ?? stats.newUsersLastDays} label="New (7 days)" icon="⚡" iconClass="icon-violet" />
                        {canViewCallbacks && (
                            <StatCard
                                value={scheduledCallbacks.length}
                                label="Pending Callbacks"
                                icon="☎"
                                iconClass="icon-violet"
                            />
                        )}
                    </div>

                    <div className="dashboard-charts-grid">
                        <div className="dashboard-chart-card">
                            <h3>Registrations (last 7 days)</h3>
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={stats.registrationsByDay}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                                    <XAxis dataKey="label" fontSize={12} tick={{ fill: chartTick }} />
                                    <YAxis allowDecimals={false} fontSize={12} tick={{ fill: chartTick }} />
                                    <Tooltip contentStyle={tooltipStyle} />
                                    <Bar dataKey="count" fill={CHART_PURPLE} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="dashboard-chart-card">
                            <h3>Profile Completion</h3>
                            <ResponsiveContainer width="100%" height={260}>
                                <PieChart>
                                    <Pie data={stats.profileCompletion} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={90} label>
                                        {stats.profileCompletion.map((entry, i) => (
                                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Legend />
                                    <Tooltip contentStyle={tooltipStyle} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="dashboard-chart-card">
                            <h3>Users by Role</h3>
                            <ResponsiveContainer width="100%" height={260}>
                                <PieChart>
                                    <Pie data={stats.usersByRole} dataKey="count" nameKey="label" cx="50%" cy="50%" innerRadius={50} outerRadius={90} label>
                                        {stats.usersByRole.map((entry, i) => (
                                            <Cell key={i} fill={ROLE_COLORS[i % ROLE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Legend />
                                    <Tooltip contentStyle={tooltipStyle} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="dashboard-chart-card">
                            <h3>Overview</h3>
                            <table className="dashboard-overview-table">
                                <tbody>
                                    <tr><td>Total questions</td><td>{stats.totalQuestions}</td></tr>
                                    <tr><td>Total admins</td><td>{stats.totalAdmins}</td></tr>
                                    <tr><td>Completed profiles</td><td>{stats.completedProfiles}</td></tr>
                                    <tr><td>Incomplete profiles</td><td>{stats.incompleteProfiles}</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {stats.answerDistribution && Object.keys(stats.answerDistribution).length > 0 && (
                        <>
                            <h2 className="dashboard-section-title">Question Answer Distribution</h2>
                            <div className="dashboard-charts-grid">
                                {Object.entries(stats.answerDistribution).map(([question, dist]) => (
                                    <div className="dashboard-chart-card" key={question}>
                                        <h3>{question}</h3>
                                        <ResponsiveContainer width="100%" height={220}>
                                            <BarChart data={dist}>
                                                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                                                <XAxis dataKey="label" fontSize={11} tick={{ fill: chartTick }} />
                                                <YAxis allowDecimals={false} fontSize={12} tick={{ fill: chartTick }} />
                                                <Tooltip contentStyle={tooltipStyle} />
                                                <Bar dataKey="count" fill={CHART_VIOLET} radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    <div className="dashboard-users-card">
                        <h2>All Users ({users.length})</h2>
                        <div className="dashboard-table-wrapper">
                            <table className="dashboard-table dashboard-users-table">
                                <thead>
                                    <tr>
                                        <th className="col-id">ID</th>
                                        <th className="col-name">Name</th>
                                        <th className="col-email">Email</th>
                                        <th className="col-phone">Phone</th>
                                        <th className="col-role">Role</th>
                                        <th className="col-profile">Profile</th>
                                        <th className="col-subscription">Subscription</th>
                                        <th className="col-joined">
                                            <button
                                                type="button"
                                                className={`dashboard-sort-btn${dateSort ? ' is-active' : ''}`}
                                                onClick={toggleDateSort}
                                                title={dateSortLabel}
                                                aria-label={`Sort by date joined. ${dateSortLabel}`}
                                            >
                                                Date Joined
                                                <span className="dashboard-sort-indicator" aria-hidden="true">
                                                    {dateSort === 'desc' ? '↓' : dateSort === 'asc' ? '↑' : '↕'}
                                                </span>
                                            </button>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedUsers.map((u) => {
                                        const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ')
                                        return (
                                        <tr key={u.id}>
                                            <td className="col-id">{u.id}</td>
                                            <td className="col-name" title={fullName}>{fullName}</td>
                                            <td className="col-email" title={u.email || ''}>{u.email}</td>
                                            <td className="col-phone" title={u.phoneNumber || ''}>{u.phoneNumber}</td>
                                            <td className="col-role">
                                                <span className={`dashboard-badge ${u.role === 'ADMIN' ? 'badge-admin' : 'badge-user'}`}>
                                                    {u.employeeRole || u.role}
                                                </span>
                                            </td>
                                            <td className="col-profile">
                                                <span className={`dashboard-badge ${u.profileCompleted ? 'badge-yes' : 'badge-no'}`}>
                                                    {u.profileCompleted ? 'Complete' : 'Incomplete'}
                                                </span>
                                            </td>
                                            <td className="col-subscription">
                                                <span className={`dashboard-badge ${u.subscriptionDetails === 'Subscribed' ? 'badge-yes' : 'badge-no'}`}>
                                                    {u.subscriptionDetails === 'Subscribed' ? 'Yes' : 'No'}
                                                </span>
                                            </td>
                                            <td className="col-joined">{formatJoinedDate(u.createdAt)}</td>
                                        </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        <SiteFooter />
        </>
    )
}

function StatCard({ value, label, icon, iconClass }) {
    return (
        <div className="stat-card">
            <div className={`stat-icon ${iconClass}`}>{icon}</div>
            <div className="stat-content">
                <div className="stat-label">{label}</div>
                <div className="stat-value">{value}</div>
            </div>
        </div>
    )
}
