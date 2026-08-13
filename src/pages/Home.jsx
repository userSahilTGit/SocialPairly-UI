import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import EventInvitationModal from '../components/EventInvitationModal'
import api from '../api/axios'
import { useCallback, useEffect, useState } from 'react'
import { Calendar, Gem, MapPin, ShieldAlert, Sparkles, UserSearch } from 'lucide-react'
import { useAuth, PHONE_VERIFY_DISMISS_KEY } from '../context/AuthContext'
import { userNeedsPhoneVerification, hasUsablePhoneNumber } from '../utils/verification'
import PhoneVerificationModal from '../components/PhoneVerificationModal'
import { profileScoreTone } from '../utils/profileScore'
import { readCompletionPercentage } from '../utils/profileCompletion'
import SiteFooter from '../components/SiteFooter'
import './UserHomeEvents.css'

function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
}

function formatDateTime(dateStr, timeStr) {
    if (!dateStr) return ''
    const time = timeStr ? String(timeStr).slice(0, 5) : ''
    return `${dateStr} at ${time}`
}

function statusLabel(rsvpStatus) {
    switch (rsvpStatus) {
        case 'pending': return 'ACTION REQUIRED • INVITATION RECEIVED'
        case 'accepted': return '✔ Invitation Accepted'
        case 'checked_in': return '✔ Checked In'
        case 'declined': return 'Declined'
        default: return rsvpStatus
    }
}

export default function Home() {
    const { user, refreshUser } = useAuth()
    const navigate = useNavigate()
    const [completion, setCompletion] = useState(null)
    const [loading, setLoading] = useState(true)
    const [phoneOpen, setPhoneOpen] = useState(false)
    const [events, setEvents] = useState([])
    const [inviteOpen, setInviteOpen] = useState(false)
    const [inviteEventId, setInviteEventId] = useState(null)
    const [invitation, setInvitation] = useState(null)
    const [inviteLoading, setInviteLoading] = useState(false)
    const [rsvpLoading, setRsvpLoading] = useState(false)

    const loadEvents = useCallback(async () => {
        try {
            const res = await api.get('/events/my')
            setEvents(res.data)
        } catch {
            setEvents([])
        }
    }, [])

    useEffect(() => {
        const load = async () => {
            try {
                const res = await api.get('/profile/completion')
                setCompletion({ percentage: readCompletionPercentage(res) })
            } catch {
                // ignore
            } finally {
                setLoading(false)
            }
        }
        load()
        loadEvents()
        refreshUser().catch(() => {})
    }, [loadEvents, refreshUser])

    const percentage = completion?.percentage ?? 0
    const scoreTone = profileScoreTone(percentage)
    const needsPhone = userNeedsPhoneVerification(user)
    const primaryEvent = events.find((e) => e.rsvpStatus === 'pending' || e.rsvpStatus === 'accepted') || events[0]
    const activeEvents = events.filter((e) => e.rsvpStatus !== 'declined')

    const openInvitation = async (eventId) => {
        setInviteEventId(eventId)
        setInviteOpen(true)
        setInviteLoading(true)
        setInvitation(null)
        try {
            const res = await api.get(`/events/${eventId}/invitation`)
            setInvitation(res.data)
        } catch {
            setInvitation(null)
        } finally {
            setInviteLoading(false)
        }
    }

    const handleRsvp = async (accept) => {
        if (!inviteEventId) return
        setRsvpLoading(true)
        try {
            await api.post(`/events/${inviteEventId}/rsvp`, { accept })
            setInviteOpen(false)
            await loadEvents()
            if (accept) {
                navigate(`/events/${inviteEventId}`)
            }
        } catch {
            // keep modal open
        } finally {
            setRsvpLoading(false)
        }
    }

    return (
        <>
            <Navbar />
            <div className="user-home-page">
                <div className="user-home-container">
                <div className="home-greeting-card home-hero-card">
                    <div className="home-hero-top">
                        <div className="home-hero-copy">
                            <p className="home-kicker"><Sparkles size={14} /> Your Socialpairly journey</p>
                            <h2 className="home-hero-title">{getGreeting()}, {user?.displayName || user?.firstName} 👋</h2>
                            <p className="home-hero-subtitle">
                                Welcome to SocialPairly — your space to build your profile, explore matched events, and connect.
                            </p>
                            {(user?.email || primaryEvent?.participantCode) && (
                                <p className="home-hero-meta">
                                    {user?.email}
                                    {primaryEvent?.participantCode && (
                                        <>
                                            {' • '}
                                            <span className="home-user-id">ID: {primaryEvent.participantCode}</span>
                                        </>
                                    )}
                                </p>
                            )}
                        </div>
                        <div className="home-token-balance">
                            <span className="home-token-label">Available Balance</span>
                            <span className="home-token-value">
                                <Gem size={18} /> {user?.userTokens ?? 0} Token{(user?.userTokens ?? 0) === 1 ? '' : 's'}
                            </span>
                        </div>
                    </div>
                </div>

                {needsPhone && (
                    <div className="home-phone-banner">
                        <div className="home-phone-banner-copy">
                            <div className="home-phone-icon">
                                <ShieldAlert size={20} />
                            </div>
                            <div>
                                <strong>{hasUsablePhoneNumber(user) ? 'Verify your mobile number' : 'Add a mobile number'}</strong>
                                <p>
                                    {hasUsablePhoneNumber(user)
                                        ? 'Your number is on file but not verified yet. A quick SMS keeps your account secure.'
                                        : 'Add and verify a mobile number for trusted matching and account recovery.'}
                                </p>
                            </div>
                        </div>
                        <div className="home-phone-banner-actions">
                            <button
                                type="button"
                                className="home-btn home-btn-primary"
                                onClick={() => {
                                    sessionStorage.removeItem(PHONE_VERIFY_DISMISS_KEY)
                                    setPhoneOpen(true)
                                }}
                            >
                                {hasUsablePhoneNumber(user) ? 'Verify now' : 'Add number'}
                            </button>
                            <Link to="/profile" className="home-btn home-btn-outline">Open profile</Link>
                        </div>
                    </div>
                )}

                {!loading && (
                    <div className={`profile-progress-card score-tone-${scoreTone}`}>
                        <div className="home-progress-header">
                            <span className="home-progress-label">Profile Completion</span>
                            <span className={`home-progress-value score-tone-${scoreTone}`}>{percentage}%</span>
                        </div>
                        <div className="home-progress-bar">
                            <div
                                className={`home-progress-fill score-fill score-tone-${scoreTone}`}
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                        {percentage < 100 && (
                            <div className="home-progress-actions">
                                <Link to="/profile" className="home-btn home-btn-primary">Complete Profile</Link>
                            </div>
                        )}
                    </div>
                )}

                {activeEvents.length > 0 && (
                    <div className="home-events-section">
                        <div className="home-events-head">
                            <h3>Your Assigned Events &amp; Matched Groups</h3>
                            <span className="home-events-active">{activeEvents.length} Event{activeEvents.length !== 1 ? 's' : ''} Active</span>
                        </div>

                        {activeEvents.map((ev) => (
                            <div key={ev.eventId} className="home-event-tile">
                                <div className="home-event-tile-main">
                                    <div className="home-event-badges">
                                        <span className={`home-event-status ${ev.rsvpStatus}`}>
                                            {statusLabel(ev.rsvpStatus)}
                                        </span>
                                    </div>
                                    <h4 className="home-event-title">{ev.title}</h4>
                                    <div className="home-event-meta">
                                        <span><Calendar size={14} /> {formatDateTime(ev.eventDate, ev.eventTime)}</span>
                                        <span><MapPin size={14} /> {ev.venueName}</span>
                                    </div>
                                </div>
                                {ev.rsvpStatus === 'pending' ? (
                                    <button
                                        type="button"
                                        className="home-event-action"
                                        onClick={() => openInvitation(ev.eventId)}
                                    >
                                        View Invitation Details
                                    </button>
                                ) : (ev.rsvpStatus === 'accepted' || ev.rsvpStatus === 'checked_in') ? (
                                    <button
                                        type="button"
                                        className="home-event-action"
                                        onClick={() => navigate(`/events/${ev.eventId}`)}
                                    >
                                        <UserSearch size={16} /> Enter Event &amp; Browse Profiles
                                    </button>
                                ) : null}
                            </div>
                        ))}
                    </div>
                )}

                {activeEvents.length === 0 && (
                    <div className="coming-soon-card">
                        <p className="coming-soon-text">No event invitations yet — check back after an admin assigns you to a group.</p>
                    </div>
                )}
                </div>
            </div>

            <EventInvitationModal
                open={inviteOpen}
                invitation={invitation}
                loading={inviteLoading || rsvpLoading}
                onAccept={() => handleRsvp(true)}
                onDecline={() => handleRsvp(false)}
                onClose={() => !rsvpLoading && setInviteOpen(false)}
            />

            <PhoneVerificationModal
                open={phoneOpen}
                onClose={() => setPhoneOpen(false)}
                onVerified={() => setPhoneOpen(false)}
            />
            <SiteFooter />
        </>
    )
}
