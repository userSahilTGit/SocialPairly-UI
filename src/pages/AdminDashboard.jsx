import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import api from '../api/axios'
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, CartesianGrid,
} from 'recharts'

const COLORS = ['#4f46e5', '#16a34a', '#f59e0b', '#dc2626', '#0ea5e9', '#8b5cf6']

export default function AdminDashboard() {
    const [stats, setStats] = useState(null)
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const load = async () => {
            try {
                const [statsRes, usersRes] = await Promise.all([
                    api.get('/api/admin/stats'),
                    api.get('/api/admin/users'),
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

    if (loading) {
        return (<><Navbar /><div className="center">Loading dashboard...</div></>)
    }

    if (error) {
        return (<><Navbar /><div className="container"><div className="error">{error}</div></div></>)
    }

    return (
        <>
            <Navbar />
            <div className="container">
                <h1 style={{ marginBottom: 20 }}>Admin Dashboard</h1>

                {/* Stat cards */}
                <div className="grid grid-4" style={{ marginBottom: 24 }}>
                    <StatCard value={stats.totalUsers} label="Total Users" />
                    <StatCard value={stats.completedProfiles} label="Completed Profiles" />
                    <StatCard value={stats.incompleteProfiles} label="Incomplete Profiles" />
                    <StatCard value={stats.newUsersLast7Days} label="New (7 days)" />
                </div>

                {/* Charts */}
                <div className="grid grid-2">
                    <div className="card">
                        <h3>Registrations (last 7 days)</h3>
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={stats.registrationsByDay}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="label" fontSize={12} />
                                <YAxis allowDecimals={false} fontSize={12} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="card">
                        <h3>Profile Completion</h3>
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie data={stats.profileCompletion} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={90} label>
                                    {stats.profileCompletion.map((entry, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Legend />
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="card">
                        <h3>Users by Role</h3>
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie data={stats.usersByRole} dataKey="count" nameKey="label" cx="50%" cy="50%" innerRadius={50} outerRadius={90} label>
                                    {stats.usersByRole.map((entry, i) => (
                                        <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Legend />
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="card">
                        <h3>Overview</h3>
                        <table>
                            <tbody>
                                <tr><td>Total questions</td><td><strong>{stats.totalQuestions}</strong></td></tr>
                                <tr><td>Total admins</td><td><strong>{stats.totalAdmins}</strong></td></tr>
                                <tr><td>Completed profiles</td><td><strong>{stats.completedProfiles}</strong></td></tr>
                                <tr><td>Incomplete profiles</td><td><strong>{stats.incompleteProfiles}</strong></td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Answer distribution */}
                {stats.answerDistribution && Object.keys(stats.answerDistribution).length > 0 && (
                    <>
                        <h2 style={{ margin: '24px 0 16px' }}>Question Answer Distribution</h2>
                        <div className="grid grid-2">
                            {Object.entries(stats.answerDistribution).map(([question, dist]) => (
                                <div className="card" key={question}>
                                    <h3>{question}</h3>
                                    <ResponsiveContainer width="100%" height={220}>
                                        <BarChart data={dist}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="label" fontSize={11} />
                                            <YAxis allowDecimals={false} fontSize={12} />
                                            <Tooltip />
                                            <Bar dataKey="count" fill="#16a34a" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Users table */}
                <div className="card spacer">
                    <h2>All Users ({users.length})</h2>
                    <div style={{ overflowX: 'auto' }}>
                        <table>
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
                                            <span className={`badge ${u.role === 'ADMIN' ? 'badge-admin' : 'badge-user'}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${u.profileCompleted ? 'badge-yes' : 'badge-no'}`}>
                                                {u.profileCompleted ? 'Complete' : 'Incomplete'}
                                            </span>
                                        </td>
                                        <td style={{ color: '#6b7280' }}>
                                            {u.subscriptionDetails || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    )
}

function StatCard({ value, label }) {
    return (
        <div className="stat-card">
            <div className="value">{value}</div>
            <div className="label">{label}</div>
        </div>
    )
}