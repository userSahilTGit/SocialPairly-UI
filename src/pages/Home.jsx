import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import api from '../api/axios'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
}

export default function Home() {
    const { user } = useAuth()
    const [completion, setCompletion] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            try {
                const response = await api.get('/api/profile/completion')
                setCompletion(response.data)
            } catch {
                // ignore
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const percentage = completion?.percentage ?? 0

    return (
        <>
            <Navbar />
            <div className="container">
                <div className="card home-greeting-card">
                    <h2>{getGreeting()}, {user?.firstName} {user?.lastName} 👋</h2>
                    <p style={{ color: '#6b7280', marginTop: 6 }}>
                        Welcome to SocialPairly - your space to build your profile, explore features, and stay connected.
                    </p>
                    {(user?.email || user?.phoneNumber) && (
                        <p style={{ color: '#9ca3af', fontSize: 13, marginTop: 4 }}>
                            {user.email}{user.email && user.phoneNumber ? ' • ' : ''}{user.phoneNumber}
                        </p>
                    )}
                </div>

                {!loading && (
                    <div className="card profile-progress-card">
                        <div className="flex-between" style={{ marginBottom: 8 }}>
                            <span style={{ fontWeight: 600, fontSize: 14 }}>Profile Completion</span>
                            <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{percentage}%</span>
                        </div>
                        <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${percentage}%` }} />
                        </div>
                        {percentage < 100 && (
                            <div style={{ marginTop: 16 }}>
                                <Link to="/profile" className="btn">Complete Profile</Link>
                            </div>
                        )}
                    </div>
                )}

                <div className="card coming-soon-card">
                    <p className="coming-soon-text">Coming soon....</p>
                </div>
            </div>
        </>
    )
}