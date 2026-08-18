import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import SiteFooter from '../components/SiteFooter'
import api from '../api/axios'
import { useTheme } from '../context/ThemeContext'
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

export default function AdminDashboard() {
    const { isDark } = useTheme()
    const [stats, setStats] = useState(null)
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

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
        }
        load()
    }, [])

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
                        <Link to="/admin/plans" className="btn-dashboard-action">
                            Manage Subscription Plans
                        </Link>
                    </div>

                    <div className="stats-grid">
                        <StatCard value={stats.totalUsers} label="Total Users" icon="👥" iconClass="icon-purple" />
                        <StatCard value={stats.completedProfiles} label="Completed Profiles" icon="✓" iconClass="icon-green" />
                        <StatCard value={stats.incompleteProfiles} label="Incomplete Profiles" icon="○" iconClass="icon-pink" />
                        <StatCard value={stats.newUsersLast7Days} label="New (7 days)" icon="⚡" iconClass="icon-violet" />
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
                            <table className="dashboard-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Phone</th>
                                        <th>Role</th>
                                        <th>Profile</th>
                                        <th>Subscription</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((u) => (
                                        <tr key={u.id}>
                                            <td>{u.id}</td>
                                            <td>{u.firstName} {u.lastName}</td>
                                            <td>{u.email}</td>
                                            <td>{u.phoneNumber}</td>
                                            <td>
                                                <span className={`dashboard-badge ${u.role === 'ADMIN' ? 'badge-admin' : 'badge-user'}`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`dashboard-badge ${u.profileCompleted ? 'badge-yes' : 'badge-no'}`}>
                                                    {u.profileCompleted ? 'Complete' : 'Incomplete'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`dashboard-badge ${u.subscriptionDetails === 'Subscribed' ? 'badge-subscribed' : 'badge-unsubscribed'}`}>
                                                    {u.subscriptionDetails || 'Unsubscribed'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
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
