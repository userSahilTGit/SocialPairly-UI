import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import api from '../api/axios'
import { useEffect, useState } from 'react'
import { ShieldAlert, Sparkles } from 'lucide-react'
import { useAuth, PHONE_VERIFY_DISMISS_KEY } from '../context/AuthContext'
import { userNeedsPhoneVerification, hasUsablePhoneNumber } from '../utils/verification'
import PhoneVerificationModal from '../components/PhoneVerificationModal'

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
    const [phoneOpen, setPhoneOpen] = useState(false)

    useEffect(() => {
        const load = async () => {
            try {
                const data = await api.get('/profile/completion')
                setCompletion(data)
            } catch {
                // ignore
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const percentage = completion?.percentage ?? 0
    const needsPhone = userNeedsPhoneVerification(user)

    return (
        <>
            <Navbar />
            <div className="container home-page">
                <div className="card home-greeting-card home-hero-card">
                    <p className="home-kicker"><Sparkles size={14} /> Your Socialpairly journey</p>
                    <h2>{getGreeting()}, {user?.displayName || user?.firstName}</h2>
                    <p style={{ color: '#6b7280', marginTop: 6 }}>
                        Build your profile, meet genuinely, and stay connected through curated events.
                    </p>
                    {(user?.email || user?.phoneNumber) && (
                        <p style={{ color: '#9ca3af', fontSize: 13, marginTop: 4 }}>
                            {user.email}
                            {user.email && hasUsablePhoneNumber(user) ? ' • ' : ''}
                            {hasUsablePhoneNumber(user) ? user.phoneNumber : ''}
                            {hasUsablePhoneNumber(user) && (
                                <span className={`phone-inline-badge ${user.phoneVerified ? 'ok' : 'warn'}`}>
                                    {user.phoneVerified ? 'Verified' : 'Unverified'}
                                </span>
                            )}
                        </p>
                    )}
                </div>

                {needsPhone && (
                    <div className="card phone-home-banner">
                        <div className="phone-home-banner-copy">
                            <ShieldAlert size={22} />
                            <div>
                                <strong>{hasUsablePhoneNumber(user) ? 'Verify your mobile number' : 'Add a mobile number'}</strong>
                                <p>
                                    {hasUsablePhoneNumber(user)
                                        ? 'Your number is on file but not verified yet. A quick SMS keeps your account secure.'
                                        : 'Add and verify a mobile number for trusted matching and account recovery.'}
                                </p>
                            </div>
                        </div>
                        <div className="phone-home-banner-actions">
                            <button
                                type="button"
                                className="btn auth-primary-btn"
                                onClick={() => {
                                    sessionStorage.removeItem(PHONE_VERIFY_DISMISS_KEY)
                                    setPhoneOpen(true)
                                }}
                            >
                                {hasUsablePhoneNumber(user) ? 'Verify now' : 'Add number'}
                            </button>
                            <Link to="/profile" className="btn btn-secondary">Open profile</Link>
                        </div>
                    </div>
                )}

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

            <PhoneVerificationModal
                open={phoneOpen}
                onClose={() => setPhoneOpen(false)}
                onVerified={() => setPhoneOpen(false)}
            />
        </>
    )
}
