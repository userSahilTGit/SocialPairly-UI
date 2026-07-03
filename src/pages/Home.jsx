import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

export default function Home() {
    const { user, refreshUser } = useAuth()
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            try {
                await refreshUser()
                const { data } = await api.get('/api/profile')
                setProfile(data.profile)
            } catch (e) {
                // ignore
            } finally {
                setLoading(false)
            }
        }
        load()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <>
            <Navbar />
            <div className="container">
                <div className="card">
                    <h2>Welcome, {user?.firstName} {user?.lastName} 👋🏼</h2>
                    <p style={{ color: '#6b7280' }}>{user?.email} • {user?.phoneNumber}</p>
                </div>

                {loading ? (
                    <div className="center">Loading...</div>
                ) : !user?.profileCompleted ? (
                    <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
                        <h2>Complete your profile</h2>
                        <p style={{ color: '#6b7280', marginBottom: 16 }}>
                            You haven't finished setting up your profile yet. Add your photo, about me,
                            education, interests and more so others can learn about you.
                        </p>
                        <Link to="/profile" className="btn">Complete Profile</Link>
                    </div>
                ) : (
                    <div className="card" style={{ borderLeft: '4px solid #16a34a' }}>
                        <h2>Your profile is complete ✅</h2>
                        <p style={{ color: '#6b7280', margin_bottom: 16 }}>
                            You can review or update your profile anytime.
                        </p>
                        <Link to="/profile" className="btn btn-secondary">Review Profile</Link>
                    </div>
                )} 

                {profile && profile.aboutMe && (
                    <div className="card">
                        <h3>About you</h3>
                        <p>{profile.aboutMe}</p>
                    </div>
                )}

                {user?.role === 'ADMIN' && (
                    <div className="card">
                        <h2>Admin tools</h2>
                        <div className="flex">
                            <Link to="/admin" className="btn">Open Dashboard</Link>
                            <Link to="/admin/questions" className="btn btn-secondary">Manage Questions</Link>
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}