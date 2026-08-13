import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import SiteFooter from '../components/SiteFooter'
import api from '../api/axios'
import { getMediaUrl } from '../utils/mediaUrl'
import {
    ChevronLeft,
    ChevronRight,
    Clock,
    MapPin,
    Users,
} from 'lucide-react'
import './EventWorkspace.css'

const REACTIONS = [
    { type: 'Wave', emoji: '👋', cost: 1 },
    { type: 'Spark', emoji: '⭐', cost: 2 },
    { type: 'Heart', emoji: '❤️', cost: 3 },
    { type: 'Coffee', emoji: '☕', cost: 4 },
    { type: 'Priority', emoji: '💎', cost: 5 },
]

function buildTags(profile) {
    const tags = []
    if (profile.educationLevel) tags.push(profile.educationLevel)
    if (profile.occupation) tags.push(profile.occupation)
    if (profile.maritalStatus) tags.push(profile.maritalStatus)
    if (profile.hasChildren) tags.push(profile.hasChildren === 'No' ? 'No Children' : profile.hasChildren)
    return tags
}

export default function EventWorkspace() {
    const { eventId } = useParams()
    const navigate = useNavigate()
    const [workspace, setWorkspace] = useState(null)
    const [profiles, setProfiles] = useState([])
    const [profileIndex, setProfileIndex] = useState(0)
    const [photoIndex, setPhotoIndex] = useState(0)
    const [tokenBalance, setTokenBalance] = useState(0)
    const [loading, setLoading] = useState(true)
    const [reacting, setReacting] = useState(false)
    const [message, setMessage] = useState('')

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const [wsRes, profilesRes] = await Promise.all([
                api.get(`/events/${eventId}/workspace`),
                api.get(`/events/${eventId}/profiles`),
            ])
            setWorkspace(wsRes.data)
            setProfiles(profilesRes.data)
            setTokenBalance(wsRes.data.tokenBalance ?? 0)
        } catch (err) {
            if (err.response?.status === 400 || err.response?.status === 403) {
                navigate('/')
            }
        } finally {
            setLoading(false)
        }
    }, [eventId, navigate])

    useEffect(() => {
        load()
    }, [load])

    useEffect(() => {
        setPhotoIndex(0)
    }, [profileIndex])

    const profile = profiles[profileIndex]

    const handleReaction = async (reactionType) => {
        if (!profile || reacting) return
        if (profile.sentReactions?.includes(reactionType)) {
            setMessage(`You already sent ${reactionType} to this profile`)
            return
        }
        setReacting(true)
        setMessage('')
        try {
            const res = await api.post(`/events/${eventId}/reactions`, {
                toUserId: profile.userId,
                reactionType,
            })
            setTokenBalance(res.data.tokenBalance ?? tokenBalance)
            setProfiles((prev) => prev.map((p, i) => (
                i === profileIndex
                    ? { ...p, sentReactions: [...(p.sentReactions || []), reactionType] }
                    : p
            )))
            setMessage(`${reactionType} sent!`)
        } catch (err) {
            setMessage(err.response?.data?.message || 'Failed to send reaction')
        } finally {
            setReacting(false)
        }
    }

    if (loading) {
        return (
            <>
                <Navbar />
                <div className="event-workspace-page"><div className="event-workspace-loading">Loading event...</div></div>
            </>
        )
    }

    if (!workspace) {
        return (
            <>
                <Navbar />
                <div className="event-workspace-page"><div className="event-workspace-loading">Event not available</div></div>
            </>
        )
    }

    const eventPerks = workspace.eventPerks || []
    const photos = profile?.mediaUrls?.length ? profile.mediaUrls : []
    const tags = profile ? buildTags(profile) : []

    return (
        <>
            <Navbar />
            <div className="event-workspace-page">
                <div className="container event-workspace-container">
                    <div className="event-workspace-banner">
                        <div>
                            <span className="event-workspace-kicker">YOUR ASSIGNED EVENT</span>
                            <h1>{workspace.title}</h1>
                            <div className="event-workspace-banner-meta">
                                <span><Clock size={14} /> {workspace.eventDate} • {String(workspace.eventTime).slice(0, 5)}</span>
                                <span><MapPin size={14} /> {workspace.venueName}</span>
                                {eventPerks.map((perk) => (
                                    <span key={perk}><Users size={14} /> {perk}</span>
                                ))}
                            </div>
                        </div>
                        <div className="event-workspace-tokens">
                            <div className="event-workspace-token-box">
                                <span className="token-label">YOUR TOKENS</span>
                                <span className="token-value">{tokenBalance}</span>
                                <span className="token-dot" />
                            </div>
                            <button
                                type="button"
                                className="token-get-more"
                                onClick={() => navigate('/subscriptions')}
                            >
                                Get More
                            </button>
                        </div>
                    </div>

                    {profiles.length === 0 ? (
                        <div className="event-workspace-empty card">No other accepted participants yet.</div>
                    ) : (
                        <>
                            <div className="event-workspace-browse-head">
                                <span>BROWSE GROUP MEMBER PROFILES</span>
                                <span>Showing Profile {profileIndex + 1} of {profiles.length}</span>
                            </div>

                            <div className="event-profile-card card">
                                <div className="event-profile-layout">
                                    <div className="event-profile-gallery">
                                        <button
                                            type="button"
                                            className="gallery-nav left"
                                            disabled={photos.length <= 1}
                                            onClick={() => setPhotoIndex((i) => (i - 1 + photos.length) % photos.length)}
                                        >
                                            <ChevronLeft size={20} />
                                        </button>
                                        <div className="gallery-main">
                                            {photos.length > 0 ? (
                                                <img src={getMediaUrl(photos[photoIndex])} alt="" />
                                            ) : (
                                                <div className="gallery-placeholder">No photo</div>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            className="gallery-nav right"
                                            disabled={photos.length <= 1}
                                            onClick={() => setPhotoIndex((i) => (i + 1) % photos.length)}
                                        >
                                            <ChevronRight size={20} />
                                        </button>
                                        {photos.length > 1 && (
                                            <div className="gallery-thumbs">
                                                {photos.slice(0, 4).map((url, idx) => (
                                                    <button
                                                        key={url}
                                                        type="button"
                                                        className={`gallery-thumb ${idx === photoIndex ? 'active' : ''}`}
                                                        onClick={() => setPhotoIndex(idx)}
                                                    >
                                                        <img src={getMediaUrl(url)} alt="" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="event-profile-info">
                                        <div className="event-profile-id-row">
                                            <span className="event-profile-code">{profile.displayName || profile.participantCode}</span>
                                            {profile.verified && <span className="event-verified-badge">✔ Verified</span>}
                                        </div>
                                        <p className="event-profile-stats">
                                            {profile.age ? `${profile.age} yrs` : '—'}
                                            {profile.locationLabel ? ` • ${profile.locationLabel}` : ''}
                                        </p>
                                        <div className="event-profile-tags">
                                            {tags.map((tag) => (
                                                <span key={tag} className="event-profile-tag">{tag}</span>
                                            ))}
                                        </div>
                                        {profile.aboutMe && (
                                            <div className="event-profile-section">
                                                <h4>ABOUT</h4>
                                                <p>{profile.aboutMe}</p>
                                            </div>
                                        )}
                                        {profile.interests?.length > 0 && (
                                            <div className="event-profile-section">
                                                <h4>INTERESTS</h4>
                                                <div className="event-profile-tags">
                                                    {[...profile.interests].map((tag) => (
                                                        <span key={tag} className="event-profile-tag">{tag}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {profile.relationshipGoals && (
                                            <div className="event-profile-section">
                                                <h4>LOOKING FOR</h4>
                                                <p className="looking-for">{profile.relationshipGoals}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="event-reactions-section">
                                    <h4>SEND TOKEN REACTION TO PROFILE</h4>
                                    {message && <p className="event-reaction-msg">{message}</p>}
                                    <div className="event-reactions-grid">
                                        {REACTIONS.map((r) => {
                                            const sent = profile.sentReactions?.includes(r.type)
                                            const insufficient = !sent && tokenBalance < r.cost
                                            return (
                                                <button
                                                    key={r.type}
                                                    type="button"
                                                    className={`event-reaction-btn ${sent ? 'sent' : ''}`}
                                                    disabled={reacting || sent || insufficient}
                                                    onClick={() => handleReaction(r.type)}
                                                    title={insufficient ? `Need ${r.cost} tokens (you have ${tokenBalance})` : undefined}
                                                >
                                                    <span className="reaction-emoji">{r.emoji}</span>
                                                    <strong>{r.type}</strong>
                                                    <span className="reaction-cost">{r.cost} Token{r.cost > 1 ? 's' : ''}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div className="event-profile-nav-bar">
                                    <button
                                        type="button"
                                        disabled={profileIndex <= 0}
                                        onClick={() => setProfileIndex((i) => i - 1)}
                                    >
                                        <ChevronLeft size={18} /> Previous
                                    </button>
                                    <button
                                        type="button"
                                        disabled={profileIndex >= profiles.length - 1}
                                        onClick={() => setProfileIndex((i) => i + 1)}
                                    >
                                        Next <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    <button type="button" className="event-back-home" onClick={() => navigate('/')}>
                        ← Back to Home
                    </button>
                </div>
            </div>
        <SiteFooter />
        </>
    )
}
